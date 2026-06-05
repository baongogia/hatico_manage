export function ReportStatusIndicator({
  hasReport,
  size = "sm",
}: {
  hasReport: boolean;
  size?: "xs" | "sm" | "md";
}) {
  const box = size === "md" ? "w-8 h-8" : size === "xs" ? "w-4 h-4" : "w-6 h-6";
  const icon = size === "md" ? "w-4 h-4" : size === "xs" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";
  const dot = size === "xs" ? "w-1 h-1" : size === "md" ? "w-2 h-2" : "w-1.5 h-1.5";

  if (hasReport) {
    return (
      <span
        title="Đã báo cáo"
        aria-label="Đã báo cáo"
        className={`inline-flex items-center justify-center ${box} rounded-full bg-primary shadow-sm ring-2 ring-white shrink-0`}
      >
        <svg className={`${icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  return (
    <span
      title="Chưa báo cáo"
      aria-label="Chưa báo cáo"
      className={`inline-flex items-center justify-center ${box} rounded-full bg-white shadow-sm ring-2 ring-white shrink-0`}
    >
      <span className={`${dot} rounded-full bg-slate-300`} />
    </span>
  );
}
