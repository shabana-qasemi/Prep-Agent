"use client";

import { useState } from "react";
import Image from "next/image";
import { Link as LinkIcon, Check } from "lucide-react";
import PlanResults, { cardClass } from "./PlanResults";
import { usePlanStream } from "./usePlanStream";

const SUGGESTIONS = ["Chicken breast", "Rice", "Eggs", "Onion", "Garlic", "Canned beans", "Pasta", "Frozen veggies"];

export default function PantryTab() {
  const [items, setItems] = useState<string[]>(["Eggs", "Spinach", "Rice", "Olive oil"]);
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const { loading, result, planId, error, stepLabel, runPlan } = usePlanStream();

  function addItem(name: string) {
    const trimmed = name.trim();
    if (!trimmed || items.includes(trimmed)) return;
    setItems((prev) => [...prev, trimmed]);
  }

  function handleAddFromInput() {
    addItem(input);
    setInput("");
  }

  function removeItem(name: string) {
    setItems((prev) => prev.filter((i) => i !== name));
  }

  function buildGoalSentence() {
    let goal = `Build a meal plan primarily using ingredients I already have: ${items.join(", ") || "nothing added yet"}. Minimize additional groceries needed — only add a few extra items if truly necessary.`;
    if (notes.trim()) goal += ` Additional notes: ${notes.trim()}.`;
    return goal;
  }

  function handleSubmit() {
    if (items.length === 0) return;
    runPlan(buildGoalSentence());
  }

  function handleCopyLink() {
    if (!planId) return;
    navigator.clipboard.writeText(`${window.location.origin}/plan/${planId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const submitButtonStyle: React.CSSProperties = {
    width: "100%",
    background: loading || items.length === 0 ? "var(--accent-disabled)" : "var(--text)",
    color: "var(--bg)",
    border: "none",
    borderRadius: 8,
    padding: "16px",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    cursor: loading || items.length === 0 ? "default" : "pointer",
  };

  return (
    <div className="flex flex-col gap-7 pt-11">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
        <div className="relative h-[280px] sm:h-[380px] rounded-[20px] overflow-hidden hidden md:block">
          <Image src="/hero-protein-bowl.jpg" alt="" fill className="object-cover dark:brightness-[0.55] dark:contrast-125" />
          <div
            className="absolute top-4 left-4 bg-[var(--card)] rounded-2xl px-3.5 py-1.5 text-[12.5px] font-bold"
            style={{ boxShadow: "0 2px 10px rgba(20,16,8,0.04)" }}
          >
            {items.length} item{items.length === 1 ? "" : "s"} added
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-[32px] font-extrabold m-0">What&apos;s in your kitchen?</h2>
          <p className="text-[15px] text-[var(--muted)] m-0">
            Prep-Agent plans around what you already have, so less goes to waste.
          </p>

          <div className={`${cardClass} flex flex-col gap-4`}>
            <div className="flex gap-2.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddFromInput()}
                placeholder="e.g. Chickpeas"
                className="flex-1 border-[1.5px] border-[var(--border)] rounded-xl px-3.5 py-3 text-sm bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
              />
              <button
                onClick={handleAddFromInput}
                className="rounded-xl px-5 font-bold text-sm cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: "var(--text)", color: "var(--bg)" }}
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.filter((s) => !items.includes(s)).slice(0, 6).map((s) => (
                <button
                  key={s}
                  onClick={() => addItem(s)}
                  className="text-[12.5px] px-3 py-1.5 rounded-2xl border border-dashed border-[var(--border)] bg-none text-[var(--muted)] cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>

            {items.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-2 rounded-full pl-3.5 pr-2 py-1.5 text-[13.5px]"
                    style={{ background: "var(--alt)" }}
                  >
                    {item}
                    <button
                      onClick={() => removeItem(item)}
                      className="bg-none border-none cursor-pointer text-[var(--faint)] text-sm leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[13.5px] text-[var(--faint)] m-0">No items yet — add a few staples to get started.</p>
            )}

            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else? e.g. high protein, vegetarian, feeding 2 people"
              className="w-full border-[1.5px] border-[var(--border)] rounded-xl px-3.5 py-2.5 text-sm bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
            />

            <button onClick={handleSubmit} disabled={loading || items.length === 0} style={submitButtonStyle} className="disabled:opacity-50">
              {loading ? "Building your plan..." : "Plan around my pantry"}
            </button>
          </div>
        </div>
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

      {result && <PlanResults result={result} />}
    </div>
  );
}
