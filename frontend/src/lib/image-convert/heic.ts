import { isHeicExtension } from './formats';
import type { ProgressSession } from './progress';

export type HeicDecodedImage = {
  source: ImageBitmap;
  width: number;
  height: number;
  cleanup: () => void;
};

export async function canDecodeHeic(file: File): Promise<boolean> {
  if (isHeicExtension(file)) {
    return true;
  }

  const { isHeic } = await import('heic-to');
  return isHeic(file);
}

export async function decodeHeicFile(
  file: File,
  progress?: ProgressSession,
): Promise<HeicDecodedImage> {
  progress?.report('loading-decoder', 12);

  const { heicTo, isHeic } = await import('heic-to');

  if (!(isHeicExtension(file) || (await isHeic(file)))) {
    throw new Error('Arquivo HEIC/HEIF inválido ou corrompido.');
  }

  progress?.report('decoding', 20);
  progress?.startCreep(20, 78);

  const bitmap = await heicTo({
    blob: file,
    type: 'bitmap',
  });

  progress?.stopCreep();
  progress?.report('decoding', 80);

  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    cleanup: () => bitmap.close(),
  };
}
