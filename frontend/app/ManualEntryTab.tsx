"use client";

import { useState } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import PlanResults, { cardClass } from "./PlanResults";
import { usePlanStream } from "./usePlanStream";

const GOAL_TYPES = ["Bulking", "Cutting", "Maintaining"] as const;

const inputClass =
  "border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-4 py-2.5 text-[15px] bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15";

const labelClass = "text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5";

export default function ManualEntryTab() {
  const [goalType, setGoalType] = useState<(typeof GOAL_TYPES)[number]>("Bulking");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [budget, setBudget] = useState("");
  const [days, setDays] = useState("7");
  const [restrictions, setRestrictions] = useState("");
  const [copied, setCopied] = useState(false);

  const { loading, result, planId, error, stepLabel, runPlan } = usePlanStream();

  function buildGoalSentence() {
    const parts = [`I'm ${goalType.toLowerCase()}.`];
    if (calories) parts.push(`Target ${calories} calories/day.`);
    if (protein) parts.push(`Target ${protein}g protein/day.`);
    if (budget) parts.push(`Budget $${budget}/week.`);
    if (restrictions) parts.push(`Dietary restrictions: ${restrictions}.`);
    parts.push(`Plan for ${days || 7} days.`);
    return parts.join(" ");
  }

  function handleSubmit() {
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
          Manual Entry
        </h1>
        <p className="text-[#57534e] dark:text-[#a8a29e]">
          Fill in your targets and preferences directly — no need to write out your goal in words.
        </p>
      </div>

      <div className={`${cardClass} flex flex-col gap-4`}>
        <div>
          <p className={labelClass}>Goal</p>
          <div className="flex gap-2">
            {GOAL_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setGoalType(type)}
                className={`flex-1 px-2 sm:px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-colors whitespace-nowrap ${
                  goalType === type
                    ? "border-[#2563eb] bg-[#2563eb]/10 text-[#2563eb] dark:text-[#60a5fa]"
                    : "border-[#e7e5e4] dark:border-[#292524] text-[#57534e] dark:text-[#a8a29e]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Daily calories (optional)</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="e.g. 3000"
              className={`${inputClass} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Daily protein, g (optional)</label>
            <input
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              placeholder="e.g. 180"
              className={`${inputClass} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Weekly budget, $ (optional)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g. 60"
              className={`${inputClass} w-full`}
            />
          </div>
          <div>
            <label className={labelClass}>Days needed</label>
            <input
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={`${inputClass} w-full`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Dietary restrictions (optional)</label>
          <input
            type="text"
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="e.g. vegetarian, no dairy"
            className={`${inputClass} w-full`}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? "Building Your Plan..." : "Generate Plan"}
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
