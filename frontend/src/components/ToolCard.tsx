import { ArrowUpRight, CloudArrowDown, ShieldCheck } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import type { ToolDefinition } from '../config/tools';

type ToolCardProps = {
  tool: ToolDefinition;
  position?: number;
};

export function ToolCard({ tool, position = 0 }: ToolCardProps) {
  const Icon = tool.icon;
  const local = tool.processing === 'local';

  const content = (
    <>
      <div className="tool-card__topline">
        <span className="tool-card__icon">
          <Icon size={23} weight="duotone" aria-hidden="true" />
        </span>
        <span className="tool-card__category">{tool.category}</span>
        {!tool.available && (
          <span className="tool-card__availability">
            Em breve
          </span>
        )}
      </div>

      <div className="tool-card__copy">
        <h3>{tool.title}</h3>
        <p>{tool.shortDescription}</p>
      </div>

      <div className="tool-card__footer">
        <span className="tool-card__processing">
          {local ? (
            <ShieldCheck size={15} aria-hidden="true" />
          ) : (
            <CloudArrowDown size={15} aria-hidden="true" />
          )}
          {local ? 'Local' : 'Híbrida'}
        </span>
        {tool.available && <ArrowUpRight size={19} aria-hidden="true" />}
      </div>
    </>
  );

  const baseClassName = 'tool-card focus-ring';

  if (!tool.available) {
    return (
      <article
        aria-disabled="true"
        className={`${baseClassName} opacity-60`}
        data-position={position % 4}
      >
        {content}
      </article>
    );
  }

  return (
    <Link
      to={tool.path}
      className={baseClassName}
      data-position={position % 4}
    >
      {content}
    </Link>
  );
}
