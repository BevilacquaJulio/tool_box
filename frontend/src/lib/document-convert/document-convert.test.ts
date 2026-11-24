// @vitest-environment jsdom
import { strToU8, zipSync } from 'fflate';
import mammoth from 'mammoth';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// pdfjs-dist precisa de DOMMatrix/canvas, que o jsdom não tem; a leitura de PDF fica fora deste teste.
vi.mock('./pdf', () => ({
  convertPdfFile: vi.fn(async () => {
    throw new Error('pdfjs indisponível no teste');
  }),
  getPdfPageCount: vi.fn(async () => 1),
}));
import { htmlToBlocks } from './blocks';
import { blocksToDocx } from './docx-writer';
import { convertDocuments } from './index';
import { blocksToPdf, toWinAnsi } from './pdf-writer';
import { odtToHtml, rtfToText } from './rich-text';
import { convertJsonFile, convertXmlFile } from './structured';
import { htmlToPlainText } from './utils';

const SAMPLE_HTML = `
  <h1>Relatório <em>anual</em></h1>
  <p>Texto com <strong>negrito</strong> e <code>codigo()</code>.</p>
  <ul><li>Item A<ul><li>Sub A1</li></ul></li><li>Item B</li></ul>
  <ol><li>Primeiro</li><li>Segundo</li></ol>
  <table><thead><tr><th>Nome</th><th>Valor</th></tr></thead><tbody><tr><td>Café</td><td>10</td></tr></tbody></table>
  <pre>const x = 1;\nconsole.log(x);</pre>
  <blockquote>Citação importante</blockquote>
  <hr />`;

beforeAll(() => {
  URL.createObjectURL ??= () => 'blob:test';
});

describe('htmlToBlocks', () => {
  it('mantém títulos, estilos por trecho, listas aninhadas, tabela, código e citação', () => {
    const blocks = htmlToBlocks(SAMPLE_HTML);
    const types = blocks.map((block) => block.type);

    expect(types).toEqual([
      'heading', 'paragraph', 'list-item', 'list-item', 'list-item', 'list-item', 'list-item',
      'table', 'code', 'paragraph', 'rule',
    ]);
    expect(blocks[0]).toMatchObject({ level: 1, runs: [{ text: 'Relatório ' }, { text: 'anual', italic: true }] });
    expect(blocks[1].type === 'paragraph' && blocks[1].runs.find((run) => run.bold)?.text).toBe('negrito');
    expect(blocks[3]).toMatchObject({ type: 'list-item', depth: 1, runs: [{ text: 'Sub A1' }] });
    expect(blocks[5]).toMatchObject({ type: 'list-item', ordered: true });
    expect(blocks[7]).toMatchObject({ type: 'table', header: true, rows: [['Nome', 'Valor'], ['Café', '10']] });
    expect(blocks[9]).toMatchObject({ type: 'paragraph', quote: true });
  });

  it('gera texto puro com quebra entre parágrafos (antes saía tudo colado)', () => {
    expect(htmlToPlainText('<p>Um</p><p>Dois</p><ul><li>três</li></ul>')).toBe('Um\n\nDois\n\n- três');
  });
});

describe('blocksToDocx', () => {
  it('gera um .docx que o mammoth lê de volta com a mesma estrutura', async () => {
    const docx = blocksToDocx(htmlToBlocks(SAMPLE_HTML), 'Relatório');
    const { value: html } = await mammoth.convertToHtml({ buffer: Buffer.from(docx) });

    expect(html).toContain('<h1>Relatório <em>anual</em></h1>');
    expect(html).toContain('<strong>negrito</strong>');
    expect(html).toMatch(/<ul><li>Item A<ul><li>Sub A1<\/li><\/ul><\/li><li>Item B<\/li><\/ul>/);
    expect(html).toContain('<ol><li>Primeiro</li><li>Segundo</li></ol>');
    expect(html).toContain('<td><p>Café</p></td>');
  });

  it('remove caracteres de controle que deixariam o XML inválido', async () => {
    const docx = blocksToDocx([{ type: 'paragraph', runs: [{ text: 'a\u0001b & <c>' }] }], 't');
    const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(docx) });
    expect(value).toBe('<p>ab &amp; &lt;c&gt;</p>');
  });
});

describe('blocksToPdf', () => {
  it('gera PDF com o texto do documento', async () => {
    const pdf = new Uint8Array(await blocksToPdf(htmlToBlocks(SAMPLE_HTML), 'Relatório'));
    const raw = new TextDecoder('latin1').decode(pdf);

    expect(raw.startsWith('%PDF-')).toBe(true);
    expect(raw).toContain('negrito');
    expect(raw).toContain('Primeiro');
  });

  it('troca caracteres fora do WinAnsi em vez de imprimir lixo', () => {
    expect(toWinAnsi('ação → “ok” 😀')).toBe('ação -> “ok” ?');
    // Regressão: o \n virava "?" e o bloco de código saía numa linha só.
    expect(toWinAnsi('a\nb')).toBe('a\nb');
  });
});

describe('leitores RTF e ODT', () => {
  it('extrai texto de RTF com acentos, unicode e sem tabela de fontes', () => {
    const rtf =
      "{\\rtf1\\ansi{\\fonttbl{\\f0 Arial;}}{\\*\\generator Teste;}\\f0 Caf\\'e9 \\b forte\\b0\\par Linha \\u8212? fim\\par}";
    expect(rtfToText(rtf)).toBe('Café forte\nLinha — fim');
  });

  it('recusa arquivo que não é RTF', () => {
    expect(() => rtfToText('olá')).toThrow(/RTF inválido/);
  });

  it('converte ODT com título, negrito por estilo automático, lista e tabela', async () => {
    const content = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
<office:automatic-styles><style:style style:name="T1" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style></office:automatic-styles>
<office:body><office:text>
<text:h text:outline-level="2">Título</text:h>
<text:p>Um <text:span text:style-name="T1">forte</text:span><text:s text:c="2"/>fim</text:p>
<text:list><text:list-item><text:p>Item</text:p></text:list-item></text:list>
<table:table><table:table-row><table:table-cell><text:p>A1</text:p></table:table-cell></table:table-row></table:table>
</office:text></office:body></office:document-content>`;
    const zip = zipSync({ 'mimetype': strToU8('application/vnd.oasis.opendocument.text'), 'content.xml': strToU8(content) });
    const html = await odtToHtml(new File([zip], 'doc.odt'));

    expect(html).toContain('<h2>Título</h2>');
    expect(html).toContain('<p>Um <strong>forte</strong>  fim</p>');
    expect(html).toContain('<ul><li><p>Item</p></li></ul>');
    expect(html).toContain('<td>A1</td>');
  });
});

describe('conversões estruturadas', () => {
  it('XML com lista de registros vira CSV de verdade (antes era uma linha com [object Object])', async () => {
    const xml = '<?xml version="1.0"?><catalogo><livro><titulo>A</titulo><ano>2020</ano></livro><livro><titulo>B</titulo><ano>2021</ano></livro></catalogo>';
    const [csv] = await convertXmlFile(new File([xml], 'c.xml'), 'csv');
    expect(await csv.blob.text()).toBe('titulo,ano\nA,2020\nB,2021');
  });

  it('XML para JSON não inclui a declaração <?xml?>', async () => {
    const [json] = await convertXmlFile(new File(['<?xml version="1.0"?><a><b>1</b></a>'], 'c.xml'), 'json');
    expect(JSON.parse(await json.blob.text())).toEqual({ a: { b: 1 } });
  });

  it('JSON em array vira XML com uma única raiz e nomes de tag válidos', async () => {
    const [xml] = await convertJsonFile(new File(['[{"Nome Completo":"Ana","1x":2}]'], 'd.json'), 'xml');
    const text = await xml.blob.text();
    expect(text).toContain('<root>');
    expect(text).toContain('<Nome_Completo>Ana</Nome_Completo>');
    expect(text).toContain('<_1x>2</_1x>');
    expect(new DOMParser().parseFromString(text, 'application/xml').getElementsByTagName('parsererror')).toHaveLength(0);
  });

  it('objeto aninhado vira JSON na célula do CSV', async () => {
    const [csv] = await convertJsonFile(new File(['[{"id":1,"meta":{"a":1}}]'], 'd.json'), 'csv');
    expect(await csv.blob.text()).toBe('id,meta\n1,"{""a"":1}"');
  });
});

describe('convertDocuments para PDF e Word', () => {
  it.each([
    ['pdf', 'application/pdf'],
    ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ] as const)('converte Markdown para %s', async (outputFormat, mime) => {
    const file = new File(['# Título\n\nTexto **forte**.\n\n- a\n- b\n'], 'nota.md', { type: 'text/markdown' });
    const result = await convertDocuments({ files: [file], outputFormat });

    expect(result.type).toBe('single');
    expect(result.fileName).toBe(`nota.${outputFormat}`);
    if (result.type === 'single') expect(result.blob.type).toBe(mime);
  });

  it('recusa PDF para PDF', async () => {
    const file = new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });
    await expect(convertDocuments({ files: [file], outputFormat: 'pdf' })).rejects.toThrow(/Nenhum documento/);
  });
});
