import type { RawImageData } from 'libraw-wasm';
import { isRawExtension } from './formats';
import type { ProgressSession } from './progress';

export type RawDecodedImage = {
  source: ImageBitmap;
  width: number;
  height: number;
  cleanup: () => void;
};

function rgbToRgba(imageData: RawImageData): Uint8ClampedArray {
  const { width, height, colors, data } = imageData;
  const pixelCount = width * height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);

  if (colors === 3 && data instanceof Uint8Array) {
    for (let source = 0, target = 0; source < data.length; source += 3, target += 4) {
      rgba[target] = data[source];
      rgba[target + 1] = data[source + 1];
      rgba[target + 2] = data[source + 2];
      rgba[target + 3] = 255;
    }
    return rgba;
  }

  if (colors === 3 && data instanceof Uint16Array) {
    for (let source = 0, target = 0; source < data.length; source += 3, target += 4) {
      rgba[target] = data[source] >> 8;
      rgba[target + 1] = data[source + 1] >> 8;
      rgba[target + 2] = data[source + 2] >> 8;
      rgba[target + 3] = 255;
    }
    return rgba;
  }

  throw new Error('Formato de pixels RAW não suportado para pré-visualização.');
}

async function rawImageDataToBitmap(imageData: RawImageData): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas');
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível processar a imagem RAW');
  }

  const rgba = rgbToRgba(imageData);
  const image = new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, imageData.width, imageData.height);
  context.putImageData(image, 0, 0);

  return createImageBitmap(canvas);
}

export async function decodeRawFile(
  file: File,
  progress?: ProgressSession,
): Promise<RawDecodedImage> {
  if (!isRawExtension(file)) {
    throw new Error('Extensão RAW não reconhecida.');
  }

  progress?.report('loading-decoder', 12);

  const { default: LibRaw } = await import('libraw-wasm');
  const raw = new LibRaw();

  try {
    progress?.report('decoding', 18);
    const buffer = new Uint8Array(await file.arrayBuffer());

    progress?.report('decoding', 28);
    progress?.startCreep(28, 62);

    await raw.open(buffer, {
      useCameraWb: true,
      outputColor: 1,
      outputBps: 8,
    });

    progress?.stopCreep();
    progress?.report('decoding', 55);
    progress?.startCreep(55, 74);

    const imageData = await raw.imageData();
    if (!imageData) {
      throw new Error('Não foi possível extrair os pixels da imagem RAW.');
    }

    progress?.stopCreep();
    progress?.report('decoding', 74);

    const bitmap = await rawImageDataToBitmap(imageData);
    progress?.report('decoding', 80);

    return {
      source: bitmap,
      width: imageData.width,
      height: imageData.height,
      cleanup: () => {
        bitmap.close();
        raw.dispose();
      },
    };
  } catch (error) {
    progress?.stopCreep();
    raw.dispose();
    if (error instanceof Error) {
      throw new Error(`Não foi possível ler este arquivo RAW: ${error.message}`);
    }
    throw new Error('Não foi possível ler este arquivo RAW.');
  }
}
