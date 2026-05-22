"use client";

import { useEffect, useState } from "react";

type InitialValue<T> = T | (() => T);

function resolveInitialValue<T>(initialValue: InitialValue<T>): T {
  return initialValue instanceof Function ? initialValue() : initialValue;
}

export function useLocalStorageState<T>(key: string | null, initialValue: InitialValue<T>) {
  const [state, setState] = useState<T>(() => resolveInitialValue(initialValue));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (!key) {
        setLoaded(true);
        return;
      }

      try {
        const storedValue = window.localStorage.getItem(key);
        if (storedValue !== null) {
          setState(JSON.parse(storedValue) as T);
        }
      } catch {
        // Browser storage can be unavailable or contain stale data; in-memory state still works.
      } finally {
        setLoaded(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [key]);

  useEffect(() => {
    if (!key || typeof window === "undefined" || !loaded) {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Ignore quota/private-mode failures.
    }
  }, [key, loaded, state]);

  return [state, setState] as const;
}
