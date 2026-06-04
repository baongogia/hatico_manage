"use client";

import { memo } from "react";

const DEFAULT_BG_URL =
  "https://bmmmdhinlqrlxfrtozpt.supabase.co/storage/v1/object/public/avatar/IMG_8512.jpg";

type PageBackgroundProps = {
  url?: string;
  variant?: "login" | "app";
};

function PageBackground({ url = DEFAULT_BG_URL, variant = "app" }: PageBackgroundProps) {
  const overlayClass =
    variant === "login"
      ? "from-slate-900/25 via-slate-900/45 to-slate-900/65"
      : "from-slate-900/35 via-slate-900/50 to-slate-900/65";

  return (
    <div
      className="fixed z-0 overflow-hidden bg-slate-900 pointer-events-none"
      style={{
        top: "calc(-1 * env(safe-area-inset-top, 0px))",
        right: "calc(-1 * env(safe-area-inset-right, 0px))",
        bottom: "calc(-1 * env(safe-area-inset-bottom, 0px))",
        left: "calc(-1 * env(safe-area-inset-left, 0px))",
        width: "calc(100% + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))",
        height:
          "calc(100dvh + env(safe-area-inset-top, 0px) + env(safe-area-inset-bottom, 0px))",
      }}
      aria-hidden
    >
      <img
        src={url}
        alt=""
        decoding="async"
        fetchPriority={variant === "login" ? "high" : "low"}
        className="absolute left-1/2 top-1/2 min-h-full min-w-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover"
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${overlayClass}`} />
    </div>
  );
}

export default memo(PageBackground);
export { DEFAULT_BG_URL };
