"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

export type NavTabOption<T extends string> = {
  value: T;
  label: string;
};

interface NavTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly NavTabOption<T>[];
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}

export function NavTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  disabled = false,
}: NavTabsProps<T>) {
  const tablistRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const btn = tabRefs.current.get(value);
    const list = tablistRef.current;
    if (!btn || !list) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - listRect.left,
      width: btnRect.width,
    });
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
    const list = tablistRef.current;
    if (!list) return;

    const ro = new ResizeObserver(updateIndicator);
    ro.observe(list);
    window.addEventListener("resize", updateIndicator);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [updateIndicator, options]);

  return (
    <div
      ref={tablistRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex items-center gap-4 sm:gap-5 border-b border-slate-200/70 shrink-0 ${className}`}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          ref={(el) => {
            if (el) tabRefs.current.set(opt.value, el);
          }}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={`pb-2 text-xs font-bold transition-colors cursor-pointer touch-manipulation whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed ${
            value === opt.value
              ? "text-primary"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-primary transition-[left,width] duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width }}
      />
    </div>
  );
}
