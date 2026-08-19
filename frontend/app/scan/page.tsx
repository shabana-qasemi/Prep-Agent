"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Camera, ArrowLeft } from "lucide-react";
import { cardClass } from "../PlanResults";
import ScanResults, { type ScanResult } from "../ScanResults";
import { extractErrorMessage } from "../apiError";

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
        throw new Error(extractErrorMessage(res.status, body));
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

  const submitButtonStyle: React.CSSProperties = {
    background: loading || !selectedFile ? "var(--accent-disabled)" : "var(--text)",
    color: "var(--bg)",
    border: "none",
    borderRadius: 8,
    padding: "16px",
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    cursor: loading || !selectedFile ? "default" : "pointer",
  };

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <main className="relative max-w-2xl mx-auto px-6 py-16 flex flex-col gap-6">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--accent)] w-fit">
          <ArrowLeft size={14} /> Back to meal planner
        </Link>

        <header className="flex flex-col gap-3 mb-2">
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
            Photo Food Scanner
          </span>
          <h1 className="font-serif text-4xl leading-tight font-semibold m-0">Snap it, we&apos;ll estimate it</h1>
          <p className="text-[16px] leading-relaxed text-[var(--muted)] m-0">
            Upload a photo of your food and Claude will estimate its calories and macros. This is a visual estimate,
            not a precise lab measurement — portion size and hidden ingredients (oil, sauces) can shift the real
            numbers.
          </p>
        </header>

        <div className={`${cardClass} flex flex-col gap-4`}>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-10 transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--accent)" }}
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

          <button onClick={handleAnalyze} disabled={loading || !selectedFile} style={submitButtonStyle} className="disabled:opacity-50">
            {loading ? "Analyzing..." : "Analyze Photo"}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        {result && <ScanResults result={result} />}
      </main>
    </div>
  );
}
