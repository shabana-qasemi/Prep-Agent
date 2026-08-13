"use client";

import { useState } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import PlanResults, { cardClass } from "./PlanResults";
import { usePlanStream } from "./usePlanStream";

export default function PantryTab() {
  const [ingredients, setIngredients] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const { loading, result, planId, error, stepLabel, runPlan } = usePlanStream();

  function buildGoalSentence() {
    let goal = `Build a meal plan primarily using ingredients I already have: ${ingredients}. Minimize additional groceries needed — only add a few extra items if truly necessary.`;
    if (notes) goal += ` Additional notes: ${notes}.`;
    return goal;
  }

  function handleSubmit() {
    if (!ingredients.trim()) return;
    runPlan(buildGoalSentence());
  }

  function handleCopyLink() {
    if (!planId) return;
    navigator.clipboard.writeText(`${window.location.origin}/plan/${planId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-2">
          Use My Pantry
        </h1>
        <p className="text-[#57534e] dark:text-[#a8a29e]">
          List what you&apos;ve already got, and Prep-Agent builds a plan around it — minimizing extra grocery trips.
        </p>
      </div>

      <div className={`${cardClass} flex flex-col gap-4`}>
        <div>
          <label className="text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5 block">
            What&apos;s in your kitchen?
          </label>
          <textarea
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="e.g. chicken breast, rice, broccoli, eggs, spinach, canned beans"
            rows={3}
            className="w-full border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-5 py-4 text-[16px] leading-relaxed bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5 block">
            Anything else? (optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. high protein, vegetarian, feeding 2 people"
            className="w-full border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-4 py-2.5 text-[15px] bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !ingredients.trim()}
          className="rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? "Building Your Plan..." : "Build From My Pantry"}
        </button>
      </div>

      {loading && stepLabel && (
        <p className="flex items-center gap-2 text-sm text-[#2563eb] dark:text-[#60a5fa] -mt-2">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {stepLabel}
        </p>
      )}

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      {planId && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 self-start text-sm text-[#2563eb] dark:text-[#60a5fa] -mt-2 hover:underline"
        >
          {copied ? <Check size={14} /> : <LinkIcon size={14} />}
          {copied ? "Link copied!" : "Copy shareable link"}
        </button>
      )}

      {result && <PlanResults result={result} />}
    </div>
  );
}
