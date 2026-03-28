"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";

export const useInitializeAppState = (): void => {
  const initialize = useAppStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);
};
