"use client";

import { useState } from "react";

const GOALS = ["Build muscle (bulk)", "Lose fat (cut)", "Eat healthier, maintain weight"];
const DIETS = ["Vegetarian", "No red meat", "Dairy-free", "None"];

export default function OnboardingModal({ onFinish }: { onFinish: (goalText: string | null) => void }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<string | null>(null);
  const [diets, setDiets] = useState<string[]>([]);
  const [budget, setBudget] = useState(50);

  function toggleDiet(d: string) {
    setDiets((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function handleNext() {
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    const dietPart = diets.length && !diets.includes("None") ? `, ${diets.join(", ")}` : "";
    const goalText = `${goal || "Eat healthier, maintain weight"}${dietPart}, budget $${budget}/week`;
    onFinish(goalText);
  }

  const nextLabel = step < 2 ? "Continue" : "Get started";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(13,13,13,0.55)", animation: "pa-fade-in .3s ease" }}
    >
      <div
        className="w-full max-w-[480px] bg-[var(--card)] rounded-2xl p-8 sm:p-9"
        style={{ boxShadow: "0 24px 56px rgba(20,16,8,0.1)" }}
      >
        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[5px] flex-1 rounded-full"
              style={{ background: i <= step ? "var(--accent)" : "var(--track)" }}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-1.5" style={{ animation: "pa-fade-up .35s ease" }}>
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--accent)]">Step 1 of 3</span>
            <h2 className="text-2xl sm:text-[26px] font-extrabold mb-1">What&apos;s your goal?</h2>
            <p className="text-sm text-[var(--muted)] mb-4">Just so the numbers make sense later.</p>
            <div className="flex flex-col gap-2.5">
              {GOALS.map((g) => (
                <button
                  key={g}
                  onClick={() => setGoal(g)}
                  className="text-left px-4 py-3.5 rounded-xl border-[1.5px] font-semibold text-[14.5px] cursor-pointer transition-colors"
                  style={{
                    borderColor: goal === g ? "var(--accent)" : "var(--border)",
                    background: goal === g ? "var(--accent-soft)" : "var(--card)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-1.5" style={{ animation: "pa-fade-up .35s ease" }}>
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--accent)]">Step 2 of 3</span>
            <h2 className="text-2xl sm:text-[26px] font-extrabold mb-1">Any dietary restrictions?</h2>
            <p className="text-sm text-[var(--muted)] mb-4">Pick any that apply — or skip.</p>
            <div className="flex flex-wrap gap-2">
              {DIETS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDiet(d)}
                  className="px-3.5 py-2 rounded-full border-[1.5px] font-semibold text-[13.5px] cursor-pointer transition-colors"
                  style={{
                    borderColor: diets.includes(d) ? "var(--accent)" : "var(--border)",
                    background: diets.includes(d) ? "var(--accent-soft)" : "var(--card)",
                    color: diets.includes(d) ? "var(--accent)" : "var(--muted)",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-1.5" style={{ animation: "pa-fade-up .35s ease" }}>
            <span className="text-xs font-bold tracking-wider uppercase text-[var(--accent)]">Step 3 of 3</span>
            <h2 className="text-2xl sm:text-[26px] font-extrabold mb-1">Weekly grocery budget?</h2>
            <p className="text-sm text-[var(--muted)] mb-5">You can always change this later.</p>
            <div className="flex justify-between text-[13.5px] font-semibold mb-2">
              <span>Budget</span>
              <span className="text-[var(--accent)] font-extrabold">${budget}/week</span>
            </div>
            <input
              type="range"
              min={20}
              max={150}
              step={5}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full mb-5"
            />
          </div>
        )}

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => onFinish(null)}
            className="text-[13px] text-[var(--faint)] bg-none border-none cursor-pointer underline"
          >
            Skip
          </button>
          <button
            onClick={handleNext}
            className="rounded-xl px-6 py-3 text-sm font-bold cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
