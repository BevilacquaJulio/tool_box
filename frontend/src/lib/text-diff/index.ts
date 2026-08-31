export { compareTexts, buildExportHtml } from './compare';
export { buildInlineCharDiff } from './inline';
export { highlightLine, resolveLanguage } from './highlight';
export { normalizeTextForCompare, splitLines } from './normalize';
export { renderCharParts, renderFullLineHighlight } from './render';
export {
  DIFF_LANGUAGES,
  TextDiffError,
  type DiffLanguage,
  type DiffOptions,
  type DiffResult,
  type DiffRow,
  type DiffStats,
} from './types';
