import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { EnvConfig } from '../../config/env.validation';
import { DownloadTokenService } from './download-token.service';
import type {
  MediaExtractItem,
  MediaExtractMode,
  MediaExtractResult,
  MediaPlatform,
  OEmbedResponse,
  YouTubeApiVideoResponse,
  YtdlpInfo,
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
import {
  buildYtdlpFilename,
  guessAudioContentType,
  pickBestAudioFormat,
  pickBestFormat,
  YtdlpService,
} from './ytdlp.service';

const YTDLP_MISSING_MESSAGE =
  'Configure o yt-dlp no servidor para habilitar o download direto desta plataforma.';
const YTDLP_YOUTUBE_BOT_MESSAGE =
  'O YouTube exigiu autenticação/verificação anti-bot para o IP deste servidor. Configure YTDLP_COOKIES_PATH (ou atualize os cookies expirados) no servidor para habilitar o download direto.';
const YTDLP_PLATFORM_AUTH_MESSAGE =
  'Esta plataforma exigiu autenticação para o IP deste servidor. Conteúdos protegidos por sessão podem requerer cookies configurados em YTDLP_COOKIES_PATH no servidor.';
const YTDLP_UNAVAILABLE_MESSAGE =
  'Esta mídia está privada, restrita por região ou indisponível publicamente para download direto.';
const YTDLP_TIMEOUT_MESSAGE =
  'A análise desta mídia excedeu o tempo limite no servidor. Tente novamente em instantes.';
const YTDLP_GENERIC_ERROR_MESSAGE =
  'Não foi possível extrair os formatos diretos desta plataforma no momento. Tente novamente ou abra o link na origem.';
const FFMPEG_AUDIO_FALLBACK_MESSAGE =
  'Esta mídia não expõe faixa de áudio separada. Instale o ffmpeg no servidor para extrair o áudio em MP3.';

interface ExecErrorLike {
  code?: string | number;
  killed?: boolean;
  signal?: string | null;
  stderr?: string | Buffer;
  message?: string;
}

export function classifyYtdlpError(error: unknown, platform: MediaPlatform): string {
  const err = (error && typeof error === 'object' ? error : {}) as ExecErrorLike;
  if (err.code === 'ENOENT') {
    return YTDLP_MISSING_MESSAGE;
  }

  const stderrText =
    typeof err.stderr === 'string'
      ? err.stderr
      : Buffer.isBuffer(err.stderr)
        ? err.stderr.toString('utf8')
        : '';
  const combined = `${err.message ?? ''}\n${stderrText}`;

  if (/sign in to confirm you['’]?re not a bot|use --cookies|cookies-from-browser/i.test(combined)) {
    return platform === 'youtube' ? YTDLP_YOUTUBE_BOT_MESSAGE : YTDLP_PLATFORM_AUTH_MESSAGE;
  }

  if (
    /private video|video unavailable|members-only|join this channel|not available in your country|account associated with this video has been terminated|this video has been removed|post is private/i.test(
      combined,
    )
  ) {
    return YTDLP_UNAVAILABLE_MESSAGE;
  }

  if (/confirm your age|sign in to confirm your age|login required|authentication required|sign in to view/i.test(combined)) {
    return platform === 'youtube' ? YTDLP_YOUTUBE_BOT_MESSAGE : YTDLP_PLATFORM_AUTH_MESSAGE;
  }

  if (err.killed === true || err.code === 'ETIMEDOUT' || /timed out/i.test(combined)) {
    return YTDLP_TIMEOUT_MESSAGE;
  }

  return YTDLP_GENERIC_ERROR_MESSAGE;
}

@Injectable()
export class PlatformExtractorsService {
  private readonly logger = new Logger(PlatformExtractorsService.name);

  constructor(
    private readonly ytdlpService: YtdlpService,
    private readonly remoteFetchService: RemoteFetchService,
    private readonly downloadTokenService: DownloadTokenService,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {}

  async extract(
    sourceUrl: string,
    platform: MediaPlatform,
    mode: MediaExtractMode = 'all',
  ): Promise<MediaExtractResult> {
    switch (platform) {
      case 'youtube':
        return this.extractStreamingPlatform(
          sourceUrl,
          platform,
          this.getYouTubeOEmbedUrl(sourceUrl),
          mode,
        );
      case 'instagram':
        return this.extractStreamingPlatform(
          sourceUrl,
          platform,
          this.getInstagramOEmbedUrl(sourceUrl),
          mode,
        );
      case 'tiktok':
        return this.extractStreamingPlatform(
          sourceUrl,
          platform,
          this.getTikTokOEmbedUrl(sourceUrl),
          mode,
        );
      case 'direct':
        return this.extractDirectMedia(sourceUrl, mode);
      default:
        return this.extractGeneric(sourceUrl, mode);
    }
  }

  private async extractStreamingPlatform(
    sourceUrl: string,
    platform: MediaPlatform,
    oEmbedUrl: string,
    mode: MediaExtractMode,
  ): Promise<MediaExtractResult> {
    const attempt = await this.tryAnalyzeWithYtdlp(sourceUrl, platform, mode);
    if (attempt.ok) {
      return attempt.result;
    }

    return this.extractWithOEmbed(sourceUrl, platform, oEmbedUrl, mode, attempt.fallbackReason);
  }

  private async tryAnalyzeWithYtdlp(
    sourceUrl: string,
    platform: MediaPlatform,
    mode: MediaExtractMode,
  ): Promise<{ ok: true; result: MediaExtractResult } | { ok: false; fallbackReason: string }> {
    try {
      const info = await this.ytdlpService.getInfo(sourceUrl);
      const ffmpegAvailable = await this.ytdlpService.isFfmpegAvailable();
      const title = info.title ?? 'Mídia';
      const pageTitle = info.title;
      const openUrl = info.webpage_url ?? sourceUrl;
      const durationSeconds = info.duration;
      const items: MediaExtractItem[] = [];

      if (mode === 'all') {
        const bestFormat = pickBestFormat(info);
        const extension = bestFormat?.ext ?? info.ext ?? 'mp4';
        const resolution = buildResolution(
          bestFormat?.width ?? info.width,
          bestFormat?.height ?? info.height,
        );
        const sizeBytes = bestFormat?.filesize ?? bestFormat?.filesize_approx ?? info.filesize;
        const filename = buildYtdlpFilename(title, extension);

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
          downloadToken: this.downloadTokenService.create({
            mode: 'ytdlp',
            url: sourceUrl,
            filename,
            formatId: bestFormat?.format_id ?? 'best',
            contentType: extension === 'webm' ? 'video/webm' : 'video/mp4',
          }),
        });
      }

      const audioItem = this.buildAudioItem(info, sourceUrl, openUrl, title, ffmpegAvailable);
      if (audioItem && (mode === 'audio' || audioItem.downloadable)) {
        items.push(audioItem);
      }

      if (mode === 'all' && info.thumbnail) {
        const thumbnailItem = await this.buildThumbnailItem(info.thumbnail, title, openUrl);
        if (thumbnailItem) {
          items.push(thumbnailItem);
        }
      }

      if (platform === 'youtube' && items.length > 0) {
        await this.enrichYouTubeItems(items, sourceUrl);
      }

      return {
        ok: true,
        result: {
          sourceUrl,
          platform,
          mode,
          pageTitle,
          items,
        },
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';
      this.logger.warn(`yt-dlp falhou ao analisar plataforma ${platform}: ${reason}`);
      return {
        ok: false,
        fallbackReason: classifyYtdlpError(error, platform),
      };
    }
  }

  private buildAudioItem(
    info: YtdlpInfo,
    sourceUrl: string,
    openUrl: string,
    title: string,
    ffmpegAvailable: boolean,
  ): MediaExtractItem {
    const bestAudio = pickBestAudioFormat(info);
    const bitrateKbps = bestAudio?.abr ?? bestAudio?.tbr;
    const bitrateLabel =
      bitrateKbps && bitrateKbps > 0 ? `${Math.round(bitrateKbps)} kbps` : undefined;

    // Com ffmpeg instalado no servidor, converte sempre para MP3 (funciona inclusive em vídeos sem trilha de áudio separada).
    if (ffmpegAvailable) {
      const filename = buildYtdlpFilename(`${title} (audio)`, 'mp3');
      return {
        id: randomUUID(),
        title: `${title} (somente áudio)`,
        thumbnailUrl: info.thumbnail,
        mediaType: 'audio',
        extension: 'mp3',
        bitrateLabel: bitrateLabel ?? 'MP3',
        durationSeconds: info.duration,
        downloadable: true,
        originalUrl: sourceUrl,
        openUrl,
        downloadToken: this.downloadTokenService.create({
          mode: 'ytdlp-audio',
          url: sourceUrl,
          filename,
          formatId: bestAudio?.format_id ?? 'bestaudio/best',
          contentType: 'audio/mpeg',
        }),
      };
    }

    // Sem ffmpeg: usa diretamente a melhor trilha somente-áudio nativa oferecida pelo yt-dlp (ex.: m4a/webm).
    if (bestAudio?.format_id) {
      const extension = bestAudio.ext ?? 'm4a';
      const sizeBytes = bestAudio.filesize ?? bestAudio.filesize_approx;
      const filename = buildYtdlpFilename(`${title} (audio)`, extension);

      return {
        id: randomUUID(),
        title: `${title} (somente áudio)`,
        thumbnailUrl: info.thumbnail,
        mediaType: 'audio',
        extension,
        bitrateLabel,
        durationSeconds: info.duration,
        sizeBytes,
        sizeLabel: sizeBytes ? formatBytes(sizeBytes) : undefined,
        downloadable: true,
        originalUrl: sourceUrl,
        openUrl,
        downloadToken: this.downloadTokenService.create({
          mode: 'ytdlp',
          url: sourceUrl,
          filename,
          formatId: bestAudio.format_id,
          contentType: guessAudioContentType(extension),
        }),
      };
    }

    return {
      id: randomUUID(),
      title: `${title} (somente áudio)`,
      thumbnailUrl: info.thumbnail,
      mediaType: 'audio',
      extension: 'mp3',
      durationSeconds: info.duration,
      downloadable: false,
      restrictionReason: FFMPEG_AUDIO_FALLBACK_MESSAGE,
      originalUrl: sourceUrl,
      openUrl,
    };
  }

  private async enrichYouTubeItems(items: MediaExtractItem[], sourceUrl: string): Promise<void> {
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

      const durationSeconds = video.contentDetails?.duration
        ? parseIso8601Duration(video.contentDetails.duration)
        : undefined;
      const thumbnail =
        video.snippet?.thumbnails?.high?.url ?? video.snippet?.thumbnails?.medium?.url;

      for (const item of items) {
        if (item.mediaType === 'image') {
          continue;
        }
        if (durationSeconds !== undefined) {
          item.durationSeconds = durationSeconds;
        }
        if (thumbnail) {
          item.thumbnailUrl = thumbnail;
        }
      }
    } catch {
      this.logger.warn('Fallback da YouTube Data API indisponível para este vídeo.');
    }
  }

  private async extractWithOEmbed(
    sourceUrl: string,
    platform: MediaPlatform,
    oEmbedUrl: string,
    mode: MediaExtractMode,
    restrictionReason: string = YTDLP_MISSING_MESSAGE,
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
        title: mode === 'audio' ? `${title} (somente áudio)` : title,
        thumbnailUrl: oEmbed?.thumbnail_url,
        mediaType: mode === 'audio' ? 'audio' : 'video',
        extension: mode === 'audio' ? 'mp3' : 'mp4',
        downloadable: false,
        restrictionReason,
        originalUrl: sourceUrl,
        openUrl: sourceUrl,
      },
    ];

    if (mode === 'all' && oEmbed?.thumbnail_url) {
      const thumbnailItem = await this.buildThumbnailItem(oEmbed.thumbnail_url, title, sourceUrl);
      if (thumbnailItem) {
        items.push(thumbnailItem);
      }
    }

    return {
      sourceUrl,
      platform,
      mode,
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

  private async extractDirectMedia(
    sourceUrl: string,
    mode: MediaExtractMode,
  ): Promise<MediaExtractResult> {
    const probe = await this.remoteFetchService.probe(sourceUrl);
    const resolvedUrl = probe.finalUrl || sourceUrl;
    const url = new URL(resolvedUrl);
    const extension = getExtensionFromPath(url.pathname) ?? 'bin';
    const segment = url.pathname.split('/').pop() ?? 'download';
    const baseName =
      extension && segment.toLowerCase().endsWith(`.${extension}`)
        ? segment.slice(0, -(extension.length + 1))
        : segment.replace(/\.[^.]+$/, '');
    const filename = sanitizeFilename(baseName || 'download', extension);
    const mediaType = detectMediaKind(probe.contentType, extension);

    const items: MediaExtractItem[] = [];

    if (mode === 'all' || mediaType === 'audio') {
      items.push({
        id: randomUUID(),
        title: filename,
        thumbnailUrl: mediaType === 'image' ? resolvedUrl : undefined,
        mediaType,
        extension,
        sizeBytes: probe.contentLength,
        sizeLabel: probe.contentLength ? formatBytes(probe.contentLength) : undefined,
        downloadable: true,
        originalUrl: resolvedUrl,
        openUrl: resolvedUrl,
        downloadToken: this.downloadTokenService.create({
          mode: 'direct',
          url: resolvedUrl,
          filename,
        }),
      });
    }

    if (mediaType === 'video') {
      const ffmpegAvailable = await this.ytdlpService.isFfmpegAvailable();
      if (ffmpegAvailable) {
        const audioFilename = sanitizeFilename(`${baseName || 'audio'}-audio`, 'mp3');
        items.push({
          id: randomUUID(),
          title: `${baseName || 'Mídia'} (somente áudio)`,
          mediaType: 'audio',
          extension: 'mp3',
          bitrateLabel: 'MP3',
          downloadable: true,
          originalUrl: resolvedUrl,
          openUrl: resolvedUrl,
          downloadToken: this.downloadTokenService.create({
            mode: 'direct-audio',
            url: resolvedUrl,
            filename: audioFilename,
            contentType: 'audio/mpeg',
          }),
        });
      } else if (mode === 'audio') {
        items.push({
          id: randomUUID(),
          title: `${baseName || 'Mídia'} (somente áudio)`,
          mediaType: 'audio',
          extension: 'mp3',
          downloadable: false,
          restrictionReason: FFMPEG_AUDIO_FALLBACK_MESSAGE,
          originalUrl: resolvedUrl,
          openUrl: resolvedUrl,
        });
      }
    } else if (mode === 'audio' && mediaType !== 'audio') {
      items.push({
        id: randomUUID(),
        title: filename,
        mediaType,
        extension,
        downloadable: false,
        restrictionReason: 'O link informado não contém áudio para extração.',
        originalUrl: resolvedUrl,
        openUrl: resolvedUrl,
      });
    }

    return {
      sourceUrl,
      platform: 'direct',
      mode,
      pageTitle: filename,
      items,
    };
  }

  private extractGeneric(sourceUrl: string, mode: MediaExtractMode): MediaExtractResult {
    return {
      sourceUrl,
      platform: 'generic',
      mode,
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
