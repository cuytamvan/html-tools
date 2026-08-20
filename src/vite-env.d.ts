/// <reference types="vite/client" />

interface Navigator {
  userAgentData?: {
    getHighEntropyValues: (hints: string[]) => Promise<Record<string, unknown>>;
  };
  deviceMemory?: number;
}

interface Window {
  showDirectoryPicker?: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
}

interface FileSystemObserver {
  observe: (handle: FileSystemHandle) => Promise<void> | void;
  disconnect: () => void;
}

declare const FileSystemObserver: {
  new (callback: () => void): FileSystemObserver;
};
