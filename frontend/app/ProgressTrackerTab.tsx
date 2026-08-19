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

interface DailyMeal {
  id: number;
  meal_name: string;
  calories: number;
  protein: number;
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
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  );
}

function MacroRing({ label, current, target }: { label: string; current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const remaining = target - current;
  return (
    <div className={`${cardClass} flex items-center gap-4`}>
      <div
        className="w-16 h-16 rounded-full shrink-0 flex items-center justify-center"
        style={{ background: `conic-gradient(var(--accent) ${pct * 3.6}deg, var(--track) 0deg)` }}
      >
        <div className="w-12 h-12 rounded-full bg-[var(--card)] flex items-center justify-center text-[11.5px] font-extrabold">
          {pct}%
        </div>
      </div>
      <div>
        <div className="text-[13px] font-bold text-[var(--muted)] mb-0.5">{label}</div>
        <div className="text-[17px] font-extrabold">
          {current}
          <span className="text-[12.5px] font-semibold text-[var(--faint)]"> / {target}</span>
        </div>
        <div className="text-xs text-[var(--faint)] mt-0.5">{remaining > 0 ? `${remaining} left` : "Target reached"}</div>
      </div>
    </div>
  );
}

const submitButtonStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "var(--accent-disabled)" : "var(--text)",
  color: "var(--bg)",
  border: "none",
  borderRadius: 10,
  padding: "0 22px",
  fontSize: "13.5px",
  fontWeight: 700,
  cursor: disabled ? "default" : "pointer",
});

export default function ProgressTrackerTab() {
  const visitorId = useVisitorId();

  const [weightEntries, setWeightEntries] = useState<ProgressEntry[]>([]);
  const [loadingWeight, setLoadingWeight] = useState(false);
  const [submittingWeight, setSubmittingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");

  const [meals, setMeals] = useState<DailyMeal[]>([]);
  const [loadingMeals, setLoadingMeals] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);
  const [mealName, setMealName] = useState("");
  const [mealCalories, setMealCalories] = useState("");
  const [mealProtein, setMealProtein] = useState("");
  const [calorieTarget, setCalorieTarget] = useState(2200);
  const [proteinTarget, setProteinTarget] = useState(150);

  const loadWeightEntries = useCallback(async (id: string) => {
    setLoadingWeight(true);
    setWeightError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/progress/${id}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }
      setWeightEntries(await res.json());
    } catch (err) {
      console.error("Failed to load progress:", err);
      setWeightError(err instanceof Error ? err.message : "Something went wrong loading your history.");
    } finally {
      setLoadingWeight(false);
    }
  }, []);

  const loadMeals = useCallback(async (id: string) => {
    setLoadingMeals(true);
    setMealError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/progress/meals/${id}?entry_date=${todayISO()}`);
      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }
      setMeals(await res.json());
    } catch (err) {
      console.error("Failed to load today's meals:", err);
      setMealError(err instanceof Error ? err.message : "Something went wrong loading today's meals.");
    } finally {
      setLoadingMeals(false);
    }
  }, []);

  useEffect(() => {
    // Both loaders set loading/error state synchronously before their first
    // await (the fetch) — a standard fetch-on-mount pattern, not a loop risk.
    if (visitorId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadWeightEntries(visitorId);
      loadMeals(visitorId);
    }
  }, [visitorId, loadWeightEntries, loadMeals]);

  async function handleLogWeight() {
    if (!visitorId || !weight) return;
    setSubmittingWeight(true);
    setWeightError(null);

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
      await loadWeightEntries(visitorId);
    } catch (err) {
      console.error("Failed to log progress:", err);
      setWeightError(err instanceof Error ? err.message : "Something went wrong logging this entry.");
    } finally {
      setSubmittingWeight(false);
    }
  }

  async function handleAddMeal() {
    if (!visitorId || !mealName.trim()) return;

    try {
      const res = await fetch("http://localhost:8000/api/progress/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitor_id: visitorId,
          entry_date: todayISO(),
          meal_name: mealName.trim(),
          calories: Number(mealCalories) || 0,
          protein: Number(mealProtein) || 0,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }

      setMealName("");
      setMealCalories("");
      setMealProtein("");
      await loadMeals(visitorId);
    } catch (err) {
      console.error("Failed to log meal:", err);
      setMealError(err instanceof Error ? err.message : "Something went wrong logging this meal.");
    }
  }

  async function handleRemoveMeal(mealId: number) {
    if (!visitorId) return;
    try {
      const res = await fetch(`http://localhost:8000/api/progress/meals/${mealId}?visitor_id=${visitorId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }
      setMeals((prev) => prev.filter((m) => m.id !== mealId));
    } catch (err) {
      console.error("Failed to remove meal:", err);
      setMealError(err instanceof Error ? err.message : "Something went wrong removing this meal.");
    }
  }

  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalProtein = meals.reduce((sum, m) => sum + m.protein, 0);

  const first = weightEntries[0];
  const latest = weightEntries[weightEntries.length - 1];
  const delta = first && latest ? latest.weight - first.weight : 0;

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <div className="flex flex-col gap-5 max-w-[720px] mx-auto pt-11">
      <div className="flex justify-between items-end flex-wrap gap-2">
        <div>
          <h2 className="text-[32px] font-extrabold m-0 mb-1.5">Today&apos;s progress</h2>
          <p className="text-[15px] text-[var(--muted)] m-0">Log what you actually ate and see how the day is tracking.</p>
        </div>
        <span
          className="text-[12.5px] font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap"
          style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
        >
          {todayLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MacroRing label="Calories" current={totalCalories} target={calorieTarget} />
        <MacroRing label="Protein" current={totalProtein} target={proteinTarget} />
      </div>

      <div className={`${cardClass} flex flex-col gap-3.5`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-[15.5px] font-extrabold m-0">Log a meal</h3>
          <div className="flex items-center gap-3 text-xs text-[var(--faint)]">
            <label className="flex items-center gap-1.5">
              Target kcal
              <input
                type="number"
                value={calorieTarget}
                onChange={(e) => setCalorieTarget(Number(e.target.value) || 0)}
                className="w-16 border border-[var(--border)] rounded-md px-1.5 py-0.5 bg-[var(--input)] text-[var(--text)]"
              />
            </label>
            <label className="flex items-center gap-1.5">
              Target protein
              <input
                type="number"
                value={proteinTarget}
                onChange={(e) => setProteinTarget(Number(e.target.value) || 0)}
                className="w-14 border border-[var(--border)] rounded-md px-1.5 py-0.5 bg-[var(--input)] text-[var(--text)]"
              />
            </label>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <input
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="Meal name"
            className="col-span-2 sm:col-span-1 border-[1.5px] border-[var(--border)] rounded-xl px-3 py-2.5 text-[13.5px] bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            value={mealCalories}
            onChange={(e) => setMealCalories(e.target.value)}
            placeholder="kcal"
            type="number"
            className="border-[1.5px] border-[var(--border)] rounded-xl px-3 py-2.5 text-[13.5px] bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            value={mealProtein}
            onChange={(e) => setMealProtein(e.target.value)}
            placeholder="protein g"
            type="number"
            className="border-[1.5px] border-[var(--border)] rounded-xl px-3 py-2.5 text-[13.5px] bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
          <button onClick={handleAddMeal} disabled={!mealName.trim()} style={submitButtonStyle(!mealName.trim())}>
            Log
          </button>
        </div>

        {mealError && <p className="text-red-600 text-sm m-0">{mealError}</p>}

        {!loadingMeals && meals.length > 0 && (
          <div className="flex flex-col">
            {meals.map((m) => (
              <div key={m.id} className="flex justify-between items-center text-sm py-2.5 border-t border-[var(--border)]">
                <span className="flex items-center gap-2.5">
                  <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--accent)" }} />
                  {m.meal_name}
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="text-[var(--faint)]">
                    {m.calories} kcal · {m.protein}g protein
                  </span>
                  <button
                    onClick={() => handleRemoveMeal(m.id)}
                    className="bg-none border-none cursor-pointer text-[var(--faint)] text-sm"
                  >
                    ×
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
        {!loadingMeals && meals.length === 0 && (
          <div className="border-[1.5px] border-dashed border-[var(--border)] rounded-2xl p-[18px] text-center">
            <p className="text-[13.5px] text-[var(--faint)] m-0">Nothing logged yet today.</p>
          </div>
        )}
      </div>

      <div className={`${cardClass} flex flex-col gap-4`}>
        <h3 className="text-[15.5px] font-extrabold m-0">Weight over time</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayISO()}
            className="border-[1.5px] border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="Weight (lbs)"
            className="border-[1.5px] border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional) — e.g. felt strong this week"
          className="border-[1.5px] border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={handleLogWeight}
          disabled={submittingWeight || !visitorId || !weight}
          style={submitButtonStyle(submittingWeight || !visitorId || !weight)}
          className="self-start px-6 py-3"
        >
          {submittingWeight ? "Logging..." : "Log weight"}
        </button>

        {weightError && <p className="text-red-600 text-sm m-0">{weightError}</p>}

        {!loadingWeight && weightEntries.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] font-bold text-[var(--muted)]">History</span>
              {first && latest && weightEntries.length > 1 && (
                <span
                  className="flex items-center gap-1 text-sm font-semibold"
                  style={{ color: delta < 0 ? "#059669" : delta > 0 ? "#d97706" : "var(--muted)" }}
                >
                  {delta < 0 ? <TrendingDown size={16} /> : delta > 0 ? <TrendingUp size={16} /> : <Minus size={16} />}
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(1)} lbs since first log
                </span>
              )}
            </div>

            <Sparkline entries={weightEntries} />

            <ul className="flex flex-col gap-2">
              {[...weightEntries].reverse().map((entry, i) => (
                <li key={i} className="flex justify-between items-baseline text-sm border-t border-[var(--border)] pt-2 first:border-t-0 first:pt-0">
                  <span>
                    {entry.entry_date} — {entry.weight} lbs
                  </span>
                  {entry.note && <span className="text-[var(--faint)]">{entry.note}</span>}
                </li>
              ))}
            </ul>
          </>
        )}
        {!loadingWeight && weightEntries.length === 0 && (
          <p className="text-sm text-[var(--faint)] m-0">No entries yet — log your first one above.</p>
        )}
      </div>
    </div>
  );
}
