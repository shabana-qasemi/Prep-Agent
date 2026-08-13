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
      <h2 className="text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-1">
        {result.food_description}
      </h2>
      <p className="text-sm text-[#57534e] dark:text-[#a8a29e] mb-3">
        Estimated serving: {result.estimated_serving}
      </p>
      <p className="text-[#292524] dark:text-[#d6d3d1] mb-3">
        {result.calories} kcal · {result.protein_g}g protein · {result.carbs_g}g carbs ·{" "}
        {result.fat_g}g fat
      </p>
      <p className="text-sm text-[#57534e] dark:text-[#a8a29e] italic">{result.confidence_note}</p>
    </section>
  );
}
