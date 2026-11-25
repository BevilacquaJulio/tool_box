import { DOCUMENT_FILE_ACCEPT, isSupportedDocument } from '../document-convert/formats';
import { IMAGE_FILE_ACCEPT, isSupportedImage } from '../image-convert/formats';

export type FileConvertCategory = 'images' | 'documents';

export type ConverterIntakePlan =
  | { status: 'empty' }
  | { status: 'route'; mode: FileConvertCategory; files: File[] }
  | { status: 'mixed'; imageCount: number; documentCount: number; error: string }
  | { status: 'unsupported'; unsupportedNames: string[]; error: string };

export const ALL_CONVERTER_FILE_ACCEPT = `${IMAGE_FILE_ACCEPT},${DOCUMENT_FILE_ACCEPT}`;

function isLegacyDocFile(file: File): boolean {
  return /\.doc$/i.test(file.name);
}

export function classifyConverterFile(file: File): FileConvertCategory | 'unsupported' {
  if (isSupportedDocument(file)) {
    return 'documents';
  }
  if (isSupportedImage(file)) {
    return 'images';
  }
  return 'unsupported';
}

export function planConverterIntake(files: File[]): ConverterIntakePlan {
  if (files.length === 0) {
    return { status: 'empty' };
  }

  const images: File[] = [];
  const documents: File[] = [];
  const unsupported: File[] = [];

  for (const file of files) {
    const category = classifyConverterFile(file);
    if (category === 'images') {
      images.push(file);
    } else if (category === 'documents') {
      documents.push(file);
    } else {
      unsupported.push(file);
    }
  }

  if (unsupported.length > 0) {
    const first = unsupported[0];
    const error = isLegacyDocFile(first)
      ? `"${first.name}" (Word antigo .doc) não é suportado no navegador. Salve como .docx ou PDF e tente novamente.`
      : `"${first.name}" não é suportado. Envie imagens (PNG, JPG, WebP, AVIF, BMP, GIF, SVG, HEIC, RAW) ou documentos (PDF, DOCX, ODT, RTF, TXT, MD, HTML, XLSX, XLS, ODS, CSV, TSV, JSON, XML).`;

    return {
      status: 'unsupported',
      unsupportedNames: unsupported.map((file) => file.name),
      error,
    };
  }

  if (images.length > 0 && documents.length > 0) {
    return {
      status: 'mixed',
      imageCount: images.length,
      documentCount: documents.length,
      error:
        'Não é possível misturar imagens e documentos no mesmo lote. Envie apenas imagens ou apenas documentos por vez.',
    };
  }

  if (documents.length > 0) {
    return {
      status: 'route',
      mode: 'documents',
      files: documents,
    };
  }

  return {
    status: 'route',
    mode: 'images',
    files: images,
  };
}

export function isFileDragEvent(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }

  return Array.from(dataTransfer.types ?? []).includes('Files');
}
