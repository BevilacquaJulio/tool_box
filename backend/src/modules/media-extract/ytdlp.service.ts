import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile, spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
import { promisify } from 'node:util';
import type { EnvConfig } from '../../config/env.validation';
import type { YtdlpFormat, YtdlpInfo } from './media-extract.types';
import { isValidFormatId, sanitizeFilename } from './media-extract.utils';

const execFileAsync = promisify(execFile);
const YTDLP_INFO_TIMEOUT_MS = 30_000;
const YTDLP_INFO_MAX_BUFFER = 10 * 1024 * 1024;
const FFMPEG_CHECK_TIMEOUT_MS = 5_000;

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

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  private get binaryPath(): string {
    return this.configService.get('YTDLP_BINARY_PATH', { infer: true });
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

  async getInfo(url: string): Promise<YtdlpInfo> {
    const args = ['--dump-single-json', '--no-playlist', '--no-warnings', '--skip-download', '--', url];

    const { stdout } = await execFileAsync(this.binaryPath, args, {
      timeout: YTDLP_INFO_TIMEOUT_MS,
      maxBuffer: YTDLP_INFO_MAX_BUFFER,
      windowsHide: true,
    });

    return JSON.parse(stdout) as YtdlpInfo;
  }

  createDownloadStream(
    url: string,
    formatId?: string,
  ): { stream: Readable; abort: () => void } {
    const resolvedFormat = formatId && formatId.trim().length > 0 ? formatId.trim() : 'best';
    if (!isValidFormatId(resolvedFormat)) {
      throw new BadRequestException('Formato de mídia inválido.');
    }

    const args = [
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

    const subprocess = spawn(this.binaryPath, args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!subprocess.stdout) {
      subprocess.kill('SIGTERM');
      throw new Error('yt-dlp não retornou stream de saída.');
    }

    subprocess.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf8').trim();
      if (text) {
        this.logger.debug(text.slice(0, 500));
      }
    });

    subprocess.on('error', (error) => {
      this.logger.warn(`Erro no processo yt-dlp: ${error.message}`);
      if (!subprocess.stdout.destroyed) {
        subprocess.stdout.destroy(error);
      }
    });

    return {
      stream: subprocess.stdout,
      abort: () => {
        if (!subprocess.killed && subprocess.exitCode === null) {
          subprocess.kill('SIGTERM');
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

  createAudioMp3Stream(
    url: string,
    formatId?: string,
  ): { stream: Readable; abort: () => void } {
    const source = this.createDownloadStream(url, formatId ?? 'bestaudio/best');
    return this.transcodeStreamToMp3(source.stream, source.abort);
  }
}
