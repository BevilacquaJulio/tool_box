import { Injectable } from '@nestjs/common';
import { DownloadTokenService } from './download-token.service';
import type { DownloadResult, MediaExtractResult } from './media-extract.types';
import { assertPublicHost, detectPlatform, normalizeHttpUrl } from './media-extract.utils';
import { PlatformExtractorsService } from './platform-extractors.service';
import { RemoteFetchService } from './remote-fetch.service';
import { YtdlpService } from './ytdlp.service';

@Injectable()
export class MediaExtractService {
  constructor(
    private readonly platformExtractorsService: PlatformExtractorsService,
    private readonly downloadTokenService: DownloadTokenService,
    private readonly remoteFetchService: RemoteFetchService,
    private readonly ytdlpService: YtdlpService,
  ) {}

  async analyze(rawUrl: string): Promise<MediaExtractResult> {
    const url = normalizeHttpUrl(rawUrl);
    await assertPublicHost(url);
    const platform = detectPlatform(url);
    return this.platformExtractorsService.extract(url.toString(), platform);
  }

  async downloadByToken(token: string): Promise<DownloadResult> {
    const payload = this.downloadTokenService.verify(token);
    const validatedUrl = normalizeHttpUrl(payload.url);
    await assertPublicHost(validatedUrl);

    if (payload.mode === 'ytdlp') {
      const { stream, abort } = this.ytdlpService.createDownloadStream(
        validatedUrl.toString(),
        payload.formatId,
      );
      return {
        stream,
        contentType: 'application/octet-stream',
        filename: payload.filename,
        abort,
      };
    }

    const { stream, contentType, contentLength, abort } =
      await this.remoteFetchService.fetchBinaryStream(validatedUrl.toString());
    return {
      stream,
      contentType,
      filename: payload.filename,
      contentLength,
      abort,
    };
  }
}
