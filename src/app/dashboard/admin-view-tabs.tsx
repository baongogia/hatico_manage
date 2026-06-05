"use client";

import { glassPanel } from "@/lib/glass-styles";

export type AdminView = "personal" | "summary";

const TABS: { value: AdminView; label: string }[] = [
  { value: "personal", label: "Báo cáo của tôi" },
  { value: "summary", label: "Tổng hợp" },
];

const TAB_GAP = "0.375rem";
const SLIDE_EASE = "cubic-bezier(0.16,1,0.3,1)";

type AdminViewTabsProps = {
  view: AdminView;
  onViewChange: (view: AdminView) => void;
  pending?: boolean;
  className?: string;
};

export function AdminViewTabs({ view, onViewChange, pending, className = "" }: AdminViewTabsProps) {
  const activeIndex = view === "summary" ? 1 : 0;

  return (
    <nav
      className={`${glassPanel} no-print relative flex gap-1.5 p-1 shrink-0 touch-manipulation ${pending ? "opacity-90" : ""} ${className}`}
      aria-label="Chuyển chế độ admin"
    >
      <div
        aria-hidden
        className="absolute top-1 bottom-1 left-1 w-[calc((100%-0.875rem)/2)] rounded-lg bg-primary shadow-[0_2px_8px_rgba(15,45,89,0.25)] transition-transform duration-300 motion-reduce:transition-none"
        style={{
          transitionTimingFunction: SLIDE_EASE,
          transform: activeIndex === 0 ? "translateX(0)" : `translateX(calc(100% + ${TAB_GAP}))`,
        }}
      />
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={view === tab.value}
          disabled={pending}
          onClick={() => onViewChange(tab.value)}
          className={`relative z-10 flex-1 py-2 text-center text-xs font-bold transition-colors duration-200 cursor-pointer disabled:cursor-wait ${
            view === tab.value ? "text-white" : "text-slate-600"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
