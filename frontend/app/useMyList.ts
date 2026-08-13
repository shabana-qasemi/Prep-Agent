"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "prepagent_my_list";
const EVENT_NAME = "prepagent-mylist-changed";

function readList(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeList(items: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT_NAME));
}

// Backed by localStorage so checked items persist across tabs/reloads. Every
// instance of this hook re-syncs on a shared custom event, so checking an
// item in, say, the Pantry tab is instantly reflected in the header's My List
// panel without needing React context.
export function useMyList() {
  const [items, setItems] = useState<string[]>([]);

  useEffect(() => {
    // localStorage isn't available during SSR, so the real list can only be
    // read after mount — this sync setState-in-effect is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readList());
    function handleChange() {
      setItems(readList());
    }
    window.addEventListener(EVENT_NAME, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(EVENT_NAME, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const isChecked = useCallback((item: string) => items.includes(item), [items]);

  const toggle = useCallback((item: string) => {
    const current = readList();
    const next = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item];
    writeList(next);
  }, []);

  const remove = useCallback((item: string) => {
    writeList(readList().filter((i) => i !== item));
  }, []);

  const clear = useCallback(() => {
    writeList([]);
  }, []);

  return { items, isChecked, toggle, remove, clear };
}
