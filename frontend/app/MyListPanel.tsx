"use client";

import { X, Trash2 } from "lucide-react";
import { useMyList } from "./useMyList";

export default function MyListPanel({ onClose }: { onClose: () => void }) {
  const { items, remove, clear } = useMyList();

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
          <h2 className="text-lg font-extrabold">My List</h2>
          <button
            onClick={onClose}
            aria-label="Close my list"
            className="text-[var(--faint)] hover:text-[var(--accent)] bg-none border-none cursor-pointer text-xl leading-none"
          >
            <X size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-[var(--faint)] leading-relaxed">
            Nothing here yet — check items off a grocery list to save them.
          </p>
        ) : (
          <>
            <ul className="flex flex-col gap-2.5">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex items-center justify-between gap-2 text-sm py-1 border-b border-[var(--border)]"
                >
                  <span>{item}</span>
                  <button
                    onClick={() => remove(item)}
                    aria-label={`Remove ${item}`}
                    className="text-[var(--faint)] hover:text-red-500 shrink-0 bg-none border-none cursor-pointer text-sm"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={clear}
              className="flex items-center gap-1.5 text-xs text-[var(--faint)] hover:text-red-500 bg-none border-none cursor-pointer mt-4"
            >
              <Trash2 size={12} /> Clear all
            </button>
          </>
        )}
      </div>
    </div>
  );
}
