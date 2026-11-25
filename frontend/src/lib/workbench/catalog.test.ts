import { describe, expect, it } from 'vitest';
import { tools } from '../../config/tools';
import {
  filterCatalogTools,
  matchesToolQuery,
  normalizeSearchText,
  pushRecentToolId,
} from './catalog';

describe('workbench catalog helpers', () => {
  it('normaliza acentos e caixa alta para busca em pt-BR', () => {
    expect(normalizeSearchText('Verificação de Segurança')).toBe('verificacao de seguranca');
  });

  it('encontra ferramentas por nome sem acento e por tags técnicas', () => {
    const dbTool = tools.find((tool) => tool.id === 'db-verify')!;
    const qrTool = tools.find((tool) => tool.id === 'qrcode')!;

    expect(matchesToolQuery(dbTool, 'verificacao')).toBe(true);
    expect(matchesToolQuery(dbTool, 'mariadb')).toBe(true);
    expect(matchesToolQuery(qrTool, 'PIX')).toBe(true);
    expect(matchesToolQuery(qrTool, 'argon2')).toBe(false);
  });

  it('prioriza ferramentas fixadas no modo Todas sem busca ativa', () => {
    const ordered = filterCatalogTools(tools, {
      query: '',
      category: 'all',
      pinnedIds: ['colors', 'qrcode'],
    });

    expect(ordered.slice(0, 2).map((item) => item.id)).toEqual(['qrcode', 'colors']);
  });

  it('filtra apenas fixadas ou categoria específica', () => {
    const pinnedOnly = filterCatalogTools(tools, {
      query: '',
      category: 'pinned',
      pinnedIds: ['jwt'],
    });
    expect(pinnedOnly.map((item) => item.id)).toEqual(['jwt']);

    const securityOnly = filterCatalogTools(tools, {
      query: '',
      category: 'Segurança',
      pinnedIds: [],
    });
    expect(securityOnly.every((item) => item.category === 'Segurança')).toBe(true);
  });

  it('mantém histórico recente sem duplicatas e limitado a 4 itens', () => {
    let recent: string[] = [];
    for (const id of ['hash', 'jwt', 'json', 'diff', 'jwt', 'colors']) {
      recent = pushRecentToolId(recent, id);
    }

    expect(recent).toEqual(['colors', 'jwt', 'diff', 'json']);
  });

  it('garante atalhos numéricos e caminhos únicos em todas as ferramentas', () => {
    const shortcuts = tools.map((tool) => tool.shortcutNumber);
    const paths = tools.map((tool) => tool.path);

    expect(new Set(shortcuts).size).toBe(tools.length);
    expect(new Set(paths).size).toBe(tools.length);
  });
});
