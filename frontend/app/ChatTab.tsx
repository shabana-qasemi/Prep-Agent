"use client";

import { useState, useRef, useEffect } from "react";
import { Link as LinkIcon, Check, Paperclip, X, Plus } from "lucide-react";
import PlanResults, { cardClass, type PlanResult } from "./PlanResults";
import ScanResults, { type ScanResult } from "./ScanResults";
import EditablePhoto from "./EditablePhoto";
import { extractErrorMessage } from "./apiError";
import { useVisitorId } from "./useVisitorId";

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

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  result?: PlanResult;
  planId?: string | null;
}

interface ChatTabProps {
  prefillGoal?: string | null;
  onPrefillConsumed?: () => void;
  resumeConversationId?: string | null;
  onResumeConsumed?: () => void;
}

export default function ChatTab({ prefillGoal, onPrefillConsumed, resumeConversationId, onResumeConsumed }: ChatTabProps) {
  const visitorId = useVisitorId();
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasStarted = messages.length > 0 || scanResult !== null || loading;

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

  // Loading a past chat from the history panel: fetch its full transcript,
  // and for any assistant turn that produced a plan, fetch that plan too so
  // the meal plan / grocery list render exactly as they did originally.
  useEffect(() => {
    if (!resumeConversationId) return;

    async function loadConversation(id: string) {
      setLoading(true);
      setError(null);
      setScanResult(null);
      try {
        const res = await fetch(`http://localhost:8000/api/conversations/${id}/messages`);
        if (!res.ok) throw new Error("Couldn't load that chat.");
        const rows: { role: "user" | "assistant"; text: string; plan_id: string | null }[] = await res.json();

        const loaded = await Promise.all(
          rows.map(async (row): Promise<ChatMessage> => {
            if (row.role === "assistant" && row.plan_id) {
              const planRes = await fetch(`http://localhost:8000/api/plan/${row.plan_id}`);
              const result: PlanResult | undefined = planRes.ok ? await planRes.json() : undefined;
              return { role: "assistant", text: row.text, result, planId: row.plan_id };
            }
            return { role: row.role, text: row.text };
          })
        );

        setMessages(loaded);
        setConversationId(id);
        const lastPlan = [...loaded].reverse().find((m) => m.planId)?.planId ?? null;
        setPlanId(lastPlan);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't load that chat.");
      } finally {
        setLoading(false);
        onResumeConsumed?.();
      }
    }

    loadConversation(resumeConversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeConversationId]);

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

  function startNewChat() {
    setMessages([]);
    setConversationId(null);
    setPlanId(null);
    setError(null);
    setScanResult(null);
    setCopied(false);
  }

  async function sendMessage(goalText: string) {
    setLoading(true);
    setError(null);
    setScanResult(null);
    setCurrentStep(null);
    setMessages((prev) => [...prev, { role: "user", text: goalText }]);

    let turnResult: PlanResult = { goal: goalText };
    let turnPlanId: string | null = null;

    try {
      const res = await fetch("http://localhost:8000/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalText, visitor_id: visitorId, conversation_id: conversationId }),
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
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) continue;
          const event = JSON.parse(chunk.slice(6));

          if (event.step === "error") {
            throw new Error(event.message);
          }
          if (event.step === "done") {
            setCurrentStep(null);
            if (event.plan_id) turnPlanId = event.plan_id;
            if (event.conversation_id) setConversationId(event.conversation_id);
            continue;
          }

          setCurrentStep(event.step);
          turnResult = { ...turnResult, ...event.data };
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: turnResult.direct_answer || turnResult.final_summary || "",
          result: turnResult,
          planId: turnPlanId,
        },
      ]);
      if (turnPlanId) {
        setPlanId(turnPlanId);
        setCopied(false);
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
      const goalText = goal;
      setGoal("");
      requestAnimationFrame(resizeTextarea);
      sendMessage(goalText);
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
      : messages.length > 0
        ? "Send"
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
        placeholder={
          messages.length > 0
            ? "Ask a follow-up — e.g. \"make it cheaper\" or \"swap Tuesday's dinner\""
            : "e.g. I'm bulking, need 180g protein/day, budget $60/week"
        }
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
          <EditablePhoto slotId="chat-hero" defaultSrc="/hero-meal-prep-spread.jpg" />
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

      <div className="flex items-center justify-between -mt-2">
        {planId ? (
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-2 text-sm hover:underline bg-none border-none cursor-pointer"
            style={{ color: "var(--accent)" }}
          >
            {copied ? <Check size={14} /> : <LinkIcon size={14} />}
            {copied ? "Link copied!" : "Copy shareable link"}
          </button>
        ) : (
          <span />
        )}
        {messages.length > 0 && (
          <button
            onClick={startNewChat}
            className="flex items-center gap-1.5 text-sm text-[var(--faint)] hover:text-[var(--accent)] bg-none border-none cursor-pointer"
          >
            <Plus size={14} /> New chat
          </button>
        )}
      </div>

      {messages.map((msg, i) =>
        msg.role === "user" ? (
          <div
            key={i}
            className="self-end max-w-[85%] rounded-2xl px-4 py-3 text-[14.5px] leading-relaxed"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            {msg.text}
          </div>
        ) : msg.result ? (
          <div key={i} className="flex flex-col gap-4">
            <PlanResults result={msg.result} planId={msg.planId} />
          </div>
        ) : (
          <div key={i} className={`${cardClass} text-[14.5px] leading-relaxed`}>
            {msg.text}
          </div>
        )
      )}

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

      {scanResult && <ScanResults result={scanResult} />}
    </div>
  );
}
