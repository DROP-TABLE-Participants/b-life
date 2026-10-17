"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { STORAGE_KEY } from "@/lib/constants";

export const useInitializeAppState = (): void => {
  const initialize = useAppStore((state) => state.initialize);
  const syncFromStorage = useAppStore((state) => state.syncFromStorage);

  useEffect(() => {
    initialize();
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.storageArea === window.localStorage) syncFromStorage();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [initialize, syncFromStorage]);
};
