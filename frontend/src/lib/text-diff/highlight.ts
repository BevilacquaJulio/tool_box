import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import type { DiffLanguage } from './types';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('python', python);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('css', css);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('yaml', yaml);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function detectLanguage(text: string): Exclude<DiffLanguage, 'auto'> {
  const trimmed = text.trim();

  if (!trimmed) {
    return 'plaintext';
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // continua a deteccao
    }
  }

  if (trimmed.startsWith('<!DOCTYPE html') || trimmed.startsWith('<html')) {
    return 'html';
  }

  if (trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.includes('</'))) {
    return 'xml';
  }

  if (/^(import|export|const|let|function|class)\s/m.test(trimmed)) {
    return trimmed.includes(': ') || trimmed.includes('interface ') ? 'typescript' : 'javascript';
  }

  if (/^(def |class |import |from )/m.test(trimmed)) {
    return 'python';
  }

  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE)\s/i.test(trimmed)) {
    return 'sql';
  }

  if (/^[\w-]+:\s/m.test(trimmed) && !trimmed.includes('{')) {
    return 'yaml';
  }

  return 'plaintext';
}

export function resolveLanguage(language: DiffLanguage, sampleText: string): Exclude<DiffLanguage, 'auto'> {
  if (language !== 'auto') {
    return language;
  }

  return detectLanguage(sampleText);
}

export function highlightLine(text: string, language: Exclude<DiffLanguage, 'auto'>): string {
  if (!text) {
    return '&nbsp;';
  }

  if (language === 'plaintext') {
    return escapeHtml(text);
  }

  try {
    return hljs.highlight(text, { language }).value;
  } catch {
    return escapeHtml(text);
  }
}
