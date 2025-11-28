import clsx from "clsx";

import { useDesktopBridge } from "../context/DesktopBridgeContext";

const DesktopStatusBadge = (): JSX.Element | null => {
  const { isDesktop, dataDir, loading, chooseDataDir, error } = useDesktopBridge();

  if (!isDesktop) {
    return null;
  }

  const label = loading ? "Inicializando..." : dataDir ?? "Selecciona carpeta";

  return (
    <div className="flex flex-col text-left text-xs">
      <button
        type="button"
        className={clsx(
          "max-w-xs rounded-md border px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
          "border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100",
          "dark:border-indigo-800/60 dark:bg-indigo-950/30 dark:text-indigo-200 dark:hover:border-indigo-600"
        )}
        disabled={loading}
        onClick={() => {
          void chooseDataDir();
        }}
        title={label}
      >
        <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Carpeta de datos
        </span>
        <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
          {label}
        </span>
        <span className="text-[10px] text-indigo-600 dark:text-indigo-300">Cambiar…</span>
      </button>
      {error ? <span className="mt-1 text-[11px] text-rose-500">{error}</span> : null}
    </div>
  );
};

export default DesktopStatusBadge;
