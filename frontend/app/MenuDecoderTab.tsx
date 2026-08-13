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

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-2">Menu Decoder</h1>
        <p className="text-[#57534e] dark:text-[#a8a29e]">
          Snap a photo of a restaurant menu and get AI-picked options that fit your goal.
        </p>
      </div>

      <div className={`${cardClass} flex flex-col gap-4`}>
        <div>
          <label className="text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5 block">
            Your goal
          </label>
          <input
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. bulking, need high protein and under 700 calories"
            className="w-full border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-4 py-2.5 text-[15px] bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] placeholder:text-[#a8a29e] focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#57534e] dark:text-[#a8a29e] mb-1.5 block">
            Menu photo
          </label>
          {preview ? (
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Attached menu photo"
                className="h-16 w-16 rounded-lg object-cover border border-[#e7e5e4] dark:border-[#292524]"
              />
              <button
                onClick={handleRemove}
                className="flex items-center gap-1 text-xs text-[#57534e] dark:text-[#a8a29e] hover:text-red-600 dark:hover:text-red-400"
              >
                <X size={12} /> Remove photo
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-lg border border-dashed border-[#e7e5e4] dark:border-[#292524] text-[#57534e] dark:text-[#a8a29e] hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-colors"
            >
              <Paperclip size={16} /> Attach a menu photo
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !file || !goal.trim()}
          className="rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? "Reading Menu..." : "Decode Menu"}
        </button>
      </div>

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      {result && (
        <section className={cardClass}>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-[#1c1917] dark:text-[#f5f5f4] mb-1">
            <UtensilsCrossed size={18} /> Best Picks For You
          </h2>
          <p className="text-xs text-[#a8a29e] dark:text-[#78716c] italic mb-4">{result.menu_note}</p>
          <div className="flex flex-col gap-4">
            {result.picks.map((pick, i) => (
              <div
                key={i}
                className="border-t border-[#e7e5e4] dark:border-[#292524] pt-4 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-wrap justify-between items-baseline gap-x-3">
                  <p className="font-medium text-[#1c1917] dark:text-[#f5f5f4]">{pick.item_name}</p>
                  <p className="text-sm text-[#57534e] dark:text-[#a8a29e] shrink-0">
                    {pick.estimated_calories} kcal · {pick.estimated_protein_g}g protein ·{" "}
                    {pick.estimated_carbs_g}g carbs · {pick.estimated_fat_g}g fat
                  </p>
                </div>
                <p className="text-sm text-[#292524] dark:text-[#d6d3d1] mt-1">{pick.why_it_fits}</p>
                {pick.modification_tip && (
                  <p className="text-sm text-[#2563eb] dark:text-[#60a5fa] mt-1">
                    Tip: {pick.modification_tip}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
