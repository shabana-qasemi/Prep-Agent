"use client";

import { X } from "lucide-react";

const STEPS = [
  {
    title: "Understands your goal",
    body: "You describe what you want in plain English. Prep-Agent figures out what that actually requires — calorie targets? A budget check? A grocery list? — instead of making you fill out every field every time.",
  },
  {
    title: "Sets your daily targets",
    body: "Calculates the calories and protein/carbs/fat that fit your goal, with the reasoning shown so the numbers aren't a black box.",
  },
  {
    title: "Builds real meals",
    body: "Pulls actual recipes with real nutrition and pricing data — not invented numbers — and links back to the original recipe for every meal.",
  },
  {
    title: "Checks your budget",
    body: "Adds up the real cost of the week and suggests specific swaps if you're over what you asked to spend.",
  },
  {
    title: "Makes your grocery list",
    body: "Combines every ingredient across every meal in the week into one deduplicated list, ready to shop from.",
  },
  {
    title: "Wraps it up",
    body: "Ties the whole plan together in a short, plain-English summary — what to know, and the one thing most worth doing differently.",
  },
];

export default function HowItWorksModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.4)", animation: "pa-fade-in .2s ease" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--card)] rounded-2xl p-7 my-8"
        style={{ boxShadow: "0 24px 56px rgba(20,16,8,0.1)", animation: "pa-fade-up .3s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold">How Prep-Agent works</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--faint)] hover:text-[var(--accent)] bg-none border-none cursor-pointer text-xl leading-none"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[var(--muted)] mb-5">
          Prep-Agent isn&apos;t a fixed script — an orchestrator agent reads your goal and only runs the steps you
          actually need, in order:
        </p>

        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span
                className="shrink-0 h-6 w-6 rounded-full text-xs font-extrabold flex items-center justify-center"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {i + 1}
              </span>
              <div>
                <p className="text-[14.5px] font-bold mb-0.5">{step.title}</p>
                <p className="text-[13.5px] text-[var(--muted)] leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
