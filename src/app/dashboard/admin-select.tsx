"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const adminControlClass =
  "h-10 bg-slate-50 hover:bg-slate-100 px-3 rounded-lg text-xs font-semibold border border-slate-200/80 touch-manipulation transition-colors";

type AdminSelectOption = {
  value: string;
  label: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
};

interface AdminSelectProps {
  value: string;
  options: AdminSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  compact?: boolean;
  portal?: boolean;
}

export default function AdminSelect({
  value,
  options,
  onChange,
  className = "",
  placeholder = "Chọn...",
  compact = false,
  portal = false,
}: AdminSelectProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? placeholder;

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 120),
    });
  };

  useLayoutEffect(() => {
    if (!open || !portal) return;
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, portal]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:border-primary/50";

  const buttonClass = compact
    ? `h-8 w-full bg-white hover:bg-slate-50 px-1.5 rounded border border-slate-200/80 text-[11px] font-medium touch-manipulation transition-colors ${focusRing} ${
        open ? "ring-2 ring-primary/35 border-primary/50" : ""
      }`
    : `${adminControlClass} ${focusRing}`;

  const menu = open ? (
    <ul
      ref={menuRef}
      role="listbox"
      style={
        portal && menuPos
          ? {
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              zIndex: 9999,
            }
          : undefined
      }
      className={
        portal
          ? "max-h-56 overflow-y-auto no-scrollbar bg-white shadow-xl rounded-lg border border-slate-200 py-1"
          : "absolute z-50 mt-1 left-0 right-0 sm:right-auto sm:min-w-full max-h-56 overflow-y-auto no-scrollbar bg-white shadow-xl rounded-lg border border-slate-200 py-1"
      }
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
  ) : null;

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => {
            const next = !v;
            if (next && portal) updateMenuPosition();
            return next;
          });
        }}
        className={`${buttonClass} w-full flex items-center justify-between gap-2 cursor-pointer`}
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

      {portal && mounted ? createPortal(menu, document.body) : menu}
    </div>
  );
}
