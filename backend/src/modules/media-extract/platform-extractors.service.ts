import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { EnvConfig } from '../../config/env.validation';
import { DownloadTokenService } from './download-token.service';
import type {
  MediaExtractItem,
  MediaExtractResult,
  MediaPlatform,
  OEmbedResponse,
  YouTubeApiVideoResponse,
} from './media-extract.types';
import {
  buildResolution,
  detectMediaKind,
  extractYouTubeVideoId,
  formatBytes,
  getExtensionFromPath,
  parseIso8601Duration,
  sanitizeFilename,
} from './media-extract.utils';
import { RemoteFetchService } from './remote-fetch.service';
import { buildYtdlpFilename, pickBestFormat, YtdlpService } from './ytdlp.service';

const YTDLP_FALLBACK_MESSAGE =
  'Configure o yt-dlp no servidor para habilitar o download direto desta plataforma.';

@Injectable()
export class PlatformExtractorsService {
  private readonly logger = new Logger(PlatformExtractorsService.name);

  constructor(
    private readonly ytdlpService: YtdlpService,
    private readonly remoteFetchService: RemoteFetchService,
    private readonly downloadTokenService: DownloadTokenService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async extract(sourceUrl: string, platform: MediaPlatform): Promise<MediaExtractResult> {
    switch (platform) {
      case 'youtube':
        return this.extractStreamingPlatform(
          sourceUrl,
          platform,
          this.getYouTubeOEmbedUrl(sourceUrl),
        );
      case 'instagram':
        return this.extractStreamingPlatform(
          sourceUrl,
          platform,
          this.getInstagramOEmbedUrl(sourceUrl),
        );
      case 'tiktok':
        return this.extractStreamingPlatform(
          sourceUrl,
          platform,
          this.getTikTokOEmbedUrl(sourceUrl),
        );
      case 'direct':
        return this.extractDirectMedia(sourceUrl);
      default:
        return this.extractGeneric(sourceUrl);
    }
  }

  private async extractStreamingPlatform(
    sourceUrl: string,
    platform: MediaPlatform,
    oEmbedUrl: string,
  ): Promise<MediaExtractResult> {
    const ytdlpResult = await this.tryAnalyzeWithYtdlp(sourceUrl, platform);
    if (ytdlpResult) {
      return ytdlpResult;
    }

    return this.extractWithOEmbed(sourceUrl, platform, oEmbedUrl);
  }

  private async tryAnalyzeWithYtdlp(
    sourceUrl: string,
    platform: MediaPlatform,
  ): Promise<MediaExtractResult | null> {
    try {
      const info = await this.ytdlpService.getInfo(sourceUrl);
      const bestFormat = pickBestFormat(info);
      const title = info.title ?? 'Mídia';
      const pageTitle = info.title;
      const openUrl = info.webpage_url ?? sourceUrl;
      const durationSeconds = info.duration;
      const items: MediaExtractItem[] = [];

      const extension = bestFormat?.ext ?? info.ext ?? 'mp4';
      const resolution = buildResolution(
        bestFormat?.width ?? info.width,
        bestFormat?.height ?? info.height,
      );
      const sizeBytes = bestFormat?.filesize ?? bestFormat?.filesize_approx ?? info.filesize;

      const filename = buildYtdlpFilename(title, extension);
      const downloadToken = this.downloadTokenService.create({
        mode: 'ytdlp',
        url: sourceUrl,
        filename,
        formatId: bestFormat?.format_id ?? 'best',
      });

      items.push({
        id: randomUUID(),
        title,
        thumbnailUrl: info.thumbnail,
        mediaType: 'video',
        extension,
        resolution,
        durationSeconds,
        sizeBytes,
        sizeLabel: sizeBytes ? formatBytes(sizeBytes) : undefined,
        downloadable: true,
        originalUrl: sourceUrl,
        openUrl,
        downloadToken,
      });

      if (info.thumbnail) {
        const thumbnailItem = await this.buildThumbnailItem(info.thumbnail, title, openUrl);
        if (thumbnailItem) {
          items.push(thumbnailItem);
        }
      }

      if (platform === 'youtube') {
        await this.enrichYouTubeItem(items[0], sourceUrl);
      }

      return {
        sourceUrl,
        platform,
        pageTitle,
        items,
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.warn(`yt-dlp falhou ao analisar plataforma ${platform}: ${reason}`);
      return null;
    }
  }

  private async enrichYouTubeItem(item: MediaExtractItem, sourceUrl: string): Promise<void> {
    const apiKey = this.configService.get('YOUTUBE_API_KEY', { infer: true });
    const videoId = extractYouTubeVideoId(new URL(sourceUrl));
    if (!apiKey || !videoId) {
      return;
    }

    try {
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(apiKey)}`;
      const response = await this.remoteFetchService.fetchJson<YouTubeApiVideoResponse>(apiUrl);
      const video = response.items?.[0];
      if (!video) {
        return;
      }

      if (video.contentDetails?.duration) {
        item.durationSeconds = parseIso8601Duration(video.contentDetails.duration);
      }

      const thumbnail =
        video.snippet?.thumbnails?.high?.url ?? video.snippet?.thumbnails?.medium?.url;
      if (thumbnail) {
        item.thumbnailUrl = thumbnail;
      }
    } catch {
      this.logger.warn('Fallback da YouTube Data API indisponível para este vídeo.');
    }
  }

  private async extractWithOEmbed(
    sourceUrl: string,
    platform: MediaPlatform,
    oEmbedUrl: string,
  ): Promise<MediaExtractResult> {
    let oEmbed: OEmbedResponse | null = null;

    try {
      oEmbed = await this.remoteFetchService.fetchJson<OEmbedResponse>(oEmbedUrl);
    } catch {
      this.logger.warn(`oEmbed falhou para plataforma ${platform}.`);
    }

    const title = oEmbed?.title ?? 'Mídia detectada';
    const items: MediaExtractItem[] = [
      {
        id: randomUUID(),
        title,
        thumbnailUrl: oEmbed?.thumbnail_url,
        mediaType: 'video',
        extension: 'mp4',
        downloadable: false,
        restrictionReason: YTDLP_FALLBACK_MESSAGE,
        originalUrl: sourceUrl,
        openUrl: sourceUrl,
      },
    ];

    if (oEmbed?.thumbnail_url) {
      const thumbnailItem = await this.buildThumbnailItem(oEmbed.thumbnail_url, title, sourceUrl);
      if (thumbnailItem) {
        items.push(thumbnailItem);
      }
    }

    return {
      sourceUrl,
      platform,
      pageTitle: title,
      items,
    };
  }

  private async buildThumbnailItem(
    thumbnailUrl: string,
    title: string,
    openUrl: string,
  ): Promise<MediaExtractItem | null> {
    try {
      const probe = await this.remoteFetchService.probe(thumbnailUrl);
      const extension = getExtensionFromPath(new URL(thumbnailUrl).pathname) ?? 'jpg';
      const filename = sanitizeFilename(`${title}-thumbnail`, extension);

      return {
        id: randomUUID(),
        title: `${title} (miniatura)`,
        thumbnailUrl,
        mediaType: 'image',
        extension,
        sizeBytes: probe.contentLength,
        sizeLabel: probe.contentLength ? formatBytes(probe.contentLength) : undefined,
        downloadable: true,
        originalUrl: thumbnailUrl,
        openUrl,
        downloadToken: this.downloadTokenService.create({
          mode: 'direct',
          url: thumbnailUrl,
          filename,
        }),
      };
    } catch {
      return {
        id: randomUUID(),
        title: `${title} (miniatura)`,
        thumbnailUrl,
        mediaType: 'image',
        extension: 'jpg',
        downloadable: false,
        restrictionReason: 'Miniatura indisponível para download direto.',
        originalUrl: thumbnailUrl,
        openUrl,
      };
    }
  }

  private async extractDirectMedia(sourceUrl: string): Promise<MediaExtractResult> {
    const probe = await this.remoteFetchService.probe(sourceUrl);
    const url = new URL(probe.finalUrl || sourceUrl);
    const extension = getExtensionFromPath(url.pathname) ?? 'bin';
    const segment = url.pathname.split('/').pop() ?? 'download';
    const baseName =
      extension && segment.toLowerCase().endsWith(`.${extension}`)
        ? segment.slice(0, -(extension.length + 1))
        : segment.replace(/\.[^.]+$/, '');
    const filename = sanitizeFilename(baseName || 'download', extension);
    const mediaType = detectMediaKind(probe.contentType, extension);

    return {
      sourceUrl,
      platform: 'direct',
      pageTitle: filename,
      items: [
        {
          id: randomUUID(),
          title: filename,
          thumbnailUrl: mediaType === 'image' ? probe.finalUrl || sourceUrl : undefined,
          mediaType,
          extension,
          sizeBytes: probe.contentLength,
          sizeLabel: probe.contentLength ? formatBytes(probe.contentLength) : undefined,
          downloadable: true,
          originalUrl: probe.finalUrl || sourceUrl,
          openUrl: probe.finalUrl || sourceUrl,
          downloadToken: this.downloadTokenService.create({
            mode: 'direct',
            url: probe.finalUrl || sourceUrl,
            filename,
          }),
        },
      ],
    };
  }

  private extractGeneric(sourceUrl: string): MediaExtractResult {
    return {
      sourceUrl,
      platform: 'generic',
      pageTitle: 'Link genérico',
      items: [
        {
          id: randomUUID(),
          title: 'Nenhuma mídia pública detectada',
          mediaType: 'unknown',
          downloadable: false,
          restrictionReason:
            'Não foi possível detectar mídia pública neste link. Use YouTube, Instagram, TikTok ou um link direto de arquivo (.mp4, .mp3, imagem).',
          originalUrl: sourceUrl,
          openUrl: sourceUrl,
        },
      ],
    };
  }

  private getYouTubeOEmbedUrl(sourceUrl: string): string {
    return `https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`;
  }

  private getInstagramOEmbedUrl(sourceUrl: string): string {
    const token = this.configService.get('INSTAGRAM_ACCESS_TOKEN', { infer: true });
    if (token) {
      return `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(sourceUrl)}&access_token=${encodeURIComponent(token)}`;
    }
    return `https://api.instagram.com/oembed?url=${encodeURIComponent(sourceUrl)}`;
  }

  private getTikTokOEmbedUrl(sourceUrl: string): string {
    return `https://www.tiktok.com/oembed?url=${encodeURIComponent(sourceUrl)}`;
  }
}
