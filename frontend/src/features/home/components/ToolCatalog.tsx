import { MagnifyingGlass } from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { ToolCard } from '../../../components/ToolCard';
import { tools } from '../../../config/tools';

function normalize(value: string) {
  return value
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function ToolCatalog() {
  const [query, setQuery] = useState('');

  const filteredTools = useMemo(() => {
    const term = normalize(query.trim());
    if (!term) {
      return tools;
    }

    return tools.filter((tool) =>
      normalize([tool.title, tool.shortDescription, tool.category, ...tool.tags].join(' ')).includes(
        term,
      ),
    );
  }, [query]);

  return (
    <section className="tool-catalog" aria-label="Ferramentas">
      <div className="tool-catalog__search-wrap">
        <label className="tool-search tool-search--hero">
          <span className="sr-only">Buscar ferramenta</span>
          <MagnifyingGlass size={22} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar ferramenta..."
            autoFocus
          />
        </label>
      </div>

      {filteredTools.length > 0 ? (
        <ul className="tool-catalog__grid" aria-live="polite">
          {filteredTools.map((tool, index) => (
            <li key={tool.id}>
              <ToolCard tool={tool} position={index} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="tool-catalog__empty" role="status">
          <MagnifyingGlass size={28} aria-hidden="true" />
          <h3>Nenhuma ferramenta encontrada</h3>
          <p>Tente buscar pelo formato, ação ou tipo de arquivo.</p>
        </div>
      )}
    </section>
  );
}
