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

export function buildYtdlpFilename(title: string, ext: string): string {
  return sanitizeFilename(title, ext);
}

@Injectable()
export class YtdlpService {
  private readonly logger = new Logger(YtdlpService.name);

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  private get binaryPath(): string {
    return this.configService.get('YTDLP_BINARY_PATH', { infer: true });
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
}
