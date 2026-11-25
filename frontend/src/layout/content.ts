/** Largura e padding compartilhados no console principal. */
export const APP_CONTENT_CLASS = 'mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8';

export const APP_MAIN_CLASS = `${APP_CONTENT_CLASS} flex-1 py-5 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-6 lg:py-7`;

export const APP_HEADER_INNER_CLASS = `${APP_CONTENT_CLASS} flex h-full items-center justify-between gap-3`;

/** Grid interno padrão dos utilitários (entrada/configuração | inspeção/resultado). */
export const TOOL_GRID_CLASS =
  'grid w-full min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.04fr)_minmax(21rem,0.96fr)] lg:items-start xl:gap-6';
