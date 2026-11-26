import {
  buildContentDisposition,
  buildResolution,
  detectMediaKind,
  detectPlatform,
  extractYouTubeVideoId,
  formatBytes,
  isPrivateIpAddress,
  isValidFormatId,
  normalizeHttpUrl,
  parseIso8601Duration,
  sanitizeFilename,
} from './media-extract.utils';

describe('media-extract.utils', () => {
  describe('isPrivateIpAddress', () => {
    it('bloqueia IPs privados IPv4, CGNAT, loopback, link-local e multicast', () => {
      expect(isPrivateIpAddress('127.0.0.1')).toBe(true);
      expect(isPrivateIpAddress('10.0.0.5')).toBe(true);
      expect(isPrivateIpAddress('100.64.0.1')).toBe(true);
      expect(isPrivateIpAddress('169.254.169.254')).toBe(true);
      expect(isPrivateIpAddress('172.16.0.1')).toBe(true);
      expect(isPrivateIpAddress('192.168.1.10')).toBe(true);
      expect(isPrivateIpAddress('0.0.0.0')).toBe(true);
      expect(isPrivateIpAddress('224.0.0.1')).toBe(true);
      expect(isPrivateIpAddress('8.8.8.8')).toBe(false);
      expect(isPrivateIpAddress('1.1.1.1')).toBe(false);
    });

    it('bloqueia IPv6 privados e IPv4 mapeado em IPv6', () => {
      expect(isPrivateIpAddress('::1')).toBe(true);
      expect(isPrivateIpAddress('::')).toBe(true);
      expect(isPrivateIpAddress('fe80::1')).toBe(true);
      expect(isPrivateIpAddress('fc00::1')).toBe(true);
      expect(isPrivateIpAddress('fd12:3456::1')).toBe(true);
      expect(isPrivateIpAddress('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIpAddress('::ffff:169.254.169.254')).toBe(true);
      expect(isPrivateIpAddress('::ffff:7f00:1')).toBe(true);
      expect(isPrivateIpAddress('2606:4700:4700::1111')).toBe(false);
    });
  });

  describe('normalizeHttpUrl', () => {
    it('aceita URLs públicas HTTP/HTTPS e prefixa https quando omitido', () => {
      expect(normalizeHttpUrl('https://www.youtube.com/watch?v=abc').hostname).toBe(
        'www.youtube.com',
      );
      expect(normalizeHttpUrl('example.com/video.mp4').toString()).toBe(
        'https://example.com/video.mp4',
      );
    });

    it('bloqueia protocolos não HTTP, credenciais e hosts internos', () => {
      expect(() => normalizeHttpUrl('file:///etc/passwd')).toThrow();
      expect(() => normalizeHttpUrl('https://user:pass@example.com/video.mp4')).toThrow();
      expect(() => normalizeHttpUrl('http://localhost:3000/test')).toThrow();
      expect(() => normalizeHttpUrl('http://metadata.google.internal/computeMetadata')).toThrow();
      expect(() => normalizeHttpUrl('http://api.service.internal/x')).toThrow();
    });
  });

  describe('detectPlatform e extractYouTubeVideoId', () => {
    it('detecta YouTube, Instagram, TikTok, arquivo direto e genérico', () => {
      expect(detectPlatform(normalizeHttpUrl('https://www.youtube.com/watch?v=abc123'))).toBe(
        'youtube',
      );
      expect(detectPlatform(normalizeHttpUrl('https://youtu.be/abc123'))).toBe('youtube');
      expect(detectPlatform(normalizeHttpUrl('https://www.instagram.com/reel/abc/'))).toBe(
        'instagram',
      );
      expect(detectPlatform(normalizeHttpUrl('https://www.tiktok.com/@u/video/123'))).toBe(
        'tiktok',
      );
      expect(detectPlatform(normalizeHttpUrl('https://cdn.example.com/demo.mp4'))).toBe('direct');
      expect(detectPlatform(normalizeHttpUrl('https://example.com/artigo'))).toBe('generic');
    });

    it('extrai ID de vídeos do YouTube em watch, shorts, embed e youtu.be', () => {
      expect(extractYouTubeVideoId(normalizeHttpUrl('https://youtu.be/xyz987'))).toBe('xyz987');
      expect(
        extractYouTubeVideoId(normalizeHttpUrl('https://www.youtube.com/shorts/shortId1')),
      ).toBe('shortId1');
      expect(extractYouTubeVideoId(normalizeHttpUrl('https://www.youtube.com/watch?v=vid42'))).toBe(
        'vid42',
      );
    });
  });

  describe('formatadores e sanitização', () => {
    it('formata bytes, duração ISO 8601, resolução e tipo de mídia', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(parseIso8601Duration('PT1H2M3S')).toBe(3723);
      expect(buildResolution(1920, 1080)).toBe('1920x1080');
      expect(buildResolution(undefined, 720)).toBe('720p');
      expect(detectMediaKind('video/mp4', 'mp4')).toBe('video');
      expect(detectMediaKind(undefined, 'mp3')).toBe('audio');
      expect(detectMediaKind('image/webp')).toBe('image');
    });

    it('sanitiza filename, Content-Disposition e valida formatId contra injeção de flags', () => {
      expect(sanitizeFilename('Vídeo: teste\r\n/ok?', 'mp4')).toBe('Vídeo testeok.mp4');
      expect(buildContentDisposition('relatório "final"\r\n.mp4')).toContain(
        "filename*=UTF-8''relat%C3%B3rio%20final.mp4",
      );
      expect(isValidFormatId('best')).toBe(true);
      expect(isValidFormatId('137+140')).toBe(true);
      expect(isValidFormatId('bestaudio/best')).toBe(true);
      expect(isValidFormatId('-x')).toBe(false);
      expect(isValidFormatId('--exec=whoami')).toBe(false);
      expect(isValidFormatId('best; rm -rf /')).toBe(false);
    });
  });
});
