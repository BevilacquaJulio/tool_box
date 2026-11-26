import { BadRequestException } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { MediaKind, MediaPlatform } from './media-extract.types';

const DIRECT_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.mov',
  '.mkv',
  '.avi',
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.pdf',
  '.zip',
]);

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'instance-data',
]);

const SAFE_FORMAT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._+/-]{0,63}$/;

export function normalizeHttpUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new BadRequestException('Informe uma URL válida.');
  }

  const hasExplicitScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:(?!\d+(?:\/|$))/.test(trimmed);
  const withProtocol = hasExplicitScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new BadRequestException('URL inválida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Apenas URLs HTTP/HTTPS são permitidas.');
  }

  if (url.username || url.password) {
    throw new BadRequestException('Credenciais na URL não são permitidas.');
  }

  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (
    !hostname ||
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.internal')
  ) {
    throw new BadRequestException('Host não permitido.');
  }

  return url;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) {
    return false;
  }

  const octets = parts.map((segment) => Number(segment));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [a, b] = octets;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmark range
  if (a >= 224) return true; // multicast / reserved

  return false;
}

export function isPrivateIpAddress(ip: string): boolean {
  const normalized = ip.trim().toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (!normalized) {
    return true;
  }

  const family = isIP(normalized);
  if (family === 4) {
    return isPrivateIpv4(normalized);
  }

  if (family === 6) {
    if (normalized === '::' || normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
      return true;
    }

    // IPv4-mapped IPv6 (ex.: ::ffff:127.0.0.1 ou ::ffff:7f00:1)
    if (normalized.startsWith('::ffff:')) {
      const mapped = normalized.slice('::ffff:'.length);
      if (isIP(mapped) === 4) {
        return isPrivateIpv4(mapped);
      }
      const hexMatch = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hexMatch) {
        const hi = Number.parseInt(hexMatch[1], 16);
        const lo = Number.parseInt(hexMatch[2], 16);
        const ipv4 = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
        return isPrivateIpv4(ipv4);
      }
      return true;
    }

    // Link-local (fe80::/10) e ULA (fc00::/7)
    const firstHextet = Number.parseInt(normalized.split(':')[0] || '0', 16);
    if ((firstHextet & 0xffc0) === 0xfe80) return true;
    if ((firstHextet & 0xfe00) === 0xfc00) return true;
    if ((firstHextet & 0xff00) === 0xff00) return true; // multicast
    return false;
  }

  return false;
}

export async function assertPublicHost(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');

  if (isIP(hostname) !== 0) {
    if (isPrivateIpAddress(hostname)) {
      throw new BadRequestException('Endereço IP privado não permitido.');
    }
    return;
  }

  try {
    const entries = await lookup(hostname, { all: true });
    if (entries.length === 0) {
      throw new BadRequestException('Não foi possível resolver o host da URL.');
    }

    for (const entry of entries) {
      if (isPrivateIpAddress(entry.address)) {
        throw new BadRequestException('Host resolve para endereço privado.');
      }
    }
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException('Não foi possível resolver o host da URL.');
  }
}

export function detectPlatform(url: URL): MediaPlatform {
  const hostname = url.hostname.toLowerCase();

  if (
    hostname === 'youtube.com' ||
    hostname.endsWith('.youtube.com') ||
    hostname === 'youtu.be' ||
    hostname.endsWith('.youtu.be')
  ) {
    return 'youtube';
  }

  if (hostname === 'instagram.com' || hostname.endsWith('.instagram.com')) {
    return 'instagram';
  }

  if (hostname === 'tiktok.com' || hostname.endsWith('.tiktok.com')) {
    return 'tiktok';
  }

  const extension = getExtensionFromPath(url.pathname);
  if (extension && DIRECT_MEDIA_EXTENSIONS.has(`.${extension}`)) {
    return 'direct';
  }

  return 'generic';
}

export function extractYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.toLowerCase();

  if (hostname === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id ?? null;
  }

  if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
    const fromQuery = url.searchParams.get('v');
    if (fromQuery) {
      return fromQuery;
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const markerIndex = parts.findIndex((part) => ['embed', 'shorts', 'live'].includes(part));
    if (markerIndex >= 0 && parts[markerIndex + 1]) {
      return parts[markerIndex + 1];
    }
  }

  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

export function parseIso8601Duration(value: string): number {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) {
    return 0;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export function detectMediaKind(contentType?: string, extension?: string): MediaKind {
  const normalizedType = contentType?.toLowerCase() ?? '';
  const normalizedExt = extension?.toLowerCase() ?? '';

  if (
    normalizedType.startsWith('video/') ||
    ['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(normalizedExt)
  ) {
    return 'video';
  }

  if (
    normalizedType.startsWith('audio/') ||
    ['mp3', 'wav', 'ogg', 'm4a'].includes(normalizedExt)
  ) {
    return 'audio';
  }

  if (
    normalizedType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(normalizedExt)
  ) {
    return 'image';
  }

  return 'unknown';
}

function stripControlChars(input: string): string {
  let result = '';
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code >= 0x20 && code !== 0x7f) {
      result += input[index];
    }
  }
  return result;
}

export function sanitizeFilename(title: string, extension: string): string {
  const safeTitle = stripControlChars(title)
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  const safeExt = extension.replace(/^\./, '').replace(/[^a-z0-9]/gi, '') || 'bin';
  return `${safeTitle || 'download'}.${safeExt}`;
}

export function buildContentDisposition(filename: string): string {
  const clean = stripControlChars(filename).replace(/["\\]/g, '').trim() || 'download.bin';
  let asciiFallback = '';
  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index);
    asciiFallback += code >= 0x20 && code <= 0x7e ? clean[index] : '_';
  }
  return `attachment; filename="${asciiFallback || 'download.bin'}"; filename*=UTF-8''${encodeURIComponent(clean)}`;
}

export function getExtensionFromPath(pathname: string): string | undefined {
  const lastSegment = pathname.split('/').pop() ?? '';
  const dotIndex = lastSegment.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === lastSegment.length - 1) {
    return undefined;
  }
  return lastSegment.slice(dotIndex + 1).toLowerCase();
}

export function buildResolution(width?: number, height?: number): string | undefined {
  if (width && height) {
    return `${width}x${height}`;
  }
  if (height) {
    return `${height}p`;
  }
  return undefined;
}

export function isValidFormatId(formatId: string): boolean {
  return SAFE_FORMAT_ID_PATTERN.test(formatId);
}
