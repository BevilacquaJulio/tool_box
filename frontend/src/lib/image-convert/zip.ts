import { zipSync } from 'fflate';

export function createUniqueFileName(originalName: string, usedNames: Set<string>): string {
  if (!usedNames.has(originalName)) {
    usedNames.add(originalName);
    return originalName;
  }

  const extension = originalName.includes('.') ? (originalName.split('.').pop() ?? '') : '';
  const baseName = originalName.replace(/\.[^.]+$/, '').trim() || 'imagem';
  let index = 2;

  while (true) {
    const candidate = extension ? `${baseName}-${index}.${extension}` : `${baseName}-${index}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    index += 1;
  }
}

export async function createZipArchive(
  files: Array<{ fileName: string; blob: Blob }>,
): Promise<Blob> {
  const archiveEntries: Record<string, Uint8Array> = {};

  for (const file of files) {
    archiveEntries[file.fileName] = new Uint8Array(await file.blob.arrayBuffer());
  }

  const zipped = zipSync(archiveEntries);
  return new Blob([zipped], { type: 'application/zip' });
}
