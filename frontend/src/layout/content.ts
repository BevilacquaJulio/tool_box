/** Largura e padding compartilhados entre header e conteudo. */
export const APP_CONTENT_CLASS =
  'mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10';

export const APP_MAIN_CLASS = `${APP_CONTENT_CLASS} flex-1 pt-28 pb-[max(2rem,env(safe-area-inset-bottom))] sm:pt-32 lg:pt-36`;

export const APP_HEADER_INNER_CLASS = `${APP_CONTENT_CLASS} flex items-center justify-between`;

/** Grid interno padrao dos mini servicos (entrada | resultado). */
export const TOOL_GRID_CLASS =
  'grid w-full min-w-0 grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:items-start lg:gap-10 xl:gap-14';
