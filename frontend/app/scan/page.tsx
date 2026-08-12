"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, ArrowLeft } from "lucide-react";
import { cardClass } from "../PlanResults";
import ScanResults, { type ScanResult } from "../ScanResults";

export default function ScanPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleAnalyze() {
    if (!selectedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("http://localhost:8000/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Server responded with ${res.status}: ${body}`);
      }

      const data: ScanResult = await res.json();
      setResult(data);
    } catch (err) {
      console.error("Scan request failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong analyzing this photo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen bg-[#faf6ef] dark:bg-[#120f1a]">
      <main className="relative max-w-2xl mx-auto px-6 py-16 flex flex-col gap-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-[#5c5346] dark:text-[#c2b89f] hover:text-[#8b1d6f] dark:hover:text-[#d68fd6] w-fit"
        >
          <ArrowLeft size={14} /> Back to meal planner
        </Link>

        <header className="flex flex-col gap-3 mb-2">
          <span className="text-sm font-medium text-[#8b1d6f] dark:text-[#d68fd6] tracking-[0.15em] uppercase">
            Photo Food Scanner
          </span>
          <h1 className="font-serif text-4xl leading-tight font-semibold text-[#2a2318] dark:text-[#f3ead9]">
            Snap it, we&apos;ll estimate it
          </h1>
          <p className="text-[17px] leading-relaxed text-[#524a3c] dark:text-[#c2b89f]">
            Upload a photo of your food and Claude will estimate its calories and macros.
            This is a visual estimate, not a precise lab measurement — portion size and
            hidden ingredients (oil, sauces) can shift the real numbers.
          </p>
        </header>

        <div className={`${cardClass} flex flex-col gap-4`}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#e8dcc0] dark:border-[#3a2f4d] py-10 text-[#8b1d6f] dark:text-[#d68fd6] hover:border-[#6b2394] transition-colors"
          >
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imagePreview} alt="Selected food" className="max-h-64 rounded-xl object-contain" />
            ) : (
              <>
                <Camera size={32} strokeWidth={1.5} />
                <span className="text-sm">Click to choose a photo</span>
              </>
            )}
          </button>

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedFile}
            className="rounded-full bg-[#5b1f8a] hover:bg-[#6e26a8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {loading ? "Analyzing..." : "Analyze Photo"}
          </button>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

        {result && <ScanResults result={result} />}
      </main>
    </div>
  );
}
