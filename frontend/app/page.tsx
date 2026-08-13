"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Moon, Sun, ShoppingCart } from "lucide-react";
import ChatTab from "./ChatTab";
import ExampleTab from "./ExampleTab";
import ManualEntryTab from "./ManualEntryTab";
import PantryTab from "./PantryTab";
import MenuDecoderTab from "./MenuDecoderTab";
import ProgressTrackerTab from "./ProgressTrackerTab";
import MyListPanel from "./MyListPanel";
import HowItWorksModal from "./HowItWorksModal";
import { useMyList } from "./useMyList";

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "example", label: "Example" },
  { key: "manual", label: "Manual" },
  { key: "pantry", label: "Pantry" },
  { key: "menu", label: "Menu" },
  { key: "progress", label: "Progress" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [showMyList, setShowMyList] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const { items: myListItems } = useMyList();

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    // localStorage/matchMedia aren't available during SSR, so the real theme
    // can only be read after mount — this sync setState-in-effect is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <div className="relative min-h-screen bg-[#fafaf9] dark:bg-[#0c0a09] overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 sm:h-96 overflow-hidden flex">
        <div className="relative w-1/2 h-full">
          <Image
            src="/hero-meal-prep.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center dark:brightness-[0.5] dark:contrast-125"
          />
        </div>
        <div className="relative w-1/2 h-full">
          <Image
            src="/hero-protein-bowl.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center dark:brightness-[0.5] dark:contrast-125"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/25 to-[#fafaf9] dark:via-black/35 dark:to-[#0c0a09]" />
      </div>

      <button
        onClick={toggleDarkMode}
        aria-label="Toggle dark mode"
        className="fixed top-6 right-6 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/80 dark:bg-[#1c1917]/80 border border-[#e7e5e4] dark:border-[#292524] backdrop-blur text-lg"
      >
        {darkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <button
        onClick={() => setShowMyList((v) => !v)}
        aria-label="View my list"
        className="fixed top-6 right-20 z-10 h-10 w-10 flex items-center justify-center rounded-full bg-white/80 dark:bg-[#1c1917]/80 border border-[#e7e5e4] dark:border-[#292524] backdrop-blur text-lg relative"
      >
        <ShoppingCart size={18} />
        {myListItems.length > 0 && (
          <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-[#2563eb] text-white text-[10px] font-medium">
            {myListItems.length}
          </span>
        )}
      </button>

      {showMyList && <MyListPanel onClose={() => setShowMyList(false)} />}
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}

      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#2563eb] dark:text-[#60a5fa] tracking-[0.15em] uppercase">
              Prep-Agent
            </span>
            <button
              onClick={() => setShowHowItWorks(true)}
              className="text-xs text-[#57534e] dark:text-[#a8a29e] hover:text-[#2563eb] dark:hover:text-[#60a5fa] underline underline-offset-2"
            >
              How it works
            </button>
          </div>

          <div className="flex flex-nowrap justify-center gap-0.5 overflow-x-auto rounded-lg bg-[#f5f5f4] dark:bg-[#1c1917] p-1 border border-[#e7e5e4] dark:border-[#292524] max-w-full">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.key
                    ? "bg-[#ffffff] dark:bg-[#292524] text-[#2563eb] dark:text-[#60a5fa] shadow-sm"
                    : "text-[#57534e] dark:text-[#a8a29e] hover:text-[#2563eb] dark:hover:text-[#60a5fa]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "chat" && <ChatTab />}
        {activeTab === "example" && <ExampleTab />}
        {activeTab === "manual" && <ManualEntryTab />}
        {activeTab === "pantry" && <PantryTab />}
        {activeTab === "menu" && <MenuDecoderTab />}
        {activeTab === "progress" && <ProgressTrackerTab />}
      </main>
    </div>
  );
}
