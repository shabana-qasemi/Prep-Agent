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

export const cardClass =
  "bg-white dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-[#292524] rounded-xl shadow-sm p-5";

export default function PlanResults({ result }: { result: PlanResult }) {
  const { isChecked, toggle } = useMyList();

  return (
    <>
      {result.plan && (
        <p className="text-sm text-[#57534e] dark:text-[#a8a29e] -mt-2">
          Orchestrator ran: {result.plan.join(" → ")}
        </p>
      )}

      {result.macro_targets && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-2">
            <Target size={18} /> Daily Targets
          </h2>
          <p className="text-[#292524] dark:text-[#d6d3d1]">
            {result.macro_targets.calories} kcal · {result.macro_targets.protein_g}g protein ·{" "}
            {result.macro_targets.carbs_g}g carbs · {result.macro_targets.fat_g}g fat
          </p>
          <p className="text-sm text-[#57534e] dark:text-[#a8a29e] mt-2">
            {result.macro_targets.notes}
          </p>
        </section>
      )}

      {result.meal_plan && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-1">
            <UtensilsCrossed size={18} /> {Object.keys(result.meal_plan).length}-Day Meal Plan
          </h2>
          <p className="text-xs text-[#a8a29e] dark:text-[#78716c] italic mb-4">
            Prices shown are estimated U.S. averages from recipe data — actual cost varies by store, brand, and region.
          </p>
          <div className="flex flex-col gap-5">
            {DAY_ORDER.filter((day) => result.meal_plan?.[day]).map((day) => {
              const dayPlan = result.meal_plan![day];
              return (
                <div key={day}>
                  <div className="flex justify-between items-baseline mb-2">
                    <h3 className="font-medium text-[#1c1917] dark:text-[#f5f5f4] capitalize">
                      {day}
                    </h3>
                    <span className="text-xs text-[#57534e] dark:text-[#a8a29e]">
                      {Math.round(dayPlan.nutrients.calories)} kcal ·{" "}
                      {Math.round(dayPlan.nutrients.protein)}g protein
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {dayPlan.meals.map((meal, i) => (
                      <li
                        key={i}
                        className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-0.5 text-sm text-[#292524] dark:text-[#d6d3d1]"
                      >
                        <span className="min-w-0 break-words">
                          <span className="text-[#2563eb] dark:text-[#60a5fa] font-medium mr-1.5">
                            {MEAL_LABELS[i] ?? "Meal"}:
                          </span>
                          {meal.source_url ? (
                            <a
                              href={meal.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline decoration-[#2563eb]/50 underline-offset-2 hover:decoration-[#2563eb]"
                            >
                              {meal.title}
                            </a>
                          ) : (
                            meal.title
                          )}
                        </span>
                        <span className="text-[#57534e] dark:text-[#a8a29e] shrink-0 ml-3">
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

      {result.budget_notes && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-2">
            <Wallet size={18} /> Budget Notes
          </h2>
          <p className="whitespace-pre-wrap text-[#292524] dark:text-[#d6d3d1] text-sm leading-relaxed">
            {result.budget_notes}
          </p>
        </section>
      )}

      {result.grocery_list && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-1">
            <ShoppingCart size={18} /> Grocery List
          </h2>
          <p className="text-xs text-[#57534e] dark:text-[#a8a29e] mb-3">
            Check items off to add them to My List, in the header above.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.grocery_list.map((item, i) => {
              const checked = isChecked(item);
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 text-[#292524] dark:text-[#d6d3d1] text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(item)}
                    className="accent-[#2563eb] w-4 h-4 rounded shrink-0"
                  />
                  <span className={checked ? "line-through text-[#a8a29e] dark:text-[#78716c]" : ""}>
                    {item}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {result.final_summary && (
        <section className={`${cardClass} border-l-4 border-l-[#2563eb] dark:border-l-[#60a5fa]`}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-2">
            <Sparkles size={18} /> Your Wrap-Up
          </h2>
          <p className="whitespace-pre-wrap text-[#292524] dark:text-[#d6d3d1] text-sm leading-relaxed">
            {result.final_summary}
          </p>
        </section>
      )}
    </>
  );
}
