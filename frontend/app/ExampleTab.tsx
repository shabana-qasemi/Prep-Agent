"use client";

import Image from "next/image";
import { UtensilsCrossed, Link as LinkIcon } from "lucide-react";
import PlanResults from "./PlanResults";
import { usePlanStream } from "./usePlanStream";

interface Preset {
  tag: string;
  title: string;
  subtitle: string;
  goal: string;
  image?: string;
}

const PRESETS: Preset[] = [
  {
    tag: "Bulking",
    title: "Lean bulk on a budget",
    subtitle: "Bulking, 180g protein/day, $60/week budget",
    goal: "Bulking, 180g protein/day, $60/week budget",
    image: "/hero-protein-bowl.jpg",
  },
  {
    tag: "Cutting",
    title: "Fast cut, no red meat",
    subtitle: "Cutting, no red meat, high protein",
    goal: "Cutting, no red meat, high protein",
  },
  {
    tag: "Vegetarian",
    title: "Vegetarian week",
    subtitle: "Vegetarian meal prep for the week",
    goal: "Vegetarian meal prep for the week",
  },
  {
    tag: "General health",
    title: "Just eat better",
    subtitle: "I just want to eat better this week",
    goal: "I just want to eat better this week",
    image: "/hero-meal-prep.jpg",
  },
  {
    tag: "Family",
    title: "Family-size batch cook",
    subtitle: "Batch cook meals for a family of 4, budget $120/week",
    goal: "Batch cook meals for a family of 4, budget $120/week",
  },
  {
    tag: "Busy schedule",
    title: "High-protein on the go",
    subtitle: "Quick grab-and-go high-protein meals for a busy week",
    goal: "Quick grab-and-go high-protein meals for a busy week",
  },
  {
    tag: "Performance",
    title: "Post-workout recovery",
    subtitle: "Meals optimized for muscle recovery after training",
    goal: "Meals optimized for muscle recovery after training",
  },
  {
    tag: "Budget",
    title: "Tight student budget",
    subtitle: "Cheap, filling meals on a $35/week student budget",
    goal: "Cheap, filling meals on a $35/week student budget",
  },
  {
    tag: "Sustainable",
    title: "Zero food waste week",
    subtitle: "Plan meals that use up everything, minimal waste",
    goal: "Plan meals that use up everything, minimal waste",
  },
];

export default function ExampleTab() {
  const { loading, result, planId, error, stepLabel, runPlan } = usePlanStream();

  function handleCopyLink() {
    if (!planId) return;
    navigator.clipboard.writeText(`${window.location.origin}/plan/${planId}`);
  }

  return (
    <div className="flex flex-col gap-7 pt-11">
      <div className="text-center flex flex-col gap-3">
        <h2 className="text-[32px] font-extrabold m-0">Try a ready-made goal</h2>
        <p className="text-[15px] text-[var(--muted)] m-0">
          Skip typing — pick a scenario and see the full orchestrator run for real.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.title}
            onClick={() => runPlan(preset.goal)}
            disabled={loading}
            className="bg-[var(--card)] border-[1.5px] border-[var(--border)] rounded-2xl overflow-hidden text-left cursor-pointer transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-default flex flex-col"
          >
            <div className="h-[140px] overflow-hidden relative shrink-0" style={{ background: "var(--accent-soft)" }}>
              {preset.image ? (
                <Image src={preset.image} alt="" fill className="object-cover dark:brightness-[0.55] dark:contrast-125" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <UtensilsCrossed size={32} style={{ color: "var(--accent)" }} className="opacity-40" />
                </div>
              )}
            </div>
            <div className="px-5 py-[18px] flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
                {preset.tag}
              </span>
              <div className="font-bold text-[15.5px]">{preset.title}</div>
              <div className="text-[13px] text-[var(--faint)] leading-relaxed">{preset.subtitle}</div>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <p className="flex items-center gap-2 text-sm justify-center" style={{ color: "var(--accent)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {stepLabel}
        </p>
      )}

      {error && <p className="text-red-600 text-sm text-center">{error}</p>}

      {planId && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 self-center text-sm hover:underline bg-none border-none cursor-pointer"
          style={{ color: "var(--accent)" }}
        >
          <LinkIcon size={14} /> Copy shareable link
        </button>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-4 max-w-[720px] mx-auto w-full" style={{ animation: "pa-fade-up .4s ease" }}>
          <PlanResults result={result} />
        </div>
      )}
    </div>
  );
}
