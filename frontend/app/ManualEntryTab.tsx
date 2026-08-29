"use client";

import { useState } from "react";
import { Link as LinkIcon, Check } from "lucide-react";
import PlanResults, { cardClass } from "./PlanResults";
import { usePlanStream } from "./usePlanStream";

const PRESETS = [
  { label: "Bulk", values: { calories: 2900, protein: 190, carbs: 320, fat: 90, budget: 65 } },
  { label: "Cut", values: { calories: 1800, protein: 170, carbs: 140, fat: 55, budget: 55 } },
  { label: "Maintain", values: { calories: 2300, protein: 150, carbs: 230, fat: 75, budget: 50 } },
];

interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  budget: number;
}

const FIELD_DEFS = [
  { key: "calories" as const, label: "Calories / day", unit: " kcal", min: 1400, max: 4000, step: 50, dot: "var(--text)" },
  { key: "protein" as const, label: "Protein / day", unit: "g", min: 60, max: 260, step: 5, dot: "var(--accent)" },
  { key: "carbs" as const, label: "Carbs / day", unit: "g", min: 50, max: 450, step: 10, dot: "var(--accent2)" },
  { key: "fat" as const, label: "Fat / day", unit: "g", min: 30, max: 150, step: 5, dot: "var(--faint)" },
  { key: "budget" as const, label: "Weekly budget", unit: "", prefix: "$", min: 20, max: 150, step: 5, dot: "transparent" },
];

export default function ManualEntryTab() {
  const [targets, setTargets] = useState<Targets>({ calories: 2200, protein: 150, carbs: 220, fat: 70, budget: 50 });
  const [days, setDays] = useState(7);
  const [restrictions, setRestrictions] = useState("");
  const [copied, setCopied] = useState(false);

  const { loading, result, planId, error, stepLabel, runPlan } = usePlanStream();

  function setField(key: keyof Targets, value: number) {
    setTargets((prev) => ({ ...prev, [key]: value }));
  }

  function buildGoalSentence() {
    let sentence = `Custom targets: ${targets.calories} kcal, ${targets.protein}g protein, ${targets.carbs}g carbs, ${targets.fat}g fat, budget $${targets.budget}/week, plan for ${days} days.`;
    if (restrictions.trim()) sentence += ` Dietary restrictions: ${restrictions.trim()}.`;
    return sentence;
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

  const fromMacros = targets.protein * 4 + targets.carbs * 4 + targets.fat * 9;
  const diff = fromMacros - targets.calories;
  const mismatchColor = Math.abs(diff) > 150 ? "var(--accent2)" : "var(--accent)";
  const macroTotal = fromMacros || 1;
  const proteinPct = Math.round(((targets.protein * 4) / macroTotal) * 100);
  const carbsPct = Math.round(((targets.carbs * 4) / macroTotal) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  const submitButtonStyle: React.CSSProperties = {
    width: "100%",
    background: loading ? "var(--accent-disabled)" : "var(--text)",
    color: "var(--bg)",
    border: "none",
    borderRadius: 8,
    padding: "16px",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    cursor: loading ? "default" : "pointer",
  };

  return (
    <div className="flex flex-col gap-5 max-w-[640px] mx-auto pt-11">
      <div className="text-center">
        <h2 className="text-[32px] font-extrabold m-0 mb-1.5">Set your own targets</h2>
        <p className="text-[15px] text-[var(--muted)] m-0">
          Skip the estimating — put in the exact numbers and we&apos;ll build around them.
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setTargets(p.values)}
            className="text-[13px] font-semibold px-4 py-2 rounded-full border-[1.5px] border-[var(--border)] bg-[var(--card)] text-[var(--muted)] cursor-pointer hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className={`${cardClass} flex flex-col gap-5`}>
        {FIELD_DEFS.map((field) => (
          <div key={field.key}>
            <div className="flex justify-between text-[13.5px] font-semibold mb-2">
              <span className="flex items-center gap-2">
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: field.dot }} />
                {field.label}
              </span>
              <span style={{ color: "var(--accent)" }} className="font-bold">
                {field.prefix ?? ""}
                {targets[field.key]}
                {field.unit}
              </span>
            </div>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={targets[field.key]}
              onChange={(e) => setField(field.key, Number(e.target.value))}
              className="w-full"
            />
          </div>
        ))}

        <div>
          <div className="flex justify-between text-[13.5px] font-semibold mb-2">
            <span className="flex items-center gap-2">
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--faint)" }} />
              Days needed
            </span>
            <span style={{ color: "var(--accent)" }} className="font-bold">
              {days} {days === 1 ? "day" : "days"}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <div className="flex justify-between text-[12.5px] font-semibold text-[var(--muted)] mb-2">
            <span>Calories from macros</span>
            <span style={{ color: mismatchColor }}>
              {fromMacros} kcal ({diff > 0 ? "+" : ""}
              {diff} vs target)
            </span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex" style={{ background: "var(--track)" }}>
            <div style={{ width: `${proteinPct}%`, background: "var(--accent)" }} />
            <div style={{ width: `${carbsPct}%`, background: "var(--accent2)" }} />
            <div style={{ width: `${fatPct}%`, background: "var(--faint)" }} />
          </div>
          <div className="flex gap-4 mt-2 text-[11.5px] text-[var(--faint)]">
            <span className="flex items-center gap-1.5">
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--accent)" }} />
              Protein {proteinPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--accent2)" }} />
              Carbs {carbsPct}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: "var(--faint)" }} />
              Fat {fatPct}%
            </span>
          </div>
        </div>

        <div>
          <label className="text-[13.5px] font-semibold text-[var(--muted)] mb-1.5 block">
            Dietary restrictions (optional)
          </label>
          <input
            type="text"
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="e.g. vegetarian, no dairy"
            className="w-full border-[1.5px] border-[var(--border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <button onClick={handleSubmit} disabled={loading} style={submitButtonStyle} className="disabled:opacity-50">
          {loading ? "Building your plan..." : "Generate plan from these targets"}
        </button>
      </div>

      {loading && stepLabel && (
        <p className="flex items-center gap-2 text-sm -mt-2" style={{ color: "var(--accent)" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {stepLabel}
        </p>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {planId && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 self-start text-sm -mt-2 hover:underline bg-none border-none cursor-pointer"
          style={{ color: "var(--accent)" }}
        >
          {copied ? <Check size={14} /> : <LinkIcon size={14} />}
          {copied ? "Link copied!" : "Copy shareable link"}
        </button>
      )}

      {result && <PlanResults result={result} planId={planId} />}
    </div>
  );
}
