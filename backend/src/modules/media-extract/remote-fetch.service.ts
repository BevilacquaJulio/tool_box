import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable, Transform } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import type { EnvConfig } from '../../config/env.validation';
import type { RemoteProbeResult } from './media-extract.types';
import { assertPublicHost, normalizeHttpUrl } from './media-extract.utils';

const USER_AGENT = 'ToolboxLabsMediaExtract/1.0';
const REQUEST_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_REDIRECTS = 5;

@Injectable()
export class RemoteFetchService {
  private readonly logger = new Logger(RemoteFetchService.name);

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {}

  private get maxBytes(): number {
    return this.configService.get('MEDIA_MAX_DOWNLOAD_BYTES', { infer: true });
  }

  private async fetchWithRedirects(
    rawUrl: string,
    method: 'HEAD' | 'GET',
    options?: { redirectCount?: number; timeoutMs?: number; externalSignal?: AbortSignal },
  ): Promise<{ response: Response; finalUrl: string }> {
    const redirectCount = options?.redirectCount ?? 0;
    const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const url = normalizeHttpUrl(rawUrl);
    await assertPublicHost(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const onExternalAbort = () => controller.abort();
    options?.externalSignal?.addEventListener('abort', onExternalAbort, { once: true });

    try {
      const response = await fetch(url.toString(), {
        method,
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: '*/*',
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel().catch(() => undefined);

        if (!location) {
          throw new BadGatewayException('Redirect remoto sem destino.');
        }

        if (redirectCount >= MAX_REDIRECTS) {
          throw new BadGatewayException('Limite de redirects excedido.');
        }

        const nextUrl = new URL(location, url).toString();
        return this.fetchWithRedirects(nextUrl, method, {
          redirectCount: redirectCount + 1,
          timeoutMs,
          externalSignal: options?.externalSignal,
        });
      }

      return { response, finalUrl: response.url || url.toString() };
    } finally {
      clearTimeout(timeout);
      options?.externalSignal?.removeEventListener('abort', onExternalAbort);
    }
  }

  private validateContentLength(contentLengthHeader: string | null): number | undefined {
    if (!contentLengthHeader) {
      return undefined;
    }

    const contentLength = Number(contentLengthHeader);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      return undefined;
    }

    if (contentLength > this.maxBytes) {
      throw new BadRequestException(`Arquivo excede o limite de ${this.maxBytes} bytes.`);
    }

    return contentLength;
  }

  async probe(rawUrl: string): Promise<RemoteProbeResult> {
    const { response, finalUrl } = await this.fetchWithRedirects(rawUrl, 'HEAD');
    await response.body?.cancel().catch(() => undefined);

    if (!response.ok && response.status !== 405) {
      const fallback = await this.fetchWithRedirects(rawUrl, 'GET');
      await fallback.response.body?.cancel().catch(() => undefined);

      if (!fallback.response.ok) {
        throw new BadGatewayException(`Falha ao analisar URL remota: HTTP ${fallback.response.status}.`);
      }

      const contentLength = this.validateContentLength(
        fallback.response.headers.get('content-length'),
      );
      return {
        contentType: fallback.response.headers.get('content-type') ?? undefined,
        contentLength,
        finalUrl: fallback.finalUrl,
      };
    }

    const contentLength = this.validateContentLength(response.headers.get('content-length'));
    return {
      contentType: response.headers.get('content-type') ?? undefined,
      contentLength,
      finalUrl,
    };
  }

  async fetchBinaryStream(rawUrl: string): Promise<{
    stream: Readable;
    contentType: string;
    contentLength?: number;
    finalUrl: string;
    abort: () => void;
  }> {
    const abortController = new AbortController();
    const { response, finalUrl } = await this.fetchWithRedirects(rawUrl, 'GET', {
      timeoutMs: DOWNLOAD_TIMEOUT_MS,
      externalSignal: abortController.signal,
    });

    if (!response.ok || !response.body) {
      await response.body?.cancel().catch(() => undefined);
      throw new BadGatewayException(`Falha ao baixar arquivo remoto: HTTP ${response.status}.`);
    }

    const contentLength = this.validateContentLength(response.headers.get('content-length'));
    const maxBytes = this.maxBytes;
    let receivedBytes = 0;

    // Impõe limite máximo de bytes durante o streaming para evitar OOM no container.
    const limiter = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        receivedBytes += chunk.length;
        if (receivedBytes > maxBytes) {
          abortController.abort();
          callback(new Error(`Arquivo excede o limite de ${maxBytes} bytes.`));
          return;
        }
        callback(null, chunk);
      },
    });

    const source = Readable.fromWeb(response.body as unknown as NodeWebReadableStream<Uint8Array>);
    source.on('error', (error) => {
      if (!limiter.destroyed) {
        limiter.destroy(error);
      }
    });

    const stream = source.pipe(limiter);

    return {
      stream,
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
      contentLength,
      finalUrl,
      abort: () => {
        abortController.abort();
        if (!source.destroyed) {
          source.destroy();
        }
        if (!limiter.destroyed) {
          limiter.destroy();
        }
      },
    };
  }

  async fetchJson<T>(rawUrl: string): Promise<T> {
    const { response } = await this.fetchWithRedirects(rawUrl, 'GET');
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      this.logger.warn(`Falha ao buscar JSON remoto: HTTP ${response.status}`);
      throw new BadGatewayException(`Falha ao buscar metadados remotos: HTTP ${response.status}.`);
    }

    return (await response.json()) as T;
  }
}
