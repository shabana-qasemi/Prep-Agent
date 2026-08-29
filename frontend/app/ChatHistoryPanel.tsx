"use client";

import { useState, useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import { useVisitorId } from "./useVisitorId";

interface ConversationSummary {
  id: string;
  title: string;
  updated_at: string;
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ChatHistoryPanel({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (conversationId: string) => void;
}) {
  const visitorId = useVisitorId();
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);

  useEffect(() => {
    if (!visitorId) return;
    fetch(`http://localhost:8000/api/conversations?visitor_id=${encodeURIComponent(visitorId)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setConversations)
      .catch(() => setConversations([]));
  }, [visitorId]);

  return (
    <div
      className="fixed inset-0 z-35"
      style={{ background: "rgba(0,0,0,0.35)", animation: "pa-fade-in .2s ease" }}
      onClick={onClose}
    >
      <div
        className="absolute top-0 right-0 h-full w-[340px] max-w-[90vw] bg-[var(--card)] p-7 overflow-y-auto"
        style={{ boxShadow: "-24px 0 60px rgba(0,0,0,0.2)", animation: "pa-slide-in .28s ease" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-extrabold">Chat History</h2>
          <button
            onClick={onClose}
            aria-label="Close chat history"
            className="text-[var(--faint)] hover:text-[var(--accent)] bg-none border-none cursor-pointer text-xl leading-none"
          >
            <X size={16} />
          </button>
        </div>

        {conversations === null && <p className="text-sm text-[var(--faint)]">Loading...</p>}

        {conversations !== null && conversations.length === 0 && (
          <p className="text-sm text-[var(--faint)] leading-relaxed">
            Nothing here yet — chats you start show up here so you can pick up where you left off.
          </p>
        )}

        {conversations !== null && conversations.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className="w-full flex items-start gap-2.5 text-left text-sm py-2.5 px-2.5 rounded-lg bg-none border-none cursor-pointer hover:bg-[var(--alt)] transition-colors"
                >
                  <MessageSquare size={15} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate font-semibold">{c.title || "Untitled chat"}</span>
                    <span className="text-[11.5px] text-[var(--faint)]">{formatWhen(c.updated_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
