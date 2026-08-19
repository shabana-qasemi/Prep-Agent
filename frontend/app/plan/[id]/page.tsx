"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PlanResults, { cardClass, type PlanResult } from "../../PlanResults";

export default function SharedPlanPage() {
  const params = useParams<{ id: string }>();
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`http://localhost:8000/api/plan/${params.id}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? "This plan doesn't exist or has expired." : `Server responded with ${res.status}`);
        }
        const data: PlanResult = await res.json();
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong loading this plan.");
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [params.id]);

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <main className="relative max-w-2xl mx-auto px-6 py-16 flex flex-col gap-6">
        <header className="flex flex-col gap-3 mb-2">
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: "var(--accent)" }}>
            Prep-Agent — Shared Plan
          </span>
          {result?.goal && (
            <h1 className="font-serif text-3xl leading-tight font-semibold m-0">&ldquo;{result.goal}&rdquo;</h1>
          )}
        </header>

        {loading && <p className={`${cardClass} text-[var(--muted)]`}>Loading plan...</p>}

        {error && <p className={`${cardClass} text-red-600`}>{error}</p>}

        {result && <PlanResults result={result} />}
      </main>
    </div>
  );
}
