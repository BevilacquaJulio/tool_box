export function RouteLoadingFallback() {
  return (
    <div className="mx-auto w-full max-w-[1280px] animate-pulse space-y-5">
      <div className="studio-panel flex items-center gap-4 p-4 sm:p-5">
        <div className="size-11 shrink-0 rounded-xl bg-[var(--bg-subtle)]" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 rounded-md bg-[var(--bg-subtle)]" />
          <div className="h-3.5 w-80 max-w-full rounded-md bg-[var(--bg-subtle)]" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="studio-panel h-80 p-5" />
        <div className="studio-panel h-80 p-5" />
      </div>

      <span className="sr-only" role="status">
        Carregando ferramenta
      </span>
    </div>
  );
}
