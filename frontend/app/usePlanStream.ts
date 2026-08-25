import { useState } from "react";
import type { PlanResult } from "./PlanResults";
import { extractErrorMessage } from "./apiError";

const STEP_LABELS: Record<string, string> = {
  orchestrator: "Deciding what your goal needs...",
  macro: "Calculating your daily targets...",
  mealplan: "Building your meal plan...",
  budget: "Reviewing your budget...",
  grocery: "Consolidating your grocery list...",
  summary: "Writing your wrap-up...",
  answer: "Answering your question...",
};

export function usePlanStream() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  async function runPlan(goal: string) {
    setLoading(true);
    setError(null);
    setResult({ goal });
    setPlanId(null);
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

  const stepLabel = currentStep ? (STEP_LABELS[currentStep] ?? currentStep) : null;

  return { loading, result, planId, error, stepLabel, runPlan };
}
