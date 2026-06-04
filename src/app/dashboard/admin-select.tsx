"use client";

import { useEffect, useRef, useState } from "react";

export const adminControlClass =
  "h-10 bg-slate-50 hover:bg-slate-100 px-3 rounded-lg text-xs font-semibold border border-slate-200/80 touch-manipulation transition-colors";

type AdminSelectOption = {
  value: string;
  label: string;
};

interface AdminSelectProps {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export default function AdminSelect({
  value,
  options,
  onChange,
  className = "",
  placeholder = "Chọn...",
}: AdminSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${adminControlClass} w-full flex items-center justify-between gap-2 cursor-pointer`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate text-left">{selectedLabel}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10 bg-slate-900/20 sm:bg-transparent"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            role="listbox"
            className="absolute z-20 mt-1 left-0 right-0 sm:right-auto sm:min-w-full max-h-56 overflow-y-auto no-scrollbar bg-white shadow-xl rounded-lg border border-slate-200 py-1"
          >
            {options.map((opt) => (
              <li key={opt.value} role="option" aria-selected={value === opt.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                    value === opt.value
                      ? "bg-primary/10 text-primary"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && (
                    <svg className="w-4 h-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
