import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile, spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { promisify } from 'node:util';
import type { EnvConfig } from '../../config/env.validation';
import type { YtdlpFormat, YtdlpInfo } from './media-extract.types';
import { isValidFormatId, sanitizeFilename } from './media-extract.utils';

const execFileAsync = promisify(execFile);
const YTDLP_INFO_TIMEOUT_MS = 30_000;
const YTDLP_INFO_MAX_BUFFER = 10 * 1024 * 1024;
const YTDLP_HELP_TIMEOUT_MS = 5_000;
const YTDLP_HELP_MAX_BUFFER = 2 * 1024 * 1024;
const YTDLP_COOKIES_MAX_BYTES = 2 * 1024 * 1024;
const FFMPEG_CHECK_TIMEOUT_MS = 5_000;

interface CookiesSession {
  args: string[];
  cleanup: () => Promise<void>;
}

const NOOP_COOKIES_SESSION: CookiesSession = {
  args: [],
  cleanup: async () => undefined,
};

const AUDIO_EXTENSION_PRIORITY: Record<string, number> = {
  m4a: 3,
  mp3: 3,
  aac: 2,
  ogg: 2,
  opus: 1,
  webm: 1,
};

export function pickBestFormat(info: YtdlpInfo): YtdlpFormat | null {
  const formats = info.formats ?? [];
  const candidates = formats.filter(
    (format) =>
      format.vcodec &&
      format.vcodec !== 'none' &&
      format.acodec &&
      format.acodec !== 'none',
  );

  if (candidates.length === 0) {
    return formats.find((format) => format.format_id === 'best') ?? formats[0] ?? null;
  }

  return candidates.reduce((best, current) => {
    const bestHeight = best.height ?? 0;
    const currentHeight = current.height ?? 0;
    const bestSize = best.filesize ?? best.filesize_approx ?? 0;
    const currentSize = current.filesize ?? current.filesize_approx ?? 0;
    const bestScore = bestHeight * 10_000 + bestSize;
    const currentScore = currentHeight * 10_000 + currentSize;
    return currentScore > bestScore ? current : best;
  });
}

export function pickBestAudioFormat(info: YtdlpInfo): YtdlpFormat | null {
  const formats = info.formats ?? [];
  const audioOnly = formats.filter(
    (format) =>
      Boolean(format.acodec && format.acodec !== 'none') &&
      (!format.vcodec || format.vcodec === 'none'),
  );

  if (audioOnly.length === 0) {
    return null;
  }

  return audioOnly.reduce((best, current) => {
    const bestPriority = AUDIO_EXTENSION_PRIORITY[(best.ext ?? '').toLowerCase()] ?? 0;
    const currentPriority = AUDIO_EXTENSION_PRIORITY[(current.ext ?? '').toLowerCase()] ?? 0;
    const bestBitrate = best.abr ?? best.tbr ?? 0;
    const currentBitrate = current.abr ?? current.tbr ?? 0;
    const bestSize = best.filesize ?? best.filesize_approx ?? 0;
    const currentSize = current.filesize ?? current.filesize_approx ?? 0;

    // Prefere formatos amplamente compatíveis (m4a/mp3) e maior bitrate de áudio.
    const bestScore = bestPriority * 1_000_000 + bestBitrate * 1_000 + Math.min(bestSize, 999);
    const currentScore =
      currentPriority * 1_000_000 + currentBitrate * 1_000 + Math.min(currentSize, 999);
    return currentScore > bestScore ? current : best;
  });
}

export function guessAudioContentType(extension: string): string {
  switch (extension.toLowerCase().replace(/^\./, '')) {
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
    case 'mp4':
      return 'audio/mp4';
    case 'webm':
      return 'audio/webm';
    case 'ogg':
    case 'opus':
      return 'audio/ogg';
    case 'wav':
      return 'audio/wav';
    default:
      return 'application/octet-stream';
  }
}

export function buildYtdlpFilename(title: string, ext: string): string {
  return sanitizeFilename(title, ext);
}

@Injectable()
export class YtdlpService {
  private readonly logger = new Logger(YtdlpService.name);
  private ffmpegAvailabilityPromise: Promise<boolean> | null = null;
  private jsRuntimeSupportPromise: Promise<boolean> | null = null;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  private get binaryPath(): string {
    return this.configService.get('YTDLP_BINARY_PATH', { infer: true });
  }

  private get cookiesPath(): string | undefined {
    return this.configService.get('YTDLP_COOKIES_PATH', { infer: true });
  }

  private get ffmpegBinaryPath(): string {
    return this.configService.get('FFMPEG_BINARY_PATH', { infer: true });
  }

  async isFfmpegAvailable(): Promise<boolean> {
    if (!this.ffmpegAvailabilityPromise) {
      this.ffmpegAvailabilityPromise = execFileAsync(this.ffmpegBinaryPath, ['-version'], {
        timeout: FFMPEG_CHECK_TIMEOUT_MS,
        windowsHide: true,
      })
        .then(() => true)
        .catch(() => false);
    }

    return this.ffmpegAvailabilityPromise;
  }

  private async supportsJsRuntimes(): Promise<boolean> {
    if (!this.jsRuntimeSupportPromise) {
      this.jsRuntimeSupportPromise = execFileAsync(this.binaryPath, ['--help'], {
        timeout: YTDLP_HELP_TIMEOUT_MS,
        maxBuffer: YTDLP_HELP_MAX_BUFFER,
        windowsHide: true,
      })
        .then(({ stdout }) => stdout.includes('--js-runtimes'))
        .catch(() => false);
    }

    return this.jsRuntimeSupportPromise;
  }

  private async buildJsRuntimeArgs(): Promise<string[]> {
    // yt-dlp 2025.11+ desabilita Node por padrão; usa o binário Node já presente no runtime.
    if (await this.supportsJsRuntimes()) {
      return ['--js-runtimes', `node:${process.execPath}`];
    }
    return [];
  }

  private async prepareCookiesSession(): Promise<CookiesSession> {
    const sourcePath = this.cookiesPath;
    if (!sourcePath) {
      return NOOP_COOKIES_SESSION;
    }

    let rawContent: Buffer;
    try {
      const fileStats = await stat(sourcePath);
      if (!fileStats.isFile()) {
        this.logger.warn(
          'YTDLP_COOKIES_PATH não aponta para um arquivo regular; executando yt-dlp sem cookies.',
        );
        return NOOP_COOKIES_SESSION;
      }
      if (fileStats.size > YTDLP_COOKIES_MAX_BYTES) {
        this.logger.warn(
          'Arquivo configurado em YTDLP_COOKIES_PATH excede o limite de 2 MB; executando yt-dlp sem cookies.',
        );
        return NOOP_COOKIES_SESSION;
      }

      rawContent = await readFile(sourcePath);
      if (rawContent.toString('utf8').trim().length === 0) {
        this.logger.warn(
          'Arquivo configurado em YTDLP_COOKIES_PATH está vazio; executando yt-dlp sem cookies.',
        );
        return NOOP_COOKIES_SESSION;
      }
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : 'ERR';
      this.logger.warn(
        `Não foi possível ler YTDLP_COOKIES_PATH (${code}); executando yt-dlp sem cookies.`,
      );
      return NOOP_COOKIES_SESSION;
    }

    // Copia para diretório temporário isolado (0600): evita erro em volume :ro e corrida entre requisições simultâneas.
    let tempDir: string | undefined;
    try {
      tempDir = await mkdtemp(join(tmpdir(), 'toolbox-ytdlp-'));
      const tempCookiesFile = join(tempDir, 'cookies.txt');
      await writeFile(tempCookiesFile, rawContent, { mode: 0o600 });

      let cleaned = false;
      const dirToRemove = tempDir;
      return {
        args: ['--cookies', tempCookiesFile],
        cleanup: async () => {
          if (cleaned) {
            return;
          }
          cleaned = true;
          await rm(dirToRemove, { recursive: true, force: true }).catch(() => undefined);
        },
      };
    } catch {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
      }
      this.logger.warn(
        'Não foi possível preparar cópia temporária de cookies; executando yt-dlp sem cookies.',
      );
      return NOOP_COOKIES_SESSION;
    }
  }

  async getInfo(url: string): Promise<YtdlpInfo> {
    const [jsRuntimeArgs, cookies] = await Promise.all([
      this.buildJsRuntimeArgs(),
      this.prepareCookiesSession(),
    ]);

    const args = [
      ...jsRuntimeArgs,
      ...cookies.args,
      '--dump-single-json',
      '--no-playlist',
      '--no-warnings',
      '--skip-download',
      '--',
      url,
    ];

    try {
      const { stdout } = await execFileAsync(this.binaryPath, args, {
        timeout: YTDLP_INFO_TIMEOUT_MS,
        maxBuffer: YTDLP_INFO_MAX_BUFFER,
        windowsHide: true,
      });

      return JSON.parse(stdout) as YtdlpInfo;
    } finally {
      await cookies.cleanup();
    }
  }

  async createDownloadStream(
    url: string,
    formatId?: string,
  ): Promise<{ stream: Readable; abort: () => void }> {
    const resolvedFormat = formatId && formatId.trim().length > 0 ? formatId.trim() : 'best';
    if (!isValidFormatId(resolvedFormat)) {
      throw new BadRequestException('Formato de mídia inválido.');
    }

    const [jsRuntimeArgs, cookies] = await Promise.all([
      this.buildJsRuntimeArgs(),
      this.prepareCookiesSession(),
    ]);

    const args = [
      ...jsRuntimeArgs,
      ...cookies.args,
      '--output',
      '-',
      '--quiet',
      '--no-playlist',
      '--no-part',
      '--no-mtime',
      '--format',
      resolvedFormat,
      '--',
      url,
    ];

    let subprocess: ReturnType<typeof spawn>;
    try {
      subprocess = spawn(this.binaryPath, args, {
        shell: false,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      await cookies.cleanup();
      throw error;
    }

    if (!subprocess.stdout) {
      subprocess.kill('SIGTERM');
      await cookies.cleanup();
      throw new Error('yt-dlp não retornou stream de saída.');
    }

    const cleanupCookies = () => {
      void cookies.cleanup();
    };

    subprocess.once('close', cleanupCookies);

    subprocess.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim();
      if (text) {
        this.logger.debug(text.slice(0, 500));
      }
    });

    subprocess.on('error', (error) => {
      cleanupCookies();
      this.logger.warn(`Erro no processo yt-dlp: ${error.message}`);
      if (!subprocess.stdout?.destroyed) {
        subprocess.stdout?.destroy(error);
      }
    });

    return {
      stream: subprocess.stdout,
      abort: () => {
        if (!subprocess.killed && subprocess.exitCode === null) {
          subprocess.kill('SIGTERM');
        } else {
          cleanupCookies();
        }
      },
    };
  }

  transcodeStreamToMp3(
    sourceStream: Readable,
    abortSource: () => void,
  ): { stream: Readable; abort: () => void } {
    const ffmpeg = spawn(
      this.ffmpegBinaryPath,
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        'pipe:0',
        '-vn',
        '-c:a',
        'libmp3lame',
        '-q:a',
        '2',
        '-f',
        'mp3',
        'pipe:1',
      ],
      {
        shell: false,
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      },
    );

    if (!ffmpeg.stdin || !ffmpeg.stdout) {
      ffmpeg.kill('SIGTERM');
      abortSource();
      throw new Error('ffmpeg não retornou stream de saída.');
    }

    const cleanup = () => {
      abortSource();
      if (!ffmpeg.killed && ffmpeg.exitCode === null) {
        ffmpeg.kill('SIGTERM');
      }
    };

    ffmpeg.stdin.on('error', () => {
      // Ignora EPIPE quando o cliente ou o ffmpeg encerram o stream antecipadamente.
    });

    ffmpeg.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim();
      if (text) {
        this.logger.debug(`ffmpeg: ${text.slice(0, 500)}`);
      }
    });

    sourceStream.on('error', (error) => {
      if (!ffmpeg.stdout.destroyed) {
        ffmpeg.stdout.destroy(error);
      }
      cleanup();
    });

    ffmpeg.on('error', (error) => {
      this.logger.warn(`Erro no processo ffmpeg: ${error.message}`);
      if (!ffmpeg.stdout.destroyed) {
        ffmpeg.stdout.destroy(error);
      }
      abortSource();
    });

    sourceStream.pipe(ffmpeg.stdin);

    return {
      stream: ffmpeg.stdout,
      abort: cleanup,
    };
  }

  async createAudioMp3Stream(
    url: string,
    formatId?: string,
  ): Promise<{ stream: Readable; abort: () => void }> {
    const source = await this.createDownloadStream(url, formatId ?? 'bestaudio/best');
    return this.transcodeStreamToMp3(source.stream, source.abort);
  }
}
