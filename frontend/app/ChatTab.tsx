"use client";

import { useState, useRef, useEffect } from "react";
import { Link as LinkIcon, Check, Paperclip, X } from "lucide-react";
import PlanResults, { cardClass, type PlanResult } from "./PlanResults";
import ScanResults, { type ScanResult } from "./ScanResults";
import EditablePhoto from "./EditablePhoto";
import { extractErrorMessage } from "./apiError";
import { usePlanHistory } from "./usePlanHistory";

const STEPS = ["orchestrator", "macro", "mealplan", "budget", "grocery", "summary"];
const STEP_LABELS: Record<string, string> = {
  orchestrator: "Deciding what your goal needs...",
  macro: "Calculating your daily targets...",
  mealplan: "Building your meal plan...",
  budget: "Reviewing your budget...",
  grocery: "Consolidating your grocery list...",
  summary: "Writing your wrap-up...",
  answer: "Answering your question...",
};
const STEP_SHORT: Record<string, string> = {
  orchestrator: "Route",
  macro: "Macro",
  mealplan: "Meals",
  budget: "Budget",
  grocery: "Grocery",
  summary: "Summary",
  answer: "Answer",
};

const EXAMPLE_PROMPTS = [
  "I'm bulking, need 180g protein/day, budget $60/week",
  "Quick high-protein breakfast ideas",
  "Cutting on a budget, no red meat",
  "Vegetarian meal prep for the week",
];

interface ChatTabProps {
  prefillGoal?: string | null;
  onPrefillConsumed?: () => void;
}

export default function ChatTab({ prefillGoal, onPrefillConsumed }: ChatTabProps) {
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
  const { entries: history, record } = usePlanHistory();

  const hasStarted = result !== null || scanResult !== null || loading;

  useEffect(() => {
    if (prefillGoal) {
      // Onboarding hands us a goal string once, synchronously — not a loop risk.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGoal(prefillGoal);
      requestAnimationFrame(resizeTextarea);
      onPrefillConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillGoal]);

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

  async function runPlan(goalText: string) {
    setLoading(true);
    setError(null);
    setScanResult(null);
    setResult({ goal: goalText });
    setPlanId(null);
    setCopied(false);
    setCurrentStep(null);

    try {
      const res = await fetch("http://localhost:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalText }),
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
      record(goalText);
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
    } else if (goal.trim()) {
      runPlan(goal);
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
      ? "Building your plan..."
      : "Build My Plan";

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

  const inputCard = (
    <div className={`${cardClass} flex flex-col gap-3`}>
      {imagePreview && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Attached food photo"
            className="h-16 w-16 rounded-lg object-cover border border-[var(--border)]"
          />
          <button
            onClick={handleRemoveAttachment}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-red-600"
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
        className="resize-none overflow-hidden border-[1.5px] border-[var(--text)] rounded-[10px] px-5 py-4 text-[15px] leading-relaxed bg-[var(--input)] text-[var(--text)] transition-[height,border-color] duration-150 ease-out focus:outline-none focus:border-[var(--accent)]"
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
          className="h-12 w-12 shrink-0 flex items-center justify-center rounded-full border-[1.5px] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Paperclip size={18} />
        </button>

        <button onClick={handleSubmit} disabled={loading || (!goal.trim() && !attachedFile)} style={submitButtonStyle} className="disabled:opacity-50">
          {buttonLabel}
        </button>
      </div>
    </div>
  );

  if (!hasStarted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center min-h-[64vh] py-10" style={{ animation: "pa-fade-up .4s ease" }}>
        <div className="flex flex-col gap-6">
          <h1 className="font-serif text-[clamp(32px,4.4vw,54px)] font-semibold leading-[1.1] tracking-tight m-0">
            Say what you&apos;re eating for. It plans the week.
          </h1>
          <p className="text-[16px] leading-relaxed text-[var(--muted)] max-w-[42ch] m-0">
            No templates, no guessing your own macros. One line in, a priced 7-day plan out.
          </p>

          <div className="flex flex-col gap-2.5">
            {inputCard}
          </div>

          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <button
                key={example}
                onClick={() => handleExampleClick(example)}
                className="text-[13px] px-3.5 py-2 rounded-full border-[1.5px] border-[var(--border)] bg-[var(--card)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                {example}
              </button>
            ))}
          </div>

          {history.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs font-semibold text-[var(--faint)] uppercase tracking-wider">Recent:</span>
              {history.map((h) => (
                <button
                  key={h.at}
                  onClick={() => runPlan(h.goal)}
                  className="text-[12.5px] px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  {h.goal.length > 34 ? `${h.goal.slice(0, 34)}…` : h.goal}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-7 mt-1">
            <div>
              <div className="font-serif text-[23px] font-semibold">$54.60</div>
              <div className="text-[11.5px] text-[var(--faint)]">this week, sample plan</div>
            </div>
            <div className="w-px bg-[var(--border)]" />
            <div>
              <div className="font-serif text-[23px] font-semibold">185g</div>
              <div className="text-[11.5px] text-[var(--faint)]">protein/day, same plan</div>
            </div>
          </div>
        </div>

        <div className="relative h-[420px] sm:h-[480px] rounded-[20px] overflow-hidden hidden md:block">
          <EditablePhoto slotId="chat-hero" defaultSrc="/hero-meal-prep.jpg" />
          <div
            className="absolute bottom-5 left-5 right-5 bg-[var(--card)] rounded-2xl px-5 py-4 flex justify-between items-center"
            style={{ boxShadow: "0 12px 32px rgba(20,16,8,0.07)" }}
          >
            <span className="text-[13.5px] font-bold">Mon–Sun, done</span>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
            >
              Done in 8s
            </span>
          </div>
        </div>
      </div>
    );
  }

  const currentStepIndex = currentStep ? STEPS.indexOf(currentStep) : -1;

  return (
    <div className="flex flex-col gap-5 max-w-[720px] mx-auto pt-11">
      {inputCard}

      {loading && (
        <div className={`${cardClass} flex flex-col gap-3.5`} style={{ animation: "pa-fade-up .3s ease" }}>
          <div className="flex items-start justify-between">
            {STEPS.map((key, i) => {
              const state = currentStepIndex < 0 ? "upcoming" : i < currentStepIndex ? "done" : i === currentStepIndex ? "current" : "upcoming";
              return (
                <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className="w-[9px] h-[9px] rounded-full mx-auto"
                    style={{
                      background: state === "upcoming" ? "var(--card)" : "var(--accent)",
                      border: state === "upcoming" ? "1.5px solid var(--border)" : "none",
                      animation: state === "current" ? "pa-pulse 1.2s infinite" : undefined,
                    }}
                  />
                  <span className="text-[10.5px] font-bold" style={{ color: state === "upcoming" ? "var(--faint)" : "var(--muted)" }}>
                    {STEP_SHORT[key]}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-center text-[13px] font-bold m-0" style={{ color: "var(--accent)" }}>
            {currentStep ? STEP_LABELS[currentStep] : "Getting started..."}
          </p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cardClass}>
              <div
                className="h-3 rounded-md mb-2"
                style={{
                  width: `${70 - i * 8}%`,
                  background: "linear-gradient(90deg, var(--track) 25%, var(--border) 37%, var(--track) 63%)",
                  backgroundSize: "300px 100%",
                  animation: "pa-shimmer 1.3s infinite linear",
                }}
              />
              <div
                className="h-2.5 rounded-md"
                style={{
                  width: `${45 - i * 5}%`,
                  background: "linear-gradient(90deg, var(--track) 25%, var(--border) 37%, var(--track) 63%)",
                  backgroundSize: "300px 100%",
                  animation: "pa-shimmer 1.3s infinite linear",
                }}
              />
            </div>
          ))}
        </div>
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

      {result && !loading && <PlanResults result={result} />}
      {scanResult && <ScanResults result={scanResult} />}
    </div>
  );
}
