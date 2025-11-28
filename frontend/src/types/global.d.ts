export {};

declare global {
  interface Window {
    __API_BASE__?: string;
    __TAURI_IPC__?: unknown;
  }
}
