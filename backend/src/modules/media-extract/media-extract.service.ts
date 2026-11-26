import { Injectable } from '@nestjs/common';
import { DownloadTokenService } from './download-token.service';
import type { DownloadResult, MediaExtractMode, MediaExtractResult } from './media-extract.types';
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

  async analyze(rawUrl: string, mode: MediaExtractMode = 'all'): Promise<MediaExtractResult> {
    const url = normalizeHttpUrl(rawUrl);
    await assertPublicHost(url);
    const platform = detectPlatform(url);
    return this.platformExtractorsService.extract(url.toString(), platform, mode);
  }

  async downloadByToken(token: string): Promise<DownloadResult> {
    const payload = this.downloadTokenService.verify(token);
    const validatedUrl = normalizeHttpUrl(payload.url);
    await assertPublicHost(validatedUrl);

    if (payload.mode === 'ytdlp') {
      const { stream, abort } = await this.ytdlpService.createDownloadStream(
        validatedUrl.toString(),
        payload.formatId,
      );
      return {
        stream,
        contentType: payload.contentType ?? 'application/octet-stream',
        filename: payload.filename,
        abort,
      };
    }

    if (payload.mode === 'ytdlp-audio') {
      const { stream, abort } = await this.ytdlpService.createAudioMp3Stream(
        validatedUrl.toString(),
        payload.formatId,
      );
      return {
        stream,
        contentType: payload.contentType ?? 'audio/mpeg',
        filename: payload.filename,
        abort,
      };
    }

    const remote = await this.remoteFetchService.fetchBinaryStream(validatedUrl.toString());

    if (payload.mode === 'direct-audio') {
      const { stream, abort } = this.ytdlpService.transcodeStreamToMp3(remote.stream, remote.abort);
      return {
        stream,
        contentType: payload.contentType ?? 'audio/mpeg',
        filename: payload.filename,
        abort,
      };
    }

    return {
      stream: remote.stream,
      contentType: remote.contentType,
      filename: payload.filename,
      contentLength: remote.contentLength,
      abort: remote.abort,
    };
  }
}
