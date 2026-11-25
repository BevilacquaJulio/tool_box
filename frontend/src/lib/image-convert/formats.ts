const HEIC_EXTENSIONS = new Set(['heic', 'heif', 'hif']);

const MIME_SUFFIX_TO_FORMAT: Record<string, string> = {
  jpeg: 'jpg',
  'svg+xml': 'svg',
  'x-icon': 'ico',
  'vnd.microsoft.icon': 'ico',
  'x-portable-pixmap': 'ppm',
  'x-portable-graymap': 'pgm',
  'x-portable-bitmap': 'pbm',
  'x-xbitmap': 'xbm',
  'x-xpixmap': 'xpm',
  heic: 'heic',
  heif: 'heif',
  'x-canon-cr2': 'cr2',
  'x-nikon-nef': 'nef',
  arw: 'arw',
};

const RAW_EXTENSIONS = new Set([
  '3fr',
  'arw',
  'cr2',
  'cr3',
  'crw',
  'dcr',
  'dng',
  'erf',
  'fff',
  'iiq',
  'k25',
  'kdc',
  'mef',
  'mos',
  'mrw',
  'nef',
  'nrw',
  'orf',
  'pef',
  'ptx',
  'raf',
  'raw',
  'rwl',
  'rw2',
  'rwz',
  'sr2',
  'srf',
  'srw',
  'x3f',
]);

const STANDARD_IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'jfif',
  'pjpeg',
  'pjp',
  'webp',
  'avif',
  'bmp',
  'gif',
  'svg',
  'ico',
  'tif',
  'tiff',
]);

function getExtension(file: File): string | undefined {
  const dotIndex = file.name.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === file.name.length - 1) {
    return undefined;
  }
  return file.name.slice(dotIndex + 1).toLowerCase();
}

export function isHeicExtension(file: File): boolean {
  const extension = getExtension(file);
  if (extension && HEIC_EXTENSIONS.has(extension)) {
    return true;
  }

  const mime = file.type.toLowerCase();
  return mime === 'image/heic' || mime === 'image/heif';
}

export function isRawExtension(file: File): boolean {
  const extension = getExtension(file);
  return extension ? RAW_EXTENSIONS.has(extension) : false;
}

export function isSupportedImage(file: File): boolean {
  if (isHeicExtension(file) || isRawExtension(file)) {
    return true;
  }

  const extension = getExtension(file);
  if (extension && STANDARD_IMAGE_EXTENSIONS.has(extension)) {
    return true;
  }

  return file.type.toLowerCase().startsWith('image/');
}

export function detectImageFormat(file: File): string {
  const extension = getExtension(file);
  if (extension) {
    return extension === 'jpeg' ? 'jpg' : extension;
  }

  if (file.type.startsWith('image/')) {
    const suffix = file.type.slice('image/'.length).toLowerCase();
    return MIME_SUFFIX_TO_FORMAT[suffix] ?? suffix.replace(/\+.+$/, '');
  }

  return 'desconhecido';
}

export function getDecodeHint(file: File): string {
  if (isRawExtension(file)) {
    return 'Decodificando RAW... arquivos grandes podem levar alguns segundos.';
  }

  if (isHeicExtension(file)) {
    return 'Decodificando HEIC/HEIF...';
  }

  return 'Carregando pré-visualização...';
}

export const IMAGE_FILE_ACCEPT = [
  'image/*',
  ...Array.from(HEIC_EXTENSIONS, (ext) => `.${ext}`),
  ...Array.from(RAW_EXTENSIONS, (ext) => `.${ext}`),
].join(',');
