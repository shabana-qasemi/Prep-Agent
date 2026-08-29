"use client";

import { useState } from "react";
import { Target, UtensilsCrossed, Wallet, ShoppingCart, Sparkles, MessageCircle, RefreshCw } from "lucide-react";
import { useMyList } from "./useMyList";
import { extractErrorMessage } from "./apiError";

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string;
}

export interface Meal {
  id?: number;
  title: string;
  calories: number;
  protein_g: number;
  price_per_serving: number;
  source_url?: string;
}

export const MEAL_LABELS = ["Breakfast", "Lunch", "Dinner", "Snack"];

export interface DayPlan {
  meals: Meal[];
  nutrients: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  };
}

export interface PlanResult {
  goal: string;
  plan?: string[];
  macro_targets?: MacroTargets;
  meal_plan?: Record<string, DayPlan>;
  budget_notes?: string;
  grocery_list?: string[];
  grocery_categories?: Record<string, string[]>;
  final_summary?: string;
  direct_answer?: string;
}

export const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const cardClass = "bg-[var(--card)] border-[1.5px] border-[var(--border)] rounded-2xl p-6";

function exportGroceryList(items: string[]) {
  const blob = new Blob([items.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "prep-agent-grocery-list.txt";
  a.click();
  URL.revokeObjectURL(url);
}

interface SwapResponse {
  day: string;
  meal_plan_day: DayPlan;
  grocery_list: string[];
  grocery_categories: Record<string, string[]>;
}

// planId is optional — a shared/read-only plan view or a preset-tab result
// that hasn't been persisted yet simply won't get swap buttons.
export default function PlanResults({ result, planId }: { result: PlanResult; planId?: string | null }) {
  const { items: myListItems, isChecked, toggle } = useMyList();
  const [dayOverrides, setDayOverrides] = useState<Record<string, DayPlan>>({});
  const [groceryOverride, setGroceryOverride] = useState<{ list: string[]; categories?: Record<string, string[]> } | null>(null);
  const [swappingKey, setSwappingKey] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);

  const mealPlan = result.meal_plan
    ? { ...result.meal_plan, ...dayOverrides }
    : result.meal_plan;
  const groceryList = groceryOverride?.list ?? result.grocery_list;
  const groceryCategories = groceryOverride?.categories ?? result.grocery_categories;

  async function handleSwap(day: string, mealIndex: number) {
    if (!planId) return;
    const key = `${day}-${mealIndex}`;
    setSwappingKey(key);
    setSwapError(null);
    try {
      const res = await fetch(`http://localhost:8000/api/plan/${planId}/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day, meal_index: mealIndex }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }
      const data: SwapResponse = await res.json();
      setDayOverrides((prev) => ({ ...prev, [day]: data.meal_plan_day }));
      setGroceryOverride({ list: data.grocery_list, categories: data.grocery_categories });
    } catch (err) {
      setSwapError(err instanceof Error ? err.message : "Couldn't swap that meal — try again.");
    } finally {
      setSwappingKey(null);
    }
  }

  return (
    <>
      {result.plan && result.plan.length > 0 && (
        <p className="text-[13.5px] text-[var(--faint)] -mt-2">
          Orchestrator ran: {result.plan.join(" → ")}
        </p>
      )}

      {result.direct_answer && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-base font-extrabold mb-2">
            <MessageCircle size={18} /> Answer
          </h2>
          <p className="whitespace-pre-wrap m-0 text-[15px] leading-relaxed">{result.direct_answer}</p>
        </section>
      )}

      {result.final_summary && (
        <section className={cardClass} style={{ background: "var(--alt)", borderColor: "var(--accent-soft)" }}>
          <h2 className="flex items-center gap-2 text-base font-extrabold mb-2">
            <Sparkles size={18} /> Advice
          </h2>
          <p className="whitespace-pre-wrap m-0 text-[14.5px] leading-relaxed">{result.final_summary}</p>
        </section>
      )}

      {result.macro_targets && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-base font-extrabold mb-2">
            <Target size={18} /> Daily Targets
          </h2>
          <p className="m-0 text-base">
            {result.macro_targets.calories} kcal &nbsp;·&nbsp; {result.macro_targets.protein_g}g protein
            &nbsp;·&nbsp; {result.macro_targets.carbs_g}g carbs &nbsp;·&nbsp; {result.macro_targets.fat_g}g fat
          </p>
          <p className="mt-2 mb-0 text-[13.5px] text-[var(--faint)] leading-relaxed">
            {result.macro_targets.notes}
          </p>
        </section>
      )}

      {mealPlan && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-base font-extrabold mb-1">
            <UtensilsCrossed size={18} /> {Object.keys(mealPlan).length}-Day Meal Plan
          </h2>
          <p className="mb-1 text-[12.5px] text-[var(--faint)]">
            Calories, macros, and prices below are AI-estimated from each recipe&apos;s ingredients — not measured or
            verified nutrition data, and actual cost varies by store, brand, and region.
          </p>
          {planId && (
            <p className="mb-3 text-[12.5px] text-[var(--faint)]">
              Don&apos;t like a meal? Hit <RefreshCw size={10} className="inline align-baseline" /> to swap it for
              another from the same category.
            </p>
          )}
          {swapError && <p className="mb-3 text-[12.5px] text-red-600">{swapError}</p>}
          <div className="flex flex-col gap-4">
            {DAY_ORDER.filter((day) => mealPlan[day]).map((day) => {
              const dayPlan = mealPlan[day];
              return (
                <div key={day}>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-bold text-[14.5px] capitalize">{day}</span>
                    <span className="text-[12.5px] text-[var(--faint)]">
                      {Math.round(dayPlan.nutrients.calories)} kcal ·{" "}
                      {Math.round(dayPlan.nutrients.protein)}g protein
                    </span>
                  </div>
                  <div className="flex flex-col">
                    {dayPlan.meals.map((meal, i) => {
                      const key = `${day}-${i}`;
                      const isSwapping = swappingKey === key;
                      return (
                        <div
                          key={i}
                          className="flex flex-wrap justify-between items-start gap-x-3 gap-y-0.5 text-sm py-1.5 border-t border-[var(--border)]"
                        >
                          <span className="min-w-0 break-words">
                            <span className="font-bold mr-1" style={{ color: "var(--accent)" }}>
                              {MEAL_LABELS[i] ?? "Meal"}:
                            </span>
                            {meal.source_url ? (
                              <a href={meal.source_url} target="_blank" rel="noopener noreferrer">
                                {meal.title}
                              </a>
                            ) : (
                              meal.title
                            )}
                          </span>
                          <span className="flex items-center gap-2 text-[var(--faint)] shrink-0 whitespace-nowrap">
                            {Math.round(meal.calories)} kcal · ${meal.price_per_serving.toFixed(2)}
                            {planId && (
                              <button
                                onClick={() => handleSwap(day, i)}
                                disabled={isSwapping}
                                aria-label={`Swap ${meal.title} for another meal`}
                                title="Swap this meal"
                                className="bg-none border-none cursor-pointer p-0.5 text-[var(--faint)] hover:text-[var(--accent)] disabled:opacity-50 disabled:cursor-default"
                              >
                                <RefreshCw size={12} className={isSwapping ? "animate-spin" : undefined} />
                              </button>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {result.budget_notes && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-base font-extrabold mb-2">
            <Wallet size={18} /> Budget Notes
          </h2>
          <p className="whitespace-pre-wrap m-0 text-[14.5px] leading-relaxed">{result.budget_notes}</p>
        </section>
      )}

      {groceryList && (
        <section className={cardClass}>
          <div className="flex justify-between items-center mb-1">
            <h2 className="flex items-center gap-2 text-base font-extrabold m-0">
              <ShoppingCart size={18} /> Grocery List
            </h2>
            <button
              onClick={() => exportGroceryList(groceryList)}
              className="text-[12.5px] font-bold bg-none border-none cursor-pointer underline"
              style={{ color: "var(--accent)" }}
            >
              Export list
            </button>
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--faint)]">Check items off to add them to My List.</p>

          {groceryCategories && Object.keys(groceryCategories).length > 0 ? (
            <div className="flex flex-col gap-4">
              {Object.entries(groceryCategories).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-[11.5px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--accent)" }}>
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
                    {items.map((item) => (
                      <label key={item} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked(item)}
                          onChange={() => toggle(item)}
                          className="w-[15px] h-[15px] shrink-0"
                        />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
              {groceryList.map((item, i) => (
                <label key={i} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked(item)}
                    onChange={() => toggle(item)}
                    className="w-[15px] h-[15px] shrink-0"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          )}

          {myListItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-bold mb-2">My List ({myListItems.length})</h3>
              <ul className="flex flex-wrap gap-1.5">
                {myListItems.map((item) => (
                  <li
                    key={item}
                    className="text-xs px-2 py-1 rounded-md"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
