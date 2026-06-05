export interface TaskItem {
  type?: "task";
  title: string;
  progress: string;
  status: "completed" | "in_progress" | "pending";
}

export interface CallReportEntry {
  type: "call";
  customer_name: string;
  phone: string;
  province: string;
  trailer_type: string;
  price_quote: string;
  post_call_notes: string;
}

export type ReportDataItem = TaskItem | CallReportEntry;

export interface CallReportRow extends CallReportEntry {
  report_date: string;
  report_id: string;
}

export type CallReportPeriod = "week" | "month" | "all";

export function isCallEntry(item: ReportDataItem): item is CallReportEntry {
  return item.type === "call";
}

export function splitReportItems(items: ReportDataItem[] = []) {
  const calls: CallReportEntry[] = [];
  const tasks: TaskItem[] = [];
  for (const item of items) {
    if (isCallEntry(item)) calls.push(item);
    else tasks.push(item);
  }
  return { calls, tasks };
}

export function hasWorkTasks(items: ReportDataItem[] = []) {
  return splitReportItems(items).tasks.some((t) => t.title.trim());
}

export function getPeriodStartDate(period: CallReportPeriod) {
  const now = new Date();
  if (period === "all") return null;
  const start = new Date(now);
  if (period === "week") start.setDate(start.getDate() - 7);
  if (period === "month") start.setDate(start.getDate() - 30);
  return start.toISOString().split("T")[0];
}

export function isSalesDepartment(departmentName?: string) {
  return departmentName === "Kinh doanh";
}
