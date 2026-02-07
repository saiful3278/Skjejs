import { useState, useEffect } from "react";

type StorageType = "local" | "session";

function useStorage<T>(
  key: string,
  initialValue: T,
  storageType: StorageType = "local"
) {
  const isClient = typeof window !== "undefined";
  const storage = isClient
    ? storageType === "local"
      ? window.localStorage
      : window.sessionStorage
    : null;

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    if (!isClient || !storage) return;
    try {
      const item = storage.getItem(key);
      if (item !== null) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading storage key "${key}":`, error);
    }
  }, []);

  useEffect(() => {
    if (!isClient || !storage) return;
    try {
      storage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.warn(`Error setting storage key "${key}":`, error);
    }
  }, [key, storedValue, storage, isClient]);

  return [storedValue, setStoredValue] as const;
}

export default useStorage;
