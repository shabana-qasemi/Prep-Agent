import { cardClass } from "./PlanResults";

export interface ScanResult {
  food_description: string;
  estimated_serving: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence_note: string;
}

export default function ScanResults({ result }: { result: ScanResult }) {
  return (
    <section className={cardClass}>
      <h2 className="font-serif text-lg font-semibold text-[#2a2318] dark:text-[#f3ead9] mb-1">
        {result.food_description}
      </h2>
      <p className="text-sm text-[#5c5346] dark:text-[#c2b89f] mb-3">
        Estimated serving: {result.estimated_serving}
      </p>
      <p className="text-[#3a3226] dark:text-[#e4d9c4] mb-3">
        {result.calories} kcal · {result.protein_g}g protein · {result.carbs_g}g carbs ·{" "}
        {result.fat_g}g fat
      </p>
      <p className="text-sm text-[#5c5346] dark:text-[#c2b89f] italic">{result.confidence_note}</p>
    </section>
  );
}
