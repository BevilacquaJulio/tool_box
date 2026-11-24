import { strToU8, zipSync } from 'fflate';
import type { DocBlock, DocRun } from './blocks';

// Gerador mínimo de .docx (OOXML) sem dependência extra: estilos de título, listas, tabelas, código e citação.

const W_NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

function xml(text: string): string {
  return text
    // Caracteres de controle tornam o XML inválido e o Word recusa abrir o arquivo.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function runXml(run: DocRun): string {
  const props = [
    run.bold ? '<w:b/>' : '',
    run.italic ? '<w:i/>' : '',
    run.underline ? '<w:u w:val="single"/>' : '',
    run.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>' : '',
  ].join('');
  const rPr = props ? `<w:rPr>${props}</w:rPr>` : '';
  const parts = run.text.split('\n').map((part) => `<w:t xml:space="preserve">${xml(part)}</w:t>`);
  return `<w:r>${rPr}${parts.join('<w:br/>')}</w:r>`;
}

function paragraph(runs: DocRun[], pPr = ''): string {
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${runs.map(runXml).join('')}</w:p>`;
}

function tableXml(rows: string[][], header: boolean): string {
  const columns = Math.max(...rows.map((row) => row.length));
  const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="A1A1AA"/>`;
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('');
  const grid = Array.from({ length: columns }, () => '<w:gridCol/>').join('');

  const body = rows
    .map((row, rowIndex) => {
      const isHeader = header && rowIndex === 0;
      const cells = Array.from({ length: columns }, (_, i) => {
        const shading = isHeader ? '<w:shd w:val="clear" w:color="auto" w:fill="F4F4F5"/>' : '';
        return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/>${shading}</w:tcPr>${paragraph([{ text: row[i] ?? '', bold: isHeader }])}</w:tc>`;
      }).join('');
      return `<w:tr>${isHeader ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${cells}</w:tr>`;
    })
    .join('');

  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`;
}

function blocksXml(blocks: DocBlock[], orderedLists: Map<number, number>): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'heading':
          return paragraph(block.runs, `<w:pStyle w:val="Heading${block.level}"/>`);
        case 'paragraph':
          return paragraph(block.runs, block.quote ? '<w:pStyle w:val="Quote"/>' : '');
        case 'list-item': {
          const numId = block.ordered ? orderedLists.get(block.listId)! : 1;
          return paragraph(
            block.runs,
            `<w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="${block.depth}"/><w:numId w:val="${numId}"/></w:numPr>`,
          );
        }
        case 'code':
          return block.text
            .split('\n')
            .map((line) => paragraph([{ text: line, code: true }], '<w:pStyle w:val="Code"/>'))
            .join('');
        case 'table':
          // Parágrafo vazio após a tabela evita duas tabelas seguidas se fundirem no Word.
          return `${tableXml(block.rows, block.header)}<w:p/>`;
        case 'rule':
          return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="A1A1AA"/></w:pBdr></w:pPr></w:p>';
      }
    })
    .join('');
}

function headingStyle(level: number): string {
  const sizes = [0, 40, 32, 28, 24, 22, 22];
  return `<w:style w:type="paragraph" w:styleId="Heading${level}"><w:name w:val="heading ${level}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${level <= 2 ? 360 : 240}" w:after="120"/><w:outlineLvl w:val="${level - 1}"/></w:pPr><w:rPr><w:b/><w:sz w:val="${sizes[level]}"/></w:rPr></w:style>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W_NS}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:lang w:val="pt-BR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${[1, 2, 3, 4, 5, 6].map(headingStyle).join('')}<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="A1A1AA"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="52525B"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:shd w:val="clear" w:color="auto" w:fill="F4F4F5"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="60"/><w:contextualSpacing/></w:pPr></w:style></w:styles>`;

function numberingXml(orderedNumIds: number[]): string {
  const levels = (ordered: boolean) =>
    Array.from({ length: 9 }, (_, lvl) => {
      const fmt = ordered ? 'decimal' : 'bullet';
      const text = ordered ? `%${lvl + 1}.` : ['•', '◦', '▪'][lvl % 3];
      const font = ordered ? '' : '<w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr>';
      return `<w:lvl w:ilvl="${lvl}"><w:start w:val="1"/><w:numFmt w:val="${fmt}"/><w:lvlText w:val="${text}"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="${720 * (lvl + 1)}" w:hanging="360"/></w:pPr>${font}</w:lvl>`;
    }).join('');

  // numId 1 = marcadores; cada lista numerada ganha um numId próprio para recomeçar em 1.
  const ordered = orderedNumIds
    .map((numId) => `<w:num w:numId="${numId}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`)
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${W_NS}><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels(false)}</w:abstractNum><w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>${levels(true)}</w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>${ordered}</w:numbering>`;
}

export function blocksToDocx(blocks: DocBlock[], title: string): Uint8Array {
  const orderedLists = new Map<number, number>();
  for (const block of blocks) {
    if (block.type === 'list-item' && block.ordered && !orderedLists.has(block.listId)) {
      orderedLists.set(block.listId, orderedLists.size + 2);
    }
  }

  const body = blocksXml(blocks, orderedLists) || '<w:p/>';
  // A4 com margens de 2,5 cm (medidas em twips).
  const sectPr =
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1418" w:right="1418" w:bottom="1418" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>';

  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(title)}</dc:title></cp:coreProperties>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>`,
    'word/styles.xml': STYLES,
    'word/numbering.xml': numberingXml([...orderedLists.values()]),
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W_NS}><w:body>${body}${sectPr}</w:body></w:document>`,
  };

  return zipSync(Object.fromEntries(Object.entries(files).map(([name, content]) => [name, strToU8(content)])));
}
