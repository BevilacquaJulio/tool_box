import { Readable } from 'node:stream';
import type { DownloadTokenService } from './download-token.service';
import { MediaExtractService } from './media-extract.service';
import type { PlatformExtractorsService } from './platform-extractors.service';
import type { RemoteFetchService } from './remote-fetch.service';
import type { YtdlpService } from './ytdlp.service';

jest.mock('./media-extract.utils', () => {
  const actual = jest.requireActual<typeof import('./media-extract.utils')>('./media-extract.utils');
  return {
    ...actual,
    assertPublicHost: jest.fn(async (url: URL) => {
      if (url.hostname === '127.0.0.1' || url.hostname === '169.254.169.254') {
        throw new Error('Endereço IP privado não permitido.');
      }
    }),
  };
});

describe('MediaExtractService', () => {
  const platformExtractorsService = {
    extract: jest.fn(),
  } as unknown as jest.Mocked<PlatformExtractorsService>;

  const downloadTokenService = {
    verify: jest.fn(),
  } as unknown as jest.Mocked<DownloadTokenService>;

  const remoteFetchService = {
    fetchBinaryStream: jest.fn(),
  } as unknown as jest.Mocked<RemoteFetchService>;

  const ytdlpService = {
    createDownloadStream: jest.fn(),
    createAudioMp3Stream: jest.fn(),
    transcodeStreamToMp3: jest.fn(),
  } as unknown as jest.Mocked<YtdlpService>;

  const service = new MediaExtractService(
    platformExtractorsService,
    downloadTokenService,
    remoteFetchService,
    ytdlpService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normaliza URL pública e delega extração com o modo escolhido', async () => {
    platformExtractorsService.extract.mockResolvedValue({
      sourceUrl: 'https://www.youtube.com/watch?v=abc',
      platform: 'youtube',
      mode: 'audio',
      pageTitle: 'Demo',
      items: [],
    });

    const result = await service.analyze('https://www.youtube.com/watch?v=abc', 'audio');

    expect(platformExtractorsService.extract).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc',
      'youtube',
      'audio',
    );
    expect(result.platform).toBe('youtube');
    expect(result.mode).toBe('audio');
  });

  it('rejeita URL apontando para host privado antes de extrair', async () => {
    await expect(service.analyze('http://127.0.0.1/video.mp4')).rejects.toThrow(/privado/);
    expect(platformExtractorsService.extract).not.toHaveBeenCalled();
  });

  it('faz download via stream yt-dlp preservando contentType quando token é mode ytdlp', async () => {
    const fakeStream = Readable.from(['chunk']);
    const abort = jest.fn();
    downloadTokenService.verify.mockReturnValue({
      mode: 'ytdlp',
      url: 'https://www.youtube.com/watch?v=abc',
      filename: 'demo.m4a',
      formatId: '140',
      contentType: 'audio/mp4',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    ytdlpService.createDownloadStream.mockResolvedValue({ stream: fakeStream, abort });

    const result = await service.downloadByToken('valid.token');

    expect(ytdlpService.createDownloadStream).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc',
      '140',
    );
    expect(result.filename).toBe('demo.m4a');
    expect(result.contentType).toBe('audio/mp4');
    expect(result.stream).toBe(fakeStream);
    expect(result.abort).toBe(abort);
  });

  it('faz download de áudio MP3 via stream ytdlp-audio', async () => {
    const fakeStream = Readable.from(['mp3-bytes']);
    const abort = jest.fn();
    downloadTokenService.verify.mockReturnValue({
      mode: 'ytdlp-audio',
      url: 'https://www.youtube.com/watch?v=abc',
      filename: 'demo.mp3',
      formatId: '140',
      contentType: 'audio/mpeg',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    ytdlpService.createAudioMp3Stream.mockResolvedValue({ stream: fakeStream, abort });

    const result = await service.downloadByToken('audio.token');

    expect(ytdlpService.createAudioMp3Stream).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc',
      '140',
    );
    expect(result.contentType).toBe('audio/mpeg');
    expect(result.stream).toBe(fakeStream);
  });

  it('extrai MP3 de link direto de vídeo quando token é mode direct-audio', async () => {
    const rawStream = Readable.from(['mp4']);
    const mp3Stream = Readable.from(['mp3']);
    const abortRaw = jest.fn();
    const abortMp3 = jest.fn();

    downloadTokenService.verify.mockReturnValue({
      mode: 'direct-audio',
      url: 'https://cdn.example.com/clipe.mp4',
      filename: 'clipe-audio.mp3',
      contentType: 'audio/mpeg',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    remoteFetchService.fetchBinaryStream.mockResolvedValue({
      stream: rawStream,
      contentType: 'video/mp4',
      contentLength: 100,
      finalUrl: 'https://cdn.example.com/clipe.mp4',
      abort: abortRaw,
    });
    ytdlpService.transcodeStreamToMp3.mockReturnValue({
      stream: mp3Stream,
      abort: abortMp3,
    });

    const result = await service.downloadByToken('direct-audio.token');

    expect(ytdlpService.transcodeStreamToMp3).toHaveBeenCalledWith(rawStream, abortRaw);
    expect(result.contentType).toBe('audio/mpeg');
    expect(result.stream).toBe(mp3Stream);
  });

  it('faz download via stream remoto quando token é mode direct', async () => {
    const fakeStream = Readable.from(['bytes']);
    const abort = jest.fn();
    downloadTokenService.verify.mockReturnValue({
      mode: 'direct',
      url: 'https://cdn.example.com/foto.png',
      filename: 'foto.png',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    remoteFetchService.fetchBinaryStream.mockResolvedValue({
      stream: fakeStream,
      contentType: 'image/png',
      contentLength: 5,
      finalUrl: 'https://cdn.example.com/foto.png',
      abort,
    });

    const result = await service.downloadByToken('direct.token');

    expect(remoteFetchService.fetchBinaryStream).toHaveBeenCalledWith(
      'https://cdn.example.com/foto.png',
    );
    expect(result.contentType).toBe('image/png');
    expect(result.contentLength).toBe(5);
  });
});
