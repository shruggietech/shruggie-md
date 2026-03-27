import { createContext, useContext } from "react";
import type { StorageAdapter } from "./types";

export const StorageContext = createContext<StorageAdapter | null>(null);

export function useStorage(): StorageAdapter | null {
  return useContext(StorageContext);
}
