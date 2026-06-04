"use client";

import { memo, useEffect, useState } from "react";

function formatLiveDateTime(date: Date) {
  const datePart = date.toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return { datePart, timePart };
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());

    tick();
    const timer = setInterval(tick, 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const live = now ? formatLiveDateTime(now) : null;

  return (
    <div className="leading-tight min-w-0">
      <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 capitalize truncate">
        {live?.datePart ?? "\u00a0"}
      </p>
      <p className="text-xs sm:text-sm font-bold text-primary tabular-nums">
        {live?.timePart ?? "--:--:--"}
      </p>
    </div>
  );
}

export default memo(LiveClock);
