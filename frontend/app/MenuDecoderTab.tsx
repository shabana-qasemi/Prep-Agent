"use client";

import { useState, useRef } from "react";
import { Paperclip, X, UtensilsCrossed } from "lucide-react";
import { cardClass } from "./PlanResults";
import { extractErrorMessage } from "./apiError";

interface MenuPick {
  item_name: string;
  why_it_fits: string;
  estimated_calories: number;
  estimated_protein_g: number;
  estimated_carbs_g: number;
  estimated_fat_g: number;
  modification_tip: string;
}

interface MenuResult {
  picks: MenuPick[];
  menu_note: string;
}

const HOW_STEPS = ["Attach a photo", "We read the menu", "See your best picks"];

const submitButtonStyle = (disabled: boolean): React.CSSProperties => ({
  width: "100%",
  background: disabled ? "var(--accent-disabled)" : "var(--text)",
  color: "var(--bg)",
  border: "none",
  borderRadius: 8,
  padding: "16px",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  cursor: disabled ? "default" : "pointer",
});

export default function MenuDecoderTab() {
  const [goal, setGoal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MenuResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  function handleRemove() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file || !goal.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("goal", goal);

      const res = await fetch("http://localhost:8000/api/menu", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(extractErrorMessage(res.status, body));
      }

      const data: MenuResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Menu decode failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong analyzing this menu.");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || !file || !goal.trim();

  return (
    <div className="flex flex-col gap-5 max-w-[680px] mx-auto pt-11">
      <div className="text-center">
        <h2 className="text-[32px] font-extrabold m-0 mb-1.5">Decode a menu</h2>
        <p className="text-[15px] text-[var(--muted)] m-0">
          Snap a photo of a restaurant menu and get the macro-friendliest picks before you order.
        </p>
      </div>

      <div className="flex justify-center rounded-2xl px-3 py-4" style={{ background: "var(--alt)" }}>
        {HOW_STEPS.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5 text-center px-2">
            <span
              className="w-[26px] h-[26px] rounded-full text-xs font-extrabold flex items-center justify-center"
              style={{ background: "var(--card)", color: "var(--accent)", boxShadow: "0 2px 10px rgba(20,16,8,0.04)" }}
            >
              {i + 1}
            </span>
            <span className="text-xs font-semibold text-[var(--muted)]">{label}</span>
          </div>
        ))}
      </div>

      <div className={`${cardClass} flex flex-col gap-3.5`}>
        <div>
          <label className="text-[13.5px] font-semibold text-[var(--muted)] mb-1.5 block">Your goal</label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. bulking, need high protein and under 700 calories"
            className="w-full border-[1.5px] border-[var(--border)] rounded-xl px-4 py-2.5 text-sm bg-[var(--input)] text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="text-[13.5px] font-semibold text-[var(--muted)] mb-1.5 block">Menu photo</label>
          {preview ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Attached menu photo"
                className="h-16 w-16 rounded-lg object-cover border-[1.5px] border-[var(--border)]"
              />
              <button
                onClick={handleRemove}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-red-600 bg-none border-none cursor-pointer"
              >
                <X size={12} /> Remove photo
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border-[1.5px] border-dashed border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors bg-none cursor-pointer"
            >
              <Paperclip size={16} /> Attach a menu photo
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
        </div>

        <button onClick={handleSubmit} disabled={disabled} style={submitButtonStyle(disabled)} className="disabled:opacity-50">
          {loading ? "Reading menu..." : "Decode menu"}
        </button>
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {result && (
        <div className="flex flex-col gap-2.5" style={{ animation: "pa-fade-up .35s ease" }}>
          <p className="text-[12.5px] text-[var(--faint)] text-center m-0">Ranked by fit with your goal</p>
          {result.picks.map((pick, i) => (
            <div key={i} className={`${cardClass} flex flex-col gap-2.5`}>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-bold text-[15px]">{pick.item_name}</div>
                  <div className="text-[13px] text-[var(--faint)] mt-0.5">
                    {pick.estimated_calories} kcal · {pick.estimated_protein_g}g protein · {pick.estimated_carbs_g}g
                    carbs · {pick.estimated_fat_g}g fat
                  </div>
                </div>
                <span
                  className="text-[11.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                >
                  {i === 0 ? "Best pick" : "Good fit"}
                </span>
              </div>
              <p className="text-sm m-0">{pick.why_it_fits}</p>
              {pick.modification_tip && (
                <p className="text-sm m-0" style={{ color: "var(--accent)" }}>
                  Tip: {pick.modification_tip}
                </p>
              )}
            </div>
          ))}
          <p className="text-[12.5px] text-[var(--faint)] text-center mt-1 flex items-center justify-center gap-1.5">
            <UtensilsCrossed size={12} /> {result.menu_note}
          </p>
        </div>
      )}

      {!result && !loading && (
        <div className="border-[1.5px] border-dashed border-[var(--border)] rounded-[20px] p-8 text-center flex flex-col items-center gap-2.5">
          <UtensilsCrossed size={28} className="text-[var(--border)]" />
          <p className="text-[13.5px] text-[var(--faint)] m-0">
            Attach a menu photo above to see macro-friendly picks appear here.
          </p>
        </div>
      )}
    </div>
  );
}
