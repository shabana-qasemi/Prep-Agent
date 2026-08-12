import { Target, UtensilsCrossed, Wallet, ShoppingCart } from "lucide-react";

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
}

export const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export const cardClass =
  "bg-[#fffdf9] dark:bg-[#1c1728] border border-[#d4af37]/30 dark:border-[#d4af37]/20 rounded-2xl shadow-sm p-5";

export default function PlanResults({ result }: { result: PlanResult }) {
  return (
    <>
      {result.plan && (
        <p className="text-sm text-[#5c5346] dark:text-[#c2b89f] -mt-2">
          Orchestrator ran: {result.plan.join(" → ")}
        </p>
      )}

      {result.macro_targets && (
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

      {result.meal_plan && (
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

      {result.budget_notes && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#2a2318] dark:text-[#f3ead9] mb-2">
            <Wallet size={18} /> Budget Notes
          </h2>
          <p className="whitespace-pre-wrap text-[#3a3226] dark:text-[#e4d9c4] text-sm leading-relaxed">
            {result.budget_notes}
          </p>
        </section>
      )}

      {result.grocery_list && (
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
    </>
  );
}
