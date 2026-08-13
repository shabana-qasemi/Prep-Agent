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
      className="fixed inset-0 z-30 flex items-start sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-[#292524] rounded-xl shadow-lg p-6 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4]">
            How Prep-Agent works
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[#57534e] dark:text-[#a8a29e] hover:text-[#2563eb] dark:hover:text-[#60a5fa]"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-[#57534e] dark:text-[#a8a29e] mb-5">
          Prep-Agent isn&apos;t a fixed script — an orchestrator agent reads your goal and only runs the steps you
          actually need, in order:
        </p>

        <ol className="flex flex-col gap-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="shrink-0 h-6 w-6 rounded-full bg-[#2563eb]/10 dark:bg-[#60a5fa]/10 text-[#2563eb] dark:text-[#60a5fa] text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-[#1c1917] dark:text-[#f5f5f4]">{step.title}</p>
                <p className="text-sm text-[#57534e] dark:text-[#a8a29e]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
