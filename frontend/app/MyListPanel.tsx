"use client";

import { X, Trash2 } from "lucide-react";
import { useMyList } from "./useMyList";

export default function MyListPanel({ onClose }: { onClose: () => void }) {
  const { items, remove, clear } = useMyList();

  return (
    <div className="fixed top-20 right-6 z-20 w-72 max-w-[calc(100vw-3rem)] bg-white dark:bg-[#1c1917] border border-[#e7e5e4] dark:border-[#292524] rounded-xl shadow-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[#1c1917] dark:text-[#f5f5f4]">
          My List
        </h2>
        <button
          onClick={onClose}
          aria-label="Close my list"
          className="text-[#57534e] dark:text-[#a8a29e] hover:text-[#2563eb] dark:hover:text-[#60a5fa]"
        >
          <X size={16} />
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[#57534e] dark:text-[#a8a29e]">
          Check items off any grocery list — from Chat, Example, Manual Entry, or Pantry — and they&apos;ll collect here.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-center justify-between gap-2 text-sm text-[#292524] dark:text-[#d6d3d1]"
              >
                <span>{item}</span>
                <button
                  onClick={() => remove(item)}
                  aria-label={`Remove ${item}`}
                  className="text-[#a8a29e] hover:text-red-500 shrink-0"
                >
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={clear}
            className="flex items-center justify-center gap-1.5 text-xs text-[#57534e] dark:text-[#a8a29e] hover:text-red-500 dark:hover:text-red-400 border-t border-[#e7e5e4] dark:border-[#292524] pt-2"
          >
            <Trash2 size={12} /> Clear all
          </button>
        </>
      )}
    </div>
  );
}
