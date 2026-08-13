"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cardClass } from "./PlanResults";
import { useVisitorId } from "./useVisitorId";
import { extractErrorMessage } from "./apiError";

interface ProgressEntry {
  entry_date: string;
  weight: number;
  note: string | null;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function Sparkline({ entries }: { entries: ProgressEntry[] }) {
  if (entries.length < 2) return null;

  const weights = entries.map((e) => e.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const width = 280;
  const height = 60;
  const step = width / (entries.length - 1);

  const points = weights
    .map((w, i) => {
      const x = i * step;
      const y = height - ((w - min) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" />
    </svg>
  );
}

export default function ProgressTrackerTab() {
  const visitorId = useVisitorId();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");

  const loadEntries = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/progress/${id}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }
      setEntries(await res.json());
    } catch (err) {
      console.error("Failed to load progress:", err);
      setError(err instanceof Error ? err.message : "Something went wrong loading your history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // loadEntries sets loading/error state synchronously before its first
    // await (the fetch) — a standard fetch-on-mount pattern, not a loop risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (visitorId) loadEntries(visitorId);
  }, [visitorId, loadEntries]);

  async function handleSubmit() {
    if (!visitorId || !weight) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("http://localhost:8000/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_id: visitorId,
          entry_date: date,
          weight: parseFloat(weight),
          note: note || null,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }

      setWeight("");
      setNote("");
      await loadEntries(visitorId);
    } catch (err) {
      console.error("Failed to log progress:", err);
      setError(err instanceof Error ? err.message : "Something went wrong logging this entry.");
    } finally {
      setSubmitting(false);
    }
  }

  const first = entries[0];
  const latest = entries[entries.length - 1];
  const delta = first && latest ? latest.weight - first.weight : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-2">Progress Tracker</h1>
        <p className="text-[#57534e] dark:text-[#a8a29e]">
          Log your weight over time — stored under a private ID in this browser, no account needed.
        </p>
      </div>

      <div className={`${cardClass} flex flex-col gap-4`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5 block">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayISO()}
              className="w-full border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-4 py-2.5 text-[15px] bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5 block">
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 182.5"
              className="w-full border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-4 py-2.5 text-[15px] bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5 block">
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. felt strong this week"
            className="w-full border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-4 py-2.5 text-[15px] bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !visitorId || !weight}
          className="rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {submitting ? "Logging..." : "Log Entry"}
        </button>
      </div>

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      {!loading && entries.length > 0 && (
        <section className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4]">Your History</h2>
            {first && latest && entries.length > 1 && (
              <span
                className={`flex items-center gap-1 text-sm font-medium ${
                  delta < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : delta > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-[#57534e] dark:text-[#a8a29e]"
                }`}
              >
                {delta < 0 ? <TrendingDown size={16} /> : delta > 0 ? <TrendingUp size={16} /> : <Minus size={16} />}
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} lbs since first log
              </span>
            )}
          </div>

          <Sparkline entries={entries} />

          <ul className="flex flex-col gap-2 mt-4">
            {[...entries].reverse().map((entry, i) => (
              <li
                key={i}
                className="flex justify-between items-baseline text-sm border-t border-[#e7e5e4] dark:border-[#292524] pt-2 first:border-t-0 first:pt-0"
              >
                <span className="text-[#1c1917] dark:text-[#f5f5f4]">
                  {entry.entry_date} — {entry.weight} lbs
                </span>
                {entry.note && <span className="text-[#57534e] dark:text-[#a8a29e]">{entry.note}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && entries.length === 0 && !error && (
        <p className="text-center text-sm text-[#57534e] dark:text-[#a8a29e]">
          No entries yet — log your first one above.
        </p>
      )}
    </div>
  );
}
