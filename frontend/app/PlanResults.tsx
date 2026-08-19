"use client";

import { Target, UtensilsCrossed, Wallet, ShoppingCart, Sparkles } from "lucide-react";
import { useMyList } from "./useMyList";

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string;
}

export interface Meal {
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
  final_summary?: string;
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

export default function PlanResults({ result }: { result: PlanResult }) {
  const { items: myListItems, isChecked, toggle } = useMyList();

  return (
    <>
      {result.plan && (
        <p className="text-[13.5px] text-[var(--faint)] -mt-2">
          Orchestrator ran: {result.plan.join(" → ")}
        </p>
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

      {result.meal_plan && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-base font-extrabold mb-1">
            <UtensilsCrossed size={18} /> {Object.keys(result.meal_plan).length}-Day Meal Plan
          </h2>
          <p className="mb-4 text-[12.5px] text-[var(--faint)]">
            Prices shown are estimated U.S. averages from recipe data — actual cost varies by store, brand, and region.
          </p>
          <div className="flex flex-col gap-4">
            {DAY_ORDER.filter((day) => result.meal_plan?.[day]).map((day) => {
              const dayPlan = result.meal_plan![day];
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
                    {dayPlan.meals.map((meal, i) => (
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
                        <span className="text-[var(--faint)] shrink-0 whitespace-nowrap">
                          {Math.round(meal.calories)} kcal · ${meal.price_per_serving.toFixed(2)}
                        </span>
                      </div>
                    ))}
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

      {result.grocery_list && (
        <section className={cardClass}>
          <div className="flex justify-between items-center mb-1">
            <h2 className="flex items-center gap-2 text-base font-extrabold m-0">
              <ShoppingCart size={18} /> Grocery List
            </h2>
            <button
              onClick={() => exportGroceryList(result.grocery_list!)}
              className="text-[12.5px] font-bold bg-none border-none cursor-pointer underline"
              style={{ color: "var(--accent)" }}
            >
              Export list
            </button>
          </div>
          <p className="mb-3 text-[12.5px] text-[var(--faint)]">Check items off to add them to My List.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2">
            {result.grocery_list.map((item, i) => (
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

      {result.final_summary && (
        <section className={cardClass} style={{ background: "var(--alt)", borderColor: "var(--accent-soft)" }}>
          <h2 className="flex items-center gap-2 text-base font-extrabold mb-2">
            <Sparkles size={18} /> Wrap-Up
          </h2>
          <p className="whitespace-pre-wrap m-0 text-[14.5px] leading-relaxed">{result.final_summary}</p>
        </section>
      )}
    </>
  );
}
