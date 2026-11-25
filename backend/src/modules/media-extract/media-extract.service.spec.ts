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

  it('normaliza URL pública e delega extração para a plataforma detectada', async () => {
    platformExtractorsService.extract.mockResolvedValue({
      sourceUrl: 'https://www.youtube.com/watch?v=abc',
      platform: 'youtube',
      pageTitle: 'Demo',
      items: [],
    });

    const result = await service.analyze('https://www.youtube.com/watch?v=abc');

    expect(platformExtractorsService.extract).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc',
      'youtube',
    );
    expect(result.platform).toBe('youtube');
  });

  it('rejeita URL apontando para host privado antes de extrair', async () => {
    await expect(service.analyze('http://127.0.0.1/video.mp4')).rejects.toThrow(/privado/);
    expect(platformExtractorsService.extract).not.toHaveBeenCalled();
  });

  it('faz download via stream yt-dlp quando token é mode ytdlp', async () => {
    const fakeStream = Readable.from(['chunk']);
    const abort = jest.fn();
    downloadTokenService.verify.mockReturnValue({
      mode: 'ytdlp',
      url: 'https://www.youtube.com/watch?v=abc',
      filename: 'demo.mp4',
      formatId: '18',
      exp: Math.floor(Date.now() / 1000) + 300,
    });
    ytdlpService.createDownloadStream.mockReturnValue({ stream: fakeStream, abort });

    const result = await service.downloadByToken('valid.token');

    expect(ytdlpService.createDownloadStream).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc',
      '18',
    );
    expect(result.filename).toBe('demo.mp4');
    expect(result.stream).toBe(fakeStream);
    expect(result.abort).toBe(abort);
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
