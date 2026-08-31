export function RouteLoadingFallback() {
  return (
    <div className="mx-auto w-full max-w-[1180px] animate-pulse px-4 pt-28 sm:px-6 sm:pt-32 lg:px-10 lg:pt-36">
      <div className="h-5 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-8 h-12 max-w-xl rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-5 max-w-2xl rounded-full bg-zinc-100 dark:bg-zinc-900" />
      <div className="mt-12 grid gap-6 rounded-[1.75rem] border border-zinc-200 bg-white/70 p-4 sm:p-7 lg:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="h-80 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        <div className="h-80 rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
      </div>
      <span className="sr-only" role="status">
        Carregando ferramenta
      </span>
    </div>
  );
}
