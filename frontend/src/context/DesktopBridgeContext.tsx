import { invoke } from "@tauri-apps/api/tauri";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";

import { resolveInitialApiBase, setApiBaseUrl } from "../lib/api/client";

type DesktopCommandPayload = {
  api_base: string;
  data_dir: string;
};

type DesktopBridgeValue = {
  isDesktop: boolean;
  loading: boolean;
  apiBase: string;
  dataDir?: string;
  error?: string;
  refresh: () => Promise<void>;
  chooseDataDir: () => Promise<void>;
};

const noop = async (): Promise<void> => {};

const DesktopBridgeContext = createContext<DesktopBridgeValue>({
  isDesktop: false,
  loading: false,
  apiBase: resolveInitialApiBase(),
  dataDir: undefined,
  error: undefined,
  refresh: noop,
  chooseDataDir: noop
});

const isDesktopHost = (): boolean => typeof window !== "undefined" && Boolean(window.__TAURI_IPC__);

const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Error desconocido";
};

export const DesktopBridgeProvider = ({ children }: { children: ReactNode }): JSX.Element => {
  const [state, setState] = useState(() => ({
    isDesktop: isDesktopHost(),
    loading: isDesktopHost(),
    apiBase: resolveInitialApiBase(),
    dataDir: undefined as string | undefined,
    error: undefined as string | undefined
  }));

  const applyPayload = useCallback((payload: DesktopCommandPayload): void => {
    setApiBaseUrl(payload.api_base);
    setState((prev) => ({
      ...prev,
      apiBase: payload.api_base,
      dataDir: payload.data_dir,
      loading: false,
      isDesktop: true,
      error: undefined
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!isDesktopHost()) {
      setState((prev) => ({
        ...prev,
        isDesktop: false,
        loading: false,
        error: undefined,
        dataDir: undefined
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, isDesktop: true, error: undefined }));
    try {
      const payload = await invoke<DesktopCommandPayload>("desktop_context");
      applyPayload(payload);
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: formatError(error) }));
    }
  }, [applyPayload]);

  const chooseDataDir = useCallback(async () => {
    if (!isDesktopHost()) {
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: undefined }));
    try {
      const payload = await invoke<DesktopCommandPayload>("select_data_directory");
      applyPayload(payload);
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: formatError(error) }));
    }
  }, [applyPayload]);

  useEffect(() => {
    if (isDesktopHost()) {
      void refresh();
    }
  }, [refresh]);

  const value = useMemo<DesktopBridgeValue>(
    () => ({
      isDesktop: state.isDesktop,
      loading: state.loading,
      apiBase: state.apiBase,
      dataDir: state.dataDir,
      error: state.error,
      refresh,
      chooseDataDir
    }),
    [state, refresh, chooseDataDir]
  );

  return <DesktopBridgeContext.Provider value={value}>{children}</DesktopBridgeContext.Provider>;
};

export const useDesktopBridge = (): DesktopBridgeValue => useContext(DesktopBridgeContext);
