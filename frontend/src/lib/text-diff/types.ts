export type DiffLineType = 'unchanged' | 'added' | 'removed' | 'modified';

export type DiffRow = {
  type: DiffLineType;
  leftLineNumber: number | null;
  rightLineNumber: number | null;
  leftText: string | null;
  rightText: string | null;
  leftHtml?: string;
  rightHtml?: string;
};

export type DiffOptions = {
  ignoreWhitespace: boolean;
  ignoreLineBreaks: boolean;
  ignoreCase: boolean;
};

export type DiffLanguage =
  | 'auto'
  | 'plaintext'
  | 'javascript'
  | 'typescript'
  | 'json'
  | 'python'
  | 'html'
  | 'css'
  | 'sql'
  | 'bash'
  | 'xml'
  | 'yaml';

export type DiffStats = {
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
};

export type DiffResult = {
  rows: DiffRow[];
  stats: DiffStats;
  unified: string;
  html: string;
  identical: boolean;
};

export const DIFF_LANGUAGES: Array<{ value: DiffLanguage; label: string }> = [
  { value: 'auto', label: 'Detectar automaticamente' },
  { value: 'plaintext', label: 'Texto simples' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash / Shell' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
];

export class TextDiffError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TextDiffError';
  }
}
