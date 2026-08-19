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
      <h2 className="text-base font-extrabold mb-1">{result.food_description}</h2>
      <p className="text-sm text-[var(--faint)] mb-3">Estimated serving: {result.estimated_serving}</p>
      <p className="mb-3 text-base">
        {result.calories} kcal · {result.protein_g}g protein · {result.carbs_g}g carbs · {result.fat_g}g fat
      </p>
      <p className="text-sm text-[var(--faint)] italic">{result.confidence_note}</p>
    </section>
  );
}
