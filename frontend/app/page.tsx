"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Moon, Sun, ShoppingCart, History } from "lucide-react";
import ChatTab from "./ChatTab";
import ExampleTab from "./ExampleTab";
import ManualEntryTab from "./ManualEntryTab";
import PantryTab from "./PantryTab";
import MenuDecoderTab from "./MenuDecoderTab";
import ProgressTrackerTab from "./ProgressTrackerTab";
import MyListPanel from "./MyListPanel";
import ChatHistoryPanel from "./ChatHistoryPanel";
import HowItWorksModal from "./HowItWorksModal";
import OnboardingModal from "./OnboardingModal";
import { useMyList } from "./useMyList";

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "example", label: "Example" },
  { key: "pantry", label: "Pantry" },
  { key: "menu", label: "Menu" },
  { key: "manual", label: "Manual" },
  { key: "progress", label: "Progress" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [showMyList, setShowMyList] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [prefillGoal, setPrefillGoal] = useState<string | null>(null);
  const [resumeConversationId, setResumeConversationId] = useState<string | null>(null);
  const { items: myListItems } = useMyList();

  function handleSelectConversation(conversationId: string) {
    setActiveTab("chat");
    setResumeConversationId(conversationId);
    setShowChatHistory(false);
  }

  const tabRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    chat: null,
    example: null,
    manual: null,
    pantry: null,
    menu: null,
    progress: null,
  });
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = tabRefs.current[activeTab];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [activeTab]);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefersDark;
    const onboarded = localStorage.getItem("prepagent_onboarded") === "1";
    // localStorage/matchMedia aren't available during SSR, so the real theme
    // can only be read after mount — this sync setState-in-effect is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDarkMode(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    setShowOnboarding(!onboarded);
  }, []);

  function toggleDarkMode() {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  function handleOnboardingFinish(goalText: string | null) {
    localStorage.setItem("prepagent_onboarded", "1");
    setShowOnboarding(false);
    if (goalText) {
      setActiveTab("chat");
      setPrefillGoal(goalText);
    }
  }

  return (
    <div className="relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {showOnboarding && <OnboardingModal onFinish={handleOnboardingFinish} />}
      {showMyList && <MyListPanel onClose={() => setShowMyList(false)} />}
      {showChatHistory && (
        <ChatHistoryPanel onClose={() => setShowChatHistory(false)} onSelect={handleSelectConversation} />
      )}
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}

      <header className="flex justify-between items-center px-6 sm:px-12 py-6 sm:py-7 border-b border-[var(--border)] gap-4">
        <span className="font-serif text-xl sm:text-2xl font-semibold tracking-tight whitespace-nowrap shrink-0">
          Prep-Agent
        </span>

        <div className="relative flex flex-nowrap overflow-x-auto gap-4 text-xs font-semibold uppercase tracking-wider min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[tab.key] = el;
              }}
              onClick={() => setActiveTab(tab.key)}
              className={`bg-none border-none cursor-pointer whitespace-nowrap shrink-0 pb-1 border-b-2 border-transparent transition-colors duration-200 ${
                activeTab === tab.key
                  ? "text-[var(--text)]"
                  : "text-[var(--faint)] hover:text-[var(--muted)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
          {indicator && (
            <span
              aria-hidden
              className="absolute bottom-0 h-[2px] rounded-full transition-[left,width] duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width, background: "var(--accent)" }}
            />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowHowItWorks(true)}
            className="text-xs font-bold text-[var(--muted)] bg-none border-[1.5px] border-[var(--border)] rounded-full px-4 py-2 cursor-pointer transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] whitespace-nowrap"
          >
            How it works
          </button>
          <button
            onClick={() => setShowChatHistory(true)}
            aria-label="View chat history"
            title="Chat history"
            className="h-[38px] w-[38px] rounded-full bg-[var(--card)] border-[1.5px] border-[var(--border)] flex items-center justify-center shrink-0"
          >
            <History size={16} />
          </button>
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="h-[38px] w-[38px] rounded-full bg-[var(--card)] border-[1.5px] border-[var(--border)] flex items-center justify-center shrink-0"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setShowMyList((v) => !v)}
            aria-label="View my list"
            className="relative h-[38px] w-[38px] rounded-full bg-[var(--card)] border-[1.5px] border-[var(--border)] flex items-center justify-center shrink-0"
          >
            <ShoppingCart size={16} />
            {myListItems.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-[var(--accent)] text-white text-[9.5px] font-bold">
                {myListItems.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="relative max-w-[1180px] mx-auto px-6 sm:px-10 pb-24">
        {/* Every tab stays mounted the whole time — only visually hidden when
            inactive — so switching tabs never wipes an in-progress or
            completed generation. A naive `{active && <Tab/>}` would unmount
            and destroy each tab's state the moment you looked away from it.
            The fade-up animation restarts automatically whenever `display`
            flips from none back to block/flex — no extra JS needed for that. */}
        <div style={{ display: activeTab === "chat" ? "block" : "none", animation: "pa-fade-up 0.3s ease" }}>
          <ChatTab
            prefillGoal={prefillGoal}
            onPrefillConsumed={() => setPrefillGoal(null)}
            resumeConversationId={resumeConversationId}
            onResumeConsumed={() => setResumeConversationId(null)}
          />
        </div>
        <div style={{ display: activeTab === "example" ? "block" : "none", animation: "pa-fade-up 0.3s ease" }}>
          <ExampleTab />
        </div>
        <div style={{ display: activeTab === "pantry" ? "block" : "none", animation: "pa-fade-up 0.3s ease" }}>
          <PantryTab />
        </div>
        <div style={{ display: activeTab === "menu" ? "block" : "none", animation: "pa-fade-up 0.3s ease" }}>
          <MenuDecoderTab />
        </div>
        <div style={{ display: activeTab === "manual" ? "block" : "none", animation: "pa-fade-up 0.3s ease" }}>
          <ManualEntryTab />
        </div>
        <div style={{ display: activeTab === "progress" ? "block" : "none", animation: "pa-fade-up 0.3s ease" }}>
          <ProgressTrackerTab />
        </div>
      </main>
    </div>
  );
}
