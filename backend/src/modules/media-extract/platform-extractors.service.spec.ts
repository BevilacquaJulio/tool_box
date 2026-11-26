import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.validation';
import { DownloadTokenService } from './download-token.service';
import type { YtdlpInfo } from './media-extract.types';
import { PlatformExtractorsService } from './platform-extractors.service';
import type { RemoteFetchService } from './remote-fetch.service';
import { pickBestAudioFormat, type YtdlpService } from './ytdlp.service';

function makeConfig(): ConfigService<EnvConfig, true> {
  const values: Partial<Record<keyof EnvConfig, unknown>> = {
    MEDIA_DOWNLOAD_SECRET: 'test-download-secret-min-16-chars',
    MEDIA_DOWNLOAD_TOKEN_TTL_SECONDS: 900,
    INTERNAL_API_KEY: 'internal-api-key-with-at-least-32-chars',
    YOUTUBE_API_KEY: undefined,
    INSTAGRAM_ACCESS_TOKEN: undefined,
  };
  return {
    get: (key: keyof EnvConfig) => values[key],
  } as unknown as ConfigService<EnvConfig, true>;
}

const SAMPLE_YTDLP_INFO: YtdlpInfo = {
  id: 'abc123',
  title: 'Aula de NestJS',
  duration: 245,
  webpage_url: 'https://www.youtube.com/watch?v=abc123',
  thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
  formats: [
    {
      format_id: '18',
      ext: 'mp4',
      width: 640,
      height: 360,
      vcodec: 'avc1',
      acodec: 'mp4a',
      filesize: 12_000_000,
    },
    {
      format_id: '251',
      ext: 'webm',
      vcodec: 'none',
      acodec: 'opus',
      abr: 160,
      filesize: 3_500_000,
    },
    {
      format_id: '140',
      ext: 'm4a',
      vcodec: 'none',
      acodec: 'mp4a.40.2',
      abr: 128,
      filesize: 3_900_000,
    },
  ],
};

describe('PlatformExtractorsService — extração de áudio', () => {
  const config = makeConfig();
  const downloadTokenService = new DownloadTokenService(config);

  const ytdlpService = {
    getInfo: jest.fn(),
    isFfmpegAvailable: jest.fn(),
  } as unknown as jest.Mocked<YtdlpService>;

  const remoteFetchService = {
    probe: jest.fn(),
    fetchJson: jest.fn(),
  } as unknown as jest.Mocked<RemoteFetchService>;

  const service = new PlatformExtractorsService(
    ytdlpService,
    remoteFetchService,
    downloadTokenService,
    config,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    remoteFetchService.probe.mockResolvedValue({
      contentType: 'image/jpeg',
      contentLength: 50_000,
      finalUrl: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    });
  });

  it('pickBestAudioFormat seleciona apenas faixas sem vídeo e prioriza m4a compatível', () => {
    const picked = pickBestAudioFormat(SAMPLE_YTDLP_INFO);
    expect(picked?.format_id).toBe('140');
    expect(picked?.ext).toBe('m4a');
  });

  it('no modo audio com ffmpeg disponível retorna somente item MP3 (ytdlp-audio)', async () => {
    ytdlpService.getInfo.mockResolvedValue(SAMPLE_YTDLP_INFO);
    ytdlpService.isFfmpegAvailable.mockResolvedValue(true);

    const result = await service.extract(
      'https://www.youtube.com/watch?v=abc123',
      'youtube',
      'audio',
    );

    expect(result.mode).toBe('audio');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      mediaType: 'audio',
      extension: 'mp3',
      bitrateLabel: '128 kbps',
      downloadable: true,
    });

    const tokenPayload = downloadTokenService.verify(result.items[0].downloadToken!);
    expect(tokenPayload).toMatchObject({
      mode: 'ytdlp-audio',
      formatId: '140',
      contentType: 'audio/mpeg',
    });
  });

  it('no modo audio sem ffmpeg retorna trilha nativa m4a pronta para download via yt-dlp', async () => {
    ytdlpService.getInfo.mockResolvedValue(SAMPLE_YTDLP_INFO);
    ytdlpService.isFfmpegAvailable.mockResolvedValue(false);

    const result = await service.extract(
      'https://www.youtube.com/watch?v=abc123',
      'youtube',
      'audio',
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      mediaType: 'audio',
      extension: 'm4a',
      bitrateLabel: '128 kbps',
      downloadable: true,
    });

    const tokenPayload = downloadTokenService.verify(result.items[0].downloadToken!);
    expect(tokenPayload).toMatchObject({
      mode: 'ytdlp',
      formatId: '140',
      contentType: 'audio/mp4',
    });
  });

  it('no modo all retorna vídeo, áudio extraído e miniatura juntos', async () => {
    ytdlpService.getInfo.mockResolvedValue(SAMPLE_YTDLP_INFO);
    ytdlpService.isFfmpegAvailable.mockResolvedValue(false);

    const result = await service.extract('https://www.youtube.com/watch?v=abc123', 'youtube', 'all');

    expect(result.items.map((item) => item.mediaType)).toEqual(['video', 'audio', 'image']);
    expect(result.items[1].downloadable).toBe(true);
  });

  it('informa ausência de ffmpeg quando vídeo não tem trilha de áudio separada', async () => {
    ytdlpService.getInfo.mockResolvedValue({
      title: 'Clipe curto',
      formats: [{ format_id: 'mp4', ext: 'mp4', vcodec: 'h264', acodec: 'aac' }],
    });
    ytdlpService.isFfmpegAvailable.mockResolvedValue(false);

    const result = await service.extract('https://www.tiktok.com/@u/video/1', 'tiktok', 'audio');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].downloadable).toBe(false);
    expect(result.items[0].restrictionReason).toMatch(/ffmpeg/i);
  });

  it('em link direto .mp4 com ffmpeg permite extrair somente áudio em MP3 (direct-audio)', async () => {
    ytdlpService.isFfmpegAvailable.mockResolvedValue(true);
    remoteFetchService.probe.mockResolvedValue({
      contentType: 'video/mp4',
      contentLength: 5_000_000,
      finalUrl: 'https://cdn.example.com/demo.mp4',
    });

    const result = await service.extract('https://cdn.example.com/demo.mp4', 'direct', 'audio');

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      mediaType: 'audio',
      extension: 'mp3',
      downloadable: true,
    });
    const tokenPayload = downloadTokenService.verify(result.items[0].downloadToken!);
    expect(tokenPayload.mode).toBe('direct-audio');
  });

  describe('classificação de erros no fallback oEmbed', () => {
    beforeEach(() => {
      remoteFetchService.fetchJson.mockResolvedValue({
        title: 'GTA 6 está morrendo... e rápido',
        thumbnail_url: 'https://i.ytimg.com/vi/D2eJYyFcr_k/hqdefault.jpg',
      });
    });

    it('informa bloqueio anti-bot do YouTube com orientação sobre YTDLP_COOKIES_PATH', async () => {
      const botError = Object.assign(
        new Error(
          "Command failed: yt-dlp --dump-single-json -- https://www.youtube.com/watch?v=D2eJYyFcr_k\nERROR: [youtube] D2eJYyFcr_k: Sign in to confirm you're not a bot. Use --cookies for the authentication.",
        ),
        { code: 1 },
      );
      ytdlpService.getInfo.mockRejectedValue(botError);

      const result = await service.extract(
        'https://www.youtube.com/watch?v=D2eJYyFcr_k',
        'youtube',
        'audio',
      );

      expect(result.items).toHaveLength(1);
      expect(result.items[0].downloadable).toBe(false);
      expect(result.items[0].restrictionReason).toMatch(/anti-bot|autenticação/i);
      expect(result.items[0].restrictionReason).toMatch(/YTDLP_COOKIES_PATH/);
      expect(result.items[0].restrictionReason).not.toMatch(/Configure o yt-dlp no servidor/i);
      expect(result.items[0].restrictionReason).not.toMatch(/Command failed|--dump-single-json/);
    });

    it('mantém aviso de instalação do yt-dlp apenas quando o binário não existe (ENOENT)', async () => {
      const enoentError = Object.assign(new Error('spawn yt-dlp ENOENT'), { code: 'ENOENT' });
      ytdlpService.getInfo.mockRejectedValue(enoentError);

      const result = await service.extract(
        'https://www.youtube.com/watch?v=D2eJYyFcr_k',
        'youtube',
        'audio',
      );

      expect(result.items[0].restrictionReason).toMatch(/Configure o yt-dlp no servidor/i);
    });

    it('identifica mídia privada ou indisponível publicamente', async () => {
      ytdlpService.getInfo.mockRejectedValue(
        new Error('ERROR: [youtube] abc123: Private video. Sign in if you have been granted access'),
      );

      const result = await service.extract(
        'https://www.youtube.com/watch?v=abc123',
        'youtube',
        'all',
      );

      expect(result.items[0].restrictionReason).toMatch(/privada|indisponível/i);
    });

    it('identifica timeout na execução do yt-dlp', async () => {
      const timeoutError = Object.assign(new Error('Command failed: timed out'), {
        killed: true,
        signal: 'SIGTERM',
      });
      ytdlpService.getInfo.mockRejectedValue(timeoutError);

      const result = await service.extract(
        'https://www.youtube.com/watch?v=abc123',
        'youtube',
        'audio',
      );

      expect(result.items[0].restrictionReason).toMatch(/tempo limite/i);
    });

    it('retorna mensagem genérica segura para falhas inesperadas sem vazar detalhes internos', async () => {
      ytdlpService.getInfo.mockRejectedValue(
        new Error('Command failed: /usr/bin/yt-dlp --cookies /tmp/secret.txt unexpected crash'),
      );

      const result = await service.extract(
        'https://www.youtube.com/watch?v=abc123',
        'youtube',
        'audio',
      );

      expect(result.items[0].restrictionReason).not.toMatch(/Configure o yt-dlp no servidor/i);
      expect(result.items[0].restrictionReason).not.toMatch(/\/tmp\/secret\.txt|\/usr\/bin/);
    });
  });
});
