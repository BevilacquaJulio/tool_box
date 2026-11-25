// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { detectDocumentKind, isSupportedDocument } from '../document-convert/formats';
import { isSupportedImage } from '../image-convert/formats';
import {
  ALL_CONVERTER_FILE_ACCEPT,
  classifyConverterFile,
  isFileDragEvent,
  planConverterIntake,
} from './intake';

function makeFile(name: string, type = '', content = 'conteudo'): File {
  return new File([content], name, { type });
}

describe('detecção de formatos suportados', () => {
  it('reconhece PDF por extensão (minúscula ou maiúscula) e por MIME mesmo sem extensão', () => {
    expect(detectDocumentKind(makeFile('contrato.pdf'))).toBe('pdf');
    expect(detectDocumentKind(makeFile('CONTRATO.PDF'))).toBe('pdf');
    expect(detectDocumentKind(makeFile('sem-extensao', 'application/pdf'))).toBe('pdf');
    expect(detectDocumentKind(makeFile('sem-extensao', 'application/x-pdf'))).toBe('pdf');
    expect(isSupportedDocument(makeFile('contrato.pdf'))).toBe(true);
  });

  it('não confunde nome de arquivo sem extensão com extensão válida', () => {
    expect(detectDocumentKind(makeFile('pdf'))).toBe('unknown');
    expect(detectDocumentKind(makeFile('json'))).toBe('unknown');
    expect(isSupportedImage(makeFile('png'))).toBe(false);
  });

  it('reconhece planilhas legadas e TSV além dos formatos já suportados', () => {
    expect(detectDocumentKind(makeFile('planilha.xls'))).toBe('xlsx');
    expect(detectDocumentKind(makeFile('planilha.xlsm'))).toBe('xlsx');
    expect(detectDocumentKind(makeFile('planilha.ods'))).toBe('xlsx');
    expect(detectDocumentKind(makeFile('dados.tsv'))).toBe('csv');
    expect(detectDocumentKind(makeFile('dados', 'text/tab-separated-values'))).toBe('csv');
  });

  it('reconhece imagens comuns, SVG, HEIC e câmeras RAW sem confundir com documentos', () => {
    expect(isSupportedImage(makeFile('foto.png', 'image/png'))).toBe(true);
    expect(isSupportedImage(makeFile('foto.JPG'))).toBe(true);
    expect(isSupportedImage(makeFile('vetor.svg', 'image/svg+xml'))).toBe(true);
    expect(isSupportedImage(makeFile('iphone.HEIC'))).toBe(true);
    expect(isSupportedImage(makeFile('camera.CR2'))).toBe(true);
    expect(isSupportedImage(makeFile('camera.dng'))).toBe(true);
    expect(isSupportedImage(makeFile('contrato.pdf', 'application/pdf'))).toBe(false);
    expect(isSupportedImage(makeFile('relatorio.docx'))).toBe(false);
  });
});

describe('classifyConverterFile e planConverterIntake', () => {
  it('direciona PDF e demais documentos para o modo documents', () => {
    const pdf = makeFile('relatorio.pdf', 'application/pdf');
    const docx = makeFile('texto.docx');
    const xlsx = makeFile('tabela.xlsx');

    expect(classifyConverterFile(pdf)).toBe('documents');
    expect(classifyConverterFile(docx)).toBe('documents');
    expect(classifyConverterFile(xlsx)).toBe('documents');

    expect(planConverterIntake([pdf])).toEqual({
      status: 'route',
      mode: 'documents',
      files: [pdf],
    });
    expect(planConverterIntake([pdf, docx, xlsx])).toEqual({
      status: 'route',
      mode: 'documents',
      files: [pdf, docx, xlsx],
    });
  });

  it('direciona imagens (incluindo SVG, HEIC e RAW) para o modo images', () => {
    const png = makeFile('banner.png', 'image/png');
    const svg = makeFile('icone.svg', 'image/svg+xml');
    const raw = makeFile('ensaio.NEF');

    expect(classifyConverterFile(png)).toBe('images');
    expect(classifyConverterFile(svg)).toBe('images');
    expect(classifyConverterFile(raw)).toBe('images');

    expect(planConverterIntake([png, svg, raw])).toEqual({
      status: 'route',
      mode: 'images',
      files: [png, svg, raw],
    });
  });

  it('retorna mixed quando o lote combina imagens e documentos juntos', () => {
    const png = makeFile('banner.png', 'image/png');
    const pdf = makeFile('relatorio.pdf', 'application/pdf');

    const plan = planConverterIntake([png, pdf]);
    expect(plan.status).toBe('mixed');
    if (plan.status === 'mixed') {
      expect(plan.imageCount).toBe(1);
      expect(plan.documentCount).toBe(1);
      expect(plan.error).toMatch(/misturar imagens e documentos/i);
    }
  });

  it('retorna unsupported com orientação clara para .doc antigo e formatos não suportados', () => {
    const legacyDoc = makeFile('antigo.doc');
    const legacyPlan = planConverterIntake([legacyDoc]);
    expect(legacyPlan.status).toBe('unsupported');
    if (legacyPlan.status === 'unsupported') {
      expect(legacyPlan.error).toMatch(/\.docx/i);
    }

    const video = makeFile('clip.mp4', 'video/mp4');
    const videoPlan = planConverterIntake([video]);
    expect(videoPlan.status).toBe('unsupported');
    if (videoPlan.status === 'unsupported') {
      expect(videoPlan.unsupportedNames).toEqual(['clip.mp4']);
      expect(videoPlan.error).toContain('clip.mp4');
    }
  });

  it('retorna empty quando não há arquivos', () => {
    expect(planConverterIntake([])).toEqual({ status: 'empty' });
  });

  it('expõe ALL_CONVERTER_FILE_ACCEPT cobrindo PDF, documentos e imagens', () => {
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('.pdf');
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('application/pdf');
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('.docx');
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('.xlsx');
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('.xls');
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('image/*');
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('.heic');
    expect(ALL_CONVERTER_FILE_ACCEPT).toContain('.cr2');
  });

  it('identifica corretamente se um evento drag carrega arquivos ou apenas texto', () => {
    expect(isFileDragEvent({ types: ['Files'] } as unknown as DataTransfer)).toBe(true);
    expect(isFileDragEvent({ types: ['text/plain', 'text/html'] } as unknown as DataTransfer)).toBe(
      false,
    );
    expect(isFileDragEvent(null)).toBe(false);
  });
});
