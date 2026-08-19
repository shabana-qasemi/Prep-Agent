"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "prepagent_plan_history";
const EVENT_NAME = "prepagent-history-changed";
const MAX_ENTRIES = 4;

export interface HistoryEntry {
  goal: string;
  at: number;
}

function readHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: HistoryEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(EVENT_NAME));
}

// Tracks the last few goals a visitor has actually run, so they can
// one-click re-run a recent plan instead of retyping it.
export function usePlanHistory() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    // localStorage isn't available during SSR, so the real history can only
    // be read after mount — this sync setState-in-effect is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(readHistory());
    function handleChange() {
      setEntries(readHistory());
    }
    window.addEventListener(EVENT_NAME, handleChange);
    return () => window.removeEventListener(EVENT_NAME, handleChange);
  }, []);

  const record = useCallback((goal: string) => {
    const current = readHistory();
    const next = [{ goal, at: Date.now() }, ...current.filter((h) => h.goal !== goal)].slice(0, MAX_ENTRIES);
    writeHistory(next);
  }, []);

  return { entries, record };
}
