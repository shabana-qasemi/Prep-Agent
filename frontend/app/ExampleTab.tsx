import PlanResults, { type PlanResult } from "./PlanResults";

const SAMPLE_PLAN: PlanResult = {
  goal: "I'm bulking, need 180g protein a day, budget $60 a week",
  plan: ["macro", "mealplan", "budget", "grocery"],
  macro_targets: {
    calories: 3000,
    protein_g: 180,
    carbs_g: 379,
    fat_g: 85,
    notes:
      "Assumptions: adult male, ~80kg, lifting 3-5x/week, maintenance around 2,700 kcal. A ~300 kcal surplus targets roughly 0.25-0.5 lb of gain per week. Protein set at your requested 180g; fat at ~25% of calories for hormone health; carbs fill the remainder to fuel training.",
  },
  meal_plan: {
    monday: {
      meals: [
        { title: "Greek Yogurt Protein Bowl", calories: 420, protein_g: 38, price_per_serving: 2.1 },
        { title: "Chicken & Rice Power Bowl", calories: 780, protein_g: 55, price_per_serving: 3.4 },
        { title: "Salmon with Roasted Vegetables", calories: 690, protein_g: 48, price_per_serving: 4.8 },
      ],
      nutrients: { calories: 2996, protein: 178, fat: 84, carbohydrates: 372 },
    },
    tuesday: {
      meals: [
        { title: "Protein Oatmeal with Berries", calories: 450, protein_g: 32, price_per_serving: 1.6 },
        { title: "Turkey & Sweet Potato Skillet", calories: 720, protein_g: 50, price_per_serving: 2.9 },
        { title: "Beef Stir Fry with Broccoli", calories: 810, protein_g: 52, price_per_serving: 3.7 },
      ],
      nutrients: { calories: 3005, protein: 182, fat: 88, carbohydrates: 365 },
    },
    wednesday: {
      meals: [
        { title: "Cottage Cheese & Pineapple Bowl", calories: 390, protein_g: 34, price_per_serving: 1.9 },
        { title: "Beef Burrito Bowl", calories: 760, protein_g: 48, price_per_serving: 3.1 },
        { title: "Baked Chicken Thighs with Quinoa", calories: 840, protein_g: 56, price_per_serving: 3.6 },
      ],
      nutrients: { calories: 2990, protein: 176, fat: 82, carbohydrates: 368 },
    },
    thursday: {
      meals: [
        { title: "Protein Pancakes", calories: 480, protein_g: 36, price_per_serving: 1.8 },
        { title: "Tuna & White Bean Salad", calories: 650, protein_g: 46, price_per_serving: 2.6 },
        { title: "Pork Tenderloin with Sweet Potato Mash", calories: 870, protein_g: 54, price_per_serving: 4.1 },
      ],
      nutrients: { calories: 3010, protein: 179, fat: 86, carbohydrates: 374 },
    },
    friday: {
      meals: [
        { title: "Egg White & Veggie Scramble", calories: 400, protein_g: 35, price_per_serving: 2.0 },
        { title: "Shrimp Fried Rice", calories: 730, protein_g: 44, price_per_serving: 3.9 },
        { title: "Grilled Steak with Roasted Potatoes", calories: 880, protein_g: 58, price_per_serving: 5.2 },
      ],
      nutrients: { calories: 3005, protein: 180, fat: 87, carbohydrates: 361 },
    },
    saturday: {
      meals: [
        { title: "Protein Smoothie Bowl", calories: 440, protein_g: 33, price_per_serving: 2.3 },
        { title: "Turkey Chili", calories: 700, protein_g: 47, price_per_serving: 2.8 },
        { title: "Baked Salmon with Brown Rice", calories: 860, protein_g: 52, price_per_serving: 4.6 },
      ],
      nutrients: { calories: 2998, protein: 177, fat: 85, carbohydrates: 370 },
    },
    sunday: {
      meals: [
        { title: "Breakfast Burrito", calories: 460, protein_g: 34, price_per_serving: 1.9 },
        { title: "Chicken Caesar Wrap", calories: 690, protein_g: 45, price_per_serving: 3.0 },
        { title: "Beef & Broccoli Stir Fry", calories: 840, protein_g: 55, price_per_serving: 3.8 },
      ],
      nutrients: { calories: 3002, protein: 181, fat: 84, carbohydrates: 367 },
    },
  },
  budget_notes:
    "Full week total: ~$62.40 — about $2.40 over your $60 target. Swap the grilled steak (Friday) for chicken thighs to save roughly $3, which brings you comfortably under budget while keeping protein essentially unchanged. Buying rice, oats, and frozen vegetables in bulk keeps the rest of the week cost-efficient.",
  grocery_list: [
    "Greek yogurt",
    "Cottage cheese",
    "Mixed berries",
    "Pineapple",
    "Rolled oats",
    "Eggs / egg whites",
    "Chicken breast",
    "Chicken thighs",
    "Ground turkey",
    "Ground beef",
    "Beef strips",
    "Steak",
    "Pork tenderloin",
    "Salmon fillets",
    "Shrimp",
    "Tuna",
    "White beans",
    "Sweet potatoes",
    "Potatoes",
    "Broccoli",
    "Quinoa",
    "White rice",
    "Brown rice",
    "Mixed frozen vegetables",
    "Tortillas",
  ],
  final_summary:
    "This week keeps you right around 3,000 kcal and 180g of protein a day — squarely in your bulking range. The one move that matters most: swap Friday's steak for chicken thighs to land comfortably under your $60 budget without giving up any protein. Prep your proteins and rice in bulk on Sunday and the rest of the week runs itself — solid week ahead.",
};

export default function ExampleTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-2">
          Here&apos;s what Prep-Agent produces
        </h1>
        <p className="text-[#57534e] dark:text-[#a8a29e]">
          A real sample output. This demo shows a full 7-day week, but your own plan is customized to however many days you ask for.
        </p>
      </div>
      <PlanResults result={SAMPLE_PLAN} />
    </div>
  );
}
