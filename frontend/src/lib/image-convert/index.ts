import { canvasToBmp } from './bmp';
import { detectImageFormat, isHeicExtension, isRawExtension } from './formats';
import { canDecodeHeic, decodeHeicFile } from './heic';
import { createProgressSession, type ImageProgressReporter, type ProgressSession } from './progress';
import { decodeRawFile } from './raw';
import { createUniqueFileName, createZipArchive } from './zip';
import {
  MAX_EXPORT_QUALITY,
  OUTPUT_FORMATS,
  type ConvertImageInput,
  type ConvertImageResult,
  type ConvertImagesInput,
  type ConvertImagesResult,
  type ImageFilePreview,
  type InspectImageOptions,
  type OutputFormat,
} from './types';

type DecodedImageSource = HTMLImageElement | ImageBitmap;

type DecodedImage = {
  source: DecodedImageSource;
  width: number;
  height: number;
  cleanup: () => void;
  decodedViaWasm: boolean;
};

async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = 'async';
  image.src = url;

  if (typeof image.decode === 'function') {
    await image.decode();
    return image;
  }

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível ler a imagem'));
  });
}

async function decodeWithBrowser(file: File, progress?: ProgressSession): Promise<DecodedImage> {
  progress?.report('decoding', 25);
  progress?.startCreep(25, 78);

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, {
        colorSpaceConversion: 'none',
        premultiplyAlpha: 'none',
        resizeQuality: 'high',
      });

      progress?.stopCreep();
      progress?.report('decoding', 80);

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
        decodedViaWasm: false,
      };
    } catch {
      // fallback para Image()
    }
  }

  const url = URL.createObjectURL(file);

  try {
    const image = await loadImageFromUrl(url);

    if (image.naturalWidth === 0 || image.naturalHeight === 0) {
      throw new Error('Não foi possível ler as dimensões da imagem');
    }

    progress?.stopCreep();
    progress?.report('decoding', 80);

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
      decodedViaWasm: false,
    };
  } catch {
    progress?.stopCreep();
    URL.revokeObjectURL(url);
    throw new Error('Não foi possível ler a imagem com o decodificador nativo do navegador.');
  }
}

async function createPreviewUrl(decoded: DecodedImage, progress?: ProgressSession): Promise<string> {
  progress?.report('preview', 90);

  const canvas = document.createElement('canvas');
  canvas.width = decoded.width;
  canvas.height = decoded.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Não foi possível gerar a pré-visualização');
  }

  context.drawImage(decoded.source, 0, 0, decoded.width, decoded.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (!nextBlob) {
          reject(new Error('Não foi possível gerar a pré-visualização'));
          return;
        }
        resolve(nextBlob);
      },
      'image/png',
    );
  });

  progress?.report('preview', 96);
  return URL.createObjectURL(blob);
}

async function decodeImageFile(file: File, progress?: ProgressSession): Promise<DecodedImage> {
  progress?.report('validating', 5);
  assertReadableFile(file);

  if (isRawExtension(file)) {
    const decoded = await decodeRawFile(file, progress);
    return { ...decoded, decodedViaWasm: true };
  }

  if (isHeicExtension(file)) {
    const decoded = await decodeHeicFile(file, progress);
    return { ...decoded, decodedViaWasm: true };
  }

  try {
    return await decodeWithBrowser(file, progress);
  } catch {
    progress?.report('loading-decoder', 12);

    if (await canDecodeHeic(file)) {
      const decoded = await decodeHeicFile(file, progress);
      return { ...decoded, decodedViaWasm: true };
    }

    throw new Error(
      'Este formato não pode ser lido aqui. Formatos comuns (PNG, JPG, WebP), além de HEIC/HEIF e RAW (ARW, CR2, NEF, DNG...), são suportados.',
    );
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`A conversão para ${mimeType} não é suportada neste navegador`));
          return;
        }
        resolve(blob);
      },
      mimeType,
      MAX_EXPORT_QUALITY,
    );
  });
}

function getOutputMeta(format: OutputFormat) {
  const meta = OUTPUT_FORMATS.find((item) => item.value === format);
  if (!meta) {
    throw new Error('Formato de saída inválido');
  }
  return meta;
}

function buildFileName(originalName: string, extension: string): string {
  const baseName = originalName.replace(/\.[^.]+$/, '').trim() || 'imagem';
  return `${baseName}.${extension}`;
}

function createBatchProgressReporter(
  reporter: ImageProgressReporter | undefined,
  fileIndex: number,
  totalFiles: number,
): ImageProgressReporter {
  return (update) => {
    const sliceSize = 100 / totalFiles;
    const base = fileIndex * sliceSize;
    const value = base + (update.value / 100) * sliceSize;

    reporter?.({
      ...update,
      value,
      label:
        totalFiles > 1
          ? `Arquivo ${fileIndex + 1} de ${totalFiles}: ${update.label}`
          : update.label,
    });
  };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function assertReadableFile(file: File) {
  if (!file || file.size === 0) {
    throw new Error('Selecione um arquivo de imagem válido');
  }
}

export async function inspectImageFile(
  file: File,
  options?: InspectImageOptions,
): Promise<ImageFilePreview> {
  const progress = createProgressSession(options?.onProgress);

  try {
    const decoded = await decodeImageFile(file, progress);
    const url = decoded.decodedViaWasm
      ? await createPreviewUrl(decoded, progress)
      : URL.createObjectURL(file);

    decoded.cleanup();
    progress.complete();

    return {
      file,
      url,
      format: detectImageFormat(file),
      mimeType: file.type || 'application/octet-stream',
      fileSize: file.size,
      width: decoded.width,
      height: decoded.height,
    };
  } catch (error) {
    progress.dispose();
    throw error;
  }
}

export async function convertImage(input: ConvertImageInput): Promise<ConvertImageResult> {
  const progress = createProgressSession(input.onProgress);
  let decoded: DecodedImage | null = null;

  try {
    decoded = await decodeImageFile(input.file, progress);

    progress.report('rendering', 72);

    const canvas = document.createElement('canvas');
    canvas.width = decoded.width;
    canvas.height = decoded.height;

    const context = canvas.getContext('2d', { alpha: true });
    if (!context) {
      throw new Error('Não foi possível processar a imagem');
    }

    context.imageSmoothingEnabled = false;

    if (input.outputFormat === 'jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(decoded.source, 0, 0, decoded.width, decoded.height);

    progress.report('encoding', 88);

    const output = getOutputMeta(input.outputFormat);
    const blob =
      input.outputFormat === 'bmp'
        ? canvasToBmp(canvas)
        : await canvasToBlob(canvas, output.mime);

    progress.complete();

    return {
      blob,
      url: URL.createObjectURL(blob),
      fileName: buildFileName(input.file.name, output.extension),
      width: canvas.width,
      height: canvas.height,
      size: blob.size,
      format: input.outputFormat,
    };
  } catch (error) {
    progress.dispose();
    throw error;
  } finally {
    decoded?.cleanup();
  }
}

export async function convertImages(input: ConvertImagesInput): Promise<ConvertImagesResult> {
  const { files, outputFormat, onProgress } = input;

  if (files.length === 0) {
    throw new Error('Selecione ao menos um arquivo de imagem');
  }

  if (files.length === 1) {
    const result = await convertImage({
      file: files[0],
      outputFormat,
      onProgress,
    });

    return {
      type: 'single',
      ...result,
    };
  }

  const convertedFiles: Array<{ fileName: string; blob: Blob; size: number }> = [];
  const failedFiles: Extract<ConvertImagesResult, { type: 'batch' }>['failed'] = [];
  const usedNames = new Set<string>();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const fileReporter = createBatchProgressReporter(onProgress, index, files.length);

    try {
      const converted = await convertImage({
        file,
        outputFormat,
        onProgress: fileReporter,
      });

      URL.revokeObjectURL(converted.url);

      convertedFiles.push({
        fileName: createUniqueFileName(converted.fileName, usedNames),
        blob: converted.blob,
        size: converted.size,
      });
    } catch (error) {
      failedFiles.push({
        fileName: file.name,
        error: error instanceof Error ? error.message : 'Falha ao converter o arquivo',
      });
    }
  }

  if (convertedFiles.length === 0) {
    throw new Error('Nenhum arquivo foi convertido. Verifique os formatos selecionados.');
  }

  onProgress?.({
    stage: 'encoding',
    value: 96,
    label: 'Compactando arquivos em ZIP...',
  });

  const zipBlob = await createZipArchive(convertedFiles);
  const zipUrl = URL.createObjectURL(zipBlob);

  onProgress?.({
    stage: 'done',
    value: 100,
    label: 'Concluído',
  });

  return {
    type: 'batch',
    url: zipUrl,
    fileName: `imagens-convertidas-${outputFormat}.zip`,
    size: zipBlob.size,
    format: outputFormat,
    successCount: convertedFiles.length,
    failed: failedFiles,
    items: convertedFiles.map((file) => ({
      fileName: file.fileName,
      size: file.size,
    })),
  };
}

export {
  MAX_EXPORT_QUALITY,
  OUTPUT_FORMATS,
  OUTPUT_FORMAT_VALUES,
} from './types';
export { createImageFileEntries, createImageFileEntry } from './entries';
export { detectImageFormat, getDecodeHint, IMAGE_FILE_ACCEPT } from './formats';
export type { ImageFileEntry } from './entries';
export type {
  ConvertImageInput,
  ConvertImageResult,
  ConvertImagesInput,
  ConvertImagesResult,
  ImageFilePreview,
  ImageProgressReporter,
  ImageProgressUpdate,
  InspectImageOptions,
  OutputFormat,
} from './types';
export type { ImageProgressStage } from './progress';
