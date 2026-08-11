"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Target, UtensilsCrossed, Wallet, ShoppingCart } from "lucide-react";

interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string;
}

interface Meal {
  title: string;
  calories: number;
  protein_g: number;
  price_per_serving: number;
  source_url?: string;
}

const MEAL_LABELS = ["Breakfast", "Lunch", "Dinner", "Snack"];

interface DayPlan {
  meals: Meal[];
  nutrients: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  };
}

interface PlanResult {
  goal: string;
  plan?: string[];
  macro_targets?: MacroTargets;
  meal_plan?: Record<string, DayPlan>;
  budget_notes?: string;
  grocery_list?: string[];
}

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const cardClass =
  "bg-[#fffdf9] dark:bg-[#1c1728] border border-[#d4af37]/30 dark:border-[#d4af37]/20 rounded-2xl shadow-sm p-5";

export default function Home() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function handleGoalChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setGoal(e.target.value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  async function handleRunPlan() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("http://localhost:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Server responded with ${res.status}: ${body}`);
      }

      const data: PlanResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Plan request failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong while generating your plan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#faf6ef] dark:bg-[#120f1a] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[36rem] w-[52rem] rounded-full opacity-60 dark:opacity-40 blur-3xl"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #180a30 0%, #6e1a68 22%, #d21567 45%, #ef5f76 68%, #c8d94a 100%)",
        }}
      />

      <button
        onClick={toggleDarkMode}
        aria-label="Toggle dark mode"
        className="fixed top-6 right-6 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-[#fffdf9]/80 dark:bg-[#1c1728]/80 border border-[#d4af37]/30 backdrop-blur text-lg"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <main className="relative max-w-2xl mx-auto px-6 py-16 flex flex-col gap-6">
        <header className="flex flex-col gap-3 mb-2">
          <span className="text-sm font-medium text-[#8b1d6f] dark:text-[#d68fd6] tracking-[0.15em] uppercase">
            PrepAgent — AI Multi-Agent Meal Prep Orchestrator
          </span>
          <h1 className="font-serif text-4xl leading-tight font-semibold text-[#2a2318] dark:text-[#f3ead9]">
            Tell us your goal, we&apos;ll figure out the rest
          </h1>
          <p className="text-[17px] leading-relaxed text-[#524a3c] dark:text-[#c2b89f]">
            Bulking, cutting, tight budget, or just trying to eat better — describe it in
            plain English and an AI orchestrator decides exactly what you need.
          </p>
        </header>

        <div className={`${cardClass} flex flex-col gap-3`}>
          <textarea
            ref={textareaRef}
            value={goal}
            onChange={handleGoalChange}
            placeholder="e.g. I'm bulking, need 180g protein/day, budget $60/week"
            rows={1}
            className="resize-none overflow-hidden border border-[#e8dcc0] dark:border-[#3a2f4d] rounded-2xl px-5 py-4 text-[16px] leading-relaxed bg-[#faf6ef] dark:bg-[#120f1a] text-[#2a2318] dark:text-[#f3ead9] placeholder:text-[#a89b7d] transition-[height,box-shadow,border-color] duration-150 ease-out focus:outline-none focus:border-[#6b2394] focus:ring-4 focus:ring-[#6b2394]/15"
          />

          <button
            onClick={handleRunPlan}
            disabled={loading || !goal}
            className="rounded-full bg-[#5b1f8a] hover:bg-[#6e26a8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? "Building Your Plan..." : "Build My Plan"}
          </button>
        </div>

        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        )}

        {result?.plan && (
          <p className="text-sm text-[#5c5346] dark:text-[#c2b89f] -mt-2">
            Orchestrator ran: {result.plan.join(" → ")}
          </p>
        )}

        {result?.macro_targets && (
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#2a2318] dark:text-[#f3ead9] mb-2">
              <Target size={18} /> Daily Targets
            </h2>
            <p className="text-[#3a3226] dark:text-[#e4d9c4]">
              {result.macro_targets.calories} kcal · {result.macro_targets.protein_g}g protein ·{" "}
              {result.macro_targets.carbs_g}g carbs · {result.macro_targets.fat_g}g fat
            </p>
            <p className="text-sm text-[#5c5346] dark:text-[#c2b89f] mt-2">
              {result.macro_targets.notes}
            </p>
          </section>
        )}

        {result?.meal_plan && (
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#2a2318] dark:text-[#f3ead9] mb-4">
              <UtensilsCrossed size={18} /> 7-Day Meal Plan
            </h2>
            <div className="flex flex-col gap-5">
              {DAY_ORDER.filter((day) => result.meal_plan?.[day]).map((day) => {
                const dayPlan = result.meal_plan![day];
                return (
                  <div key={day}>
                    <div className="flex justify-between items-baseline mb-2">
                      <h3 className="font-medium text-[#2a2318] dark:text-[#f3ead9] capitalize">
                        {day}
                      </h3>
                      <span className="text-xs text-[#5c5346] dark:text-[#c2b89f]">
                        {Math.round(dayPlan.nutrients.calories)} kcal ·{" "}
                        {Math.round(dayPlan.nutrients.protein)}g protein
                      </span>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {dayPlan.meals.map((meal, i) => (
                        <li
                          key={i}
                          className="flex justify-between items-center text-sm text-[#3a3226] dark:text-[#e4d9c4]"
                        >
                          <span>
                            <span className="text-[#8b1d6f] dark:text-[#d68fd6] font-medium mr-1.5">
                              {MEAL_LABELS[i] ?? "Meal"}:
                            </span>
                            {meal.source_url ? (
                              <a
                                href={meal.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline decoration-[#d4af37]/50 underline-offset-2 hover:decoration-[#d4af37]"
                              >
                                {meal.title}
                              </a>
                            ) : (
                              meal.title
                            )}
                          </span>
                          <span className="text-[#5c5346] dark:text-[#c2b89f] shrink-0 ml-3">
                            {Math.round(meal.calories)} kcal · ${meal.price_per_serving.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {result?.budget_notes && (
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#2a2318] dark:text-[#f3ead9] mb-2">
              <Wallet size={18} /> Budget Notes
            </h2>
            <p className="whitespace-pre-wrap text-[#3a3226] dark:text-[#e4d9c4] text-sm leading-relaxed">
              {result.budget_notes}
            </p>
          </section>
        )}

        {result?.grocery_list && (
          <section className={cardClass}>
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#2a2318] dark:text-[#f3ead9] mb-3">
              <ShoppingCart size={18} /> Grocery List
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {result.grocery_list.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-[#3a3226] dark:text-[#e4d9c4] text-sm"
                >
                  <input type="checkbox" className="accent-[#5b1f8a] w-4 h-4 rounded" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
