"use client";

import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Dumbbell, Apple, Carrot, Beef, Salad, Flame, Link as LinkIcon, Check, Paperclip, X } from "lucide-react";
import PlanResults, { cardClass, type PlanResult } from "./PlanResults";
import ScanResults, { type ScanResult } from "./ScanResults";

const FLOATING_ICONS = [
  { Icon: Dumbbell, top: "8%", left: "6%", size: 110, anim: "float-icon-a 17s ease-in-out infinite", rotate: -12 },
  { Icon: Apple, top: "62%", left: "3%", size: 80, anim: "float-icon-b 14s ease-in-out infinite", rotate: 8 },
  { Icon: Carrot, top: "12%", left: "88%", size: 90, anim: "float-icon-b 20s ease-in-out infinite", rotate: 20 },
  { Icon: Beef, top: "72%", left: "90%", size: 100, anim: "float-icon-a 18s ease-in-out infinite", rotate: -6 },
  { Icon: Salad, top: "40%", left: "94%", size: 70, anim: "float-icon-a 15s ease-in-out infinite", rotate: 5 },
  { Icon: Flame, top: "85%", left: "10%", size: 65, anim: "float-icon-b 13s ease-in-out infinite", rotate: -8 },
];

const STEP_LABELS: Record<string, string> = {
  orchestrator: "Deciding what your goal needs...",
  macro: "Calculating your daily targets...",
  mealplan: "Building your meal plan...",
  budget: "Reviewing your budget...",
  grocery: "Consolidating your grocery list...",
};

const EXAMPLE_PROMPTS = [
  "I'm bulking, need 180g protein/day, budget $60/week",
  "Quick high-protein breakfast ideas",
  "Cutting on a budget, no red meat",
  "Vegetarian meal prep for the week",
];

export default function Home() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasStarted = result !== null || scanResult !== null || loading;

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function resizeTextarea() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  function handleGoalChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setGoal(e.target.value);
    resizeTextarea();
  }

  function handleExampleClick(example: string) {
    setGoal(example);
    requestAnimationFrame(resizeTextarea);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleRemoveAttachment() {
    setAttachedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRunPlan() {
    setLoading(true);
    setError(null);
    setScanResult(null);
    setResult({ goal });
    setPlanId(null);
    setCopied(false);
    setCurrentStep(null);

    try {
      const res = await fetch("http://localhost:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      if (!res.ok || !res.body) {
        const body = await res.text();
        throw new Error(`Server responded with ${res.status}: ${body}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Network reads can split one SSE message across multiple chunks, or
        // bundle several together — buffer and split on the blank-line delimiter.
        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        for (const message of messages) {
          if (!message.startsWith("data: ")) continue;
          const event = JSON.parse(message.slice(6));

          if (event.step === "error") {
            throw new Error(event.message);
          }
          if (event.step === "done") {
            setCurrentStep(null);
            if (event.plan_id) setPlanId(event.plan_id);
            continue;
          }

          setCurrentStep(event.step);
          setResult((prev) => ({ ...(prev as PlanResult), ...event.data }));
        }
      }
    } catch (err) {
      console.error("Plan request failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong while generating your plan.");
      setCurrentStep(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyzePhoto() {
    if (!attachedFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPlanId(null);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append("file", attachedFile);

      const res = await fetch("http://localhost:8000/api/scan", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Server responded with ${res.status}: ${body}`);
      }

      const data: ScanResult = await res.json();
      setScanResult(data);
    } catch (err) {
      console.error("Scan request failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong analyzing this photo.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (attachedFile) {
      handleAnalyzePhoto();
    } else {
      handleRunPlan();
    }
  }

  function handleCopyLink() {
    if (!planId) return;
    navigator.clipboard.writeText(`${window.location.origin}/plan/${planId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const buttonLabel = attachedFile
    ? loading
      ? "Analyzing Photo..."
      : "Analyze Photo"
    : loading
      ? "Building Your Plan..."
      : "Build My Plan";

  const inputCard = (
    <div className={`${cardClass} flex flex-col gap-3`}>
      {imagePreview && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Attached food photo"
            className="h-16 w-16 rounded-lg object-cover border border-[#e8dcc0] dark:border-[#3a2f4d]"
          />
          <button
            onClick={handleRemoveAttachment}
            className="flex items-center gap-1 text-xs text-[#5c5346] dark:text-[#c2b89f] hover:text-red-600 dark:hover:text-red-400"
          >
            <X size={12} /> Remove photo
          </button>
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={goal}
        onChange={handleGoalChange}
        placeholder="e.g. I'm bulking, need 180g protein/day, budget $60/week"
        rows={1}
        className="resize-none overflow-hidden border border-[#e8dcc0] dark:border-[#3a2f4d] rounded-2xl px-5 py-4 text-[16px] leading-relaxed bg-[#faf6ef] dark:bg-[#120f1a] text-[#2a2318] dark:text-[#f3ead9] placeholder:text-[#a89b7d] transition-[height,box-shadow,border-color] duration-150 ease-out focus:outline-none focus:border-[#6b2394] focus:ring-4 focus:ring-[#6b2394]/15"
      />

      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach a food photo"
          title="Attach a food photo"
          className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border border-[#e8dcc0] dark:border-[#3a2f4d] text-[#5c5346] dark:text-[#c2b89f] hover:border-[#6b2394] hover:text-[#8b1d6f] dark:hover:text-[#d68fd6] transition-colors"
        >
          <Paperclip size={18} />
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading || (!goal && !attachedFile)}
          className="flex-1 rounded-full bg-[#5b1f8a] hover:bg-[#6e26a8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen bg-[#faf6ef] dark:bg-[#120f1a] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[36rem] w-[52rem] rounded-full opacity-60 dark:opacity-40 blur-3xl"
        style={{
          backgroundImage:
            "linear-gradient(180deg, #180a30 0%, #6e1a68 22%, #d21567 45%, #ef5f76 68%, #c8d94a 100%)",
        }}
      />

      {FLOATING_ICONS.map(({ Icon, top, left, size, anim, rotate }, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute text-[#8b1d6f]/10 dark:text-[#d68fd6]/10"
          style={{ top, left, animation: anim, transform: `rotate(${rotate}deg)` }}
        >
          <Icon size={size} strokeWidth={1} />
        </div>
      ))}

      <button
        onClick={toggleDarkMode}
        aria-label="Toggle dark mode"
        className="fixed top-6 right-6 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-[#fffdf9]/80 dark:bg-[#1c1728]/80 border border-[#d4af37]/30 backdrop-blur text-lg"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {!hasStarted ? (
        // Empty state — centered, minimal, like hitting "New Chat"
        <main className="relative min-h-screen flex flex-col items-center justify-center px-6 gap-6">
          <div className="flex flex-col items-center gap-2 text-center mb-2">
            <span className="text-sm font-medium text-[#8b1d6f] dark:text-[#d68fd6] tracking-[0.15em] uppercase">
              Prep-Agent
            </span>
            <h1 className="font-serif text-4xl leading-tight font-semibold text-[#2a2318] dark:text-[#f3ead9]">
              What&apos;s the plan today?
            </h1>
          </div>

          <div className="w-full max-w-2xl flex flex-col gap-4">
            {inputCard}

            <div className="flex flex-wrap justify-center gap-2">
              {EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="text-sm px-4 py-2 rounded-full border border-[#e8dcc0] dark:border-[#3a2f4d] text-[#5c5346] dark:text-[#c2b89f] hover:border-[#6b2394] hover:text-[#8b1d6f] dark:hover:text-[#d68fd6] transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </main>
      ) : (
        // Active/results state — top-down, same as before
        <main className="relative max-w-2xl mx-auto px-6 py-16 flex flex-col gap-6">
          <header className="flex flex-col gap-1 mb-2">
            <span className="text-sm font-medium text-[#8b1d6f] dark:text-[#d68fd6] tracking-[0.15em] uppercase">
              Prep-Agent
            </span>
          </header>

          {inputCard}

          {loading && currentStep && (
            <p className="flex items-center gap-2 text-sm text-[#8b1d6f] dark:text-[#d68fd6] -mt-2">
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {STEP_LABELS[currentStep] ?? currentStep}
            </p>
          )}

          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          )}

          {planId && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 self-start text-sm text-[#8b1d6f] dark:text-[#d68fd6] -mt-2 hover:underline"
            >
              {copied ? <Check size={14} /> : <LinkIcon size={14} />}
              {copied ? "Link copied!" : "Copy shareable link"}
            </button>
          )}

          {result && <PlanResults result={result} />}
          {scanResult && <ScanResults result={scanResult} />}
        </main>
      )}
    </div>
  );
}
