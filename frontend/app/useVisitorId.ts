"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "prepagent_visitor_id";

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// A random ID persisted in localStorage — the closest thing to an "account"
// this app has, since there's no login. It just lets returning visitors see
// their own progress history; it identifies a browser, not a person.
export function useVisitorId(): string | null {
  const [visitorId, setVisitorId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(STORAGE_KEY, id);
    }
    // localStorage isn't available during SSR, so this can only run after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisitorId(id);
  }, []);

  return visitorId;
}
