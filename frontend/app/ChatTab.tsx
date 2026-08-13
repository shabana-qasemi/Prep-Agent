"use client";

import { useState, useRef } from "react";
import { Link as LinkIcon, Check, Paperclip, X } from "lucide-react";
import PlanResults, { cardClass, type PlanResult } from "./PlanResults";
import ScanResults, { type ScanResult } from "./ScanResults";
import { extractErrorMessage } from "./apiError";

const STEP_LABELS: Record<string, string> = {
  orchestrator: "Deciding what your goal needs...",
  macro: "Calculating your daily targets...",
  mealplan: "Building your meal plan...",
  budget: "Reviewing your budget...",
  grocery: "Consolidating your grocery list...",
  summary: "Writing your wrap-up...",
};

const EXAMPLE_PROMPTS = [
  "I'm bulking, need 180g protein/day, budget $60/week",
  "Quick high-protein breakfast ideas",
  "Cutting on a budget, no red meat",
  "Vegetarian meal prep for the week",
];

export default function ChatTab() {
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasStarted = result !== null || scanResult !== null || loading;

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
        throw new Error(extractErrorMessage(res.status, body));
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
        throw new Error(extractErrorMessage(res.status, body));
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
            className="h-16 w-16 rounded-lg object-cover border border-[#e7e5e4] dark:border-[#292524]"
          />
          <button
            onClick={handleRemoveAttachment}
            className="flex items-center gap-1 text-xs text-[#57534e] dark:text-[#a8a29e] hover:text-red-600 dark:hover:text-red-400"
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
        className="resize-none overflow-hidden border border-[#e7e5e4] dark:border-[#292524] rounded-xl px-5 py-4 text-[16px] leading-relaxed bg-[#fafaf9] dark:bg-[#0c0a09] text-[#1c1917] dark:text-[#f5f5f4] placeholder:text-[#a8a29e] transition-[height,box-shadow,border-color] duration-150 ease-out focus:outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/15"
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
          className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border border-[#e7e5e4] dark:border-[#292524] text-[#57534e] dark:text-[#a8a29e] hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-colors"
        >
          <Paperclip size={18} />
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading || (!goal && !attachedFile)}
          className="flex-1 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium px-6 py-3.5 shadow-sm hover:shadow-md transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );

  if (!hasStarted) {
    return (
      <div className="flex flex-col items-center gap-6 py-10">
        <div className="flex flex-col items-center gap-2 text-center mb-2">
          <h1 className="text-3xl sm:text-4xl leading-tight font-semibold text-[#1c1917] dark:text-[#f5f5f4]">
            What&apos;s the plan today?
          </h1>
          <p className="text-[#57534e] dark:text-[#a8a29e]">
            Describe your goal in plain English, or attach a food photo to scan its calories and macros instantly.
          </p>
        </div>

        <div className="w-full flex flex-col gap-4">
          {inputCard}

          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="text-sm px-4 py-2 rounded-lg border border-[#e7e5e4] dark:border-[#292524] text-[#57534e] dark:text-[#a8a29e] hover:border-[#2563eb] hover:text-[#2563eb] dark:hover:text-[#60a5fa] transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {inputCard}

      {loading && currentStep && (
        <p className="flex items-center gap-2 text-sm text-[#2563eb] dark:text-[#60a5fa] -mt-2">
          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          {STEP_LABELS[currentStep] ?? currentStep}
        </p>
      )}

      {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

      {planId && (
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-2 self-start text-sm text-[#2563eb] dark:text-[#60a5fa] -mt-2 hover:underline"
        >
          {copied ? <Check size={14} /> : <LinkIcon size={14} />}
          {copied ? "Link copied!" : "Copy shareable link"}
        </button>
      )}

      {result && <PlanResults result={result} />}
      {scanResult && <ScanResults result={scanResult} />}
    </div>
  );
}
