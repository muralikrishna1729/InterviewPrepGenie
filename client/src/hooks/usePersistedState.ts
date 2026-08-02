import { useState, useEffect } from 'react';

/**
 * useState that persists to localStorage so a user's typed form fields
 * survive navigating away and coming back (they don't have to re-type).
 */
export function usePersistedState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full / unavailable — ignore
    }
  }, [key, value]);

  return [value, setValue] as const;
}

/** Remove a persisted key (e.g. after a successful submit). */
export function clearPersistedState(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
