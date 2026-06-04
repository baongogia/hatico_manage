import { glassPanel } from "@/lib/glass-styles";

export function AdminSummarySkeleton() {
  return (
    <div className={`flex-1 min-h-0 overflow-hidden flex flex-col ${glassPanel} animate-pulse`}>
      <div className="p-3 border-b border-white/50 grid grid-cols-2 gap-2 shrink-0">
        <div className="h-10 rounded-lg bg-white/50" />
        <div className="h-10 rounded-lg bg-white/50" />
        <div className="h-10 rounded-lg bg-white/50 col-span-2" />
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-white/50" />
          ))}
        </div>
        <div className="h-40 rounded-lg bg-white/50" />
        <div className="h-24 rounded-lg bg-white/50" />
      </div>
    </div>
  );
}
