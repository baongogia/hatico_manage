"use client";

import { glassPanel } from "@/lib/glass-styles";

const SLIDE_EASE = "cubic-bezier(0.16,1,0.3,1)";
const TAB_GAP = "0.375rem";

export type SegmentedTabOption<T extends string> = {
  value: T;
  label: string;
};

type Variant = "glass" | "toolbar";

function getPillLayout(variant: Variant, count: number) {
  const inset = variant === "glass" ? "0.625rem" : "0.375rem";
  const totalGaps = count > 1 ? `${(count - 1) * 0.375}rem` : "0rem";
  const width = `calc((100% - ${inset} - ${inset} - ${totalGaps}) / ${count})`;
  return { inset, width };
}

interface SlidingSegmentedTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedTabOption<T>[];
  ariaLabel: string;
  variant?: Variant;
  className?: string;
}

export function SlidingSegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  variant = "glass",
  className = "",
}: SlidingSegmentedTabsProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const { inset, width } = getPillLayout(variant, options.length);

  const trackClass =
    variant === "glass"
      ? `${glassPanel} relative flex gap-1.5 p-2.5`
      : "relative flex h-10 gap-1.5 p-1.5 bg-slate-100/90 rounded-lg border border-slate-200/80";

  const pillInset = variant === "glass" ? "top-2.5 bottom-2.5" : "top-1.5 bottom-1.5";
  const buttonClass =
    variant === "glass"
      ? "relative z-10 flex-1 py-2.5 text-xs font-bold transition-colors duration-200 cursor-pointer touch-manipulation"
      : "relative z-10 flex-1 flex items-center justify-center text-[11px] font-bold transition-colors duration-200 cursor-pointer touch-manipulation min-w-0";

  return (
    <div className={`${trackClass} ${className}`} role="tablist" aria-label={ariaLabel}>
      <div
        aria-hidden
        className={`absolute ${pillInset} rounded-lg bg-primary shadow-[0_2px_8px_rgba(15,45,89,0.25)] transition-transform duration-300 motion-reduce:transition-none`}
        style={{
          left: inset,
          width,
          transitionTimingFunction: SLIDE_EASE,
          transform:
            index === 0 ? "translateX(0)" : `translateX(calc(${index} * (100% + ${TAB_GAP})))`,
        }}
      />
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`${buttonClass} ${value === opt.value ? "text-white" : "text-slate-600"}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
