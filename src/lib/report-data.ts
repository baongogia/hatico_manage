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

export interface MarketingPostEntry {
  type: "marketing_post";
  platform: "Tiktok" | "Facebook" | "Youtube";
  title: string;
  link: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  status: "completed" | "in_progress" | "pending";
}

export interface MarketingEventEntry {
  type: "marketing_event";
  event_name: string;
  event_date: string;
  trailer_type?: string;
  qty?: string;
  location?: string;
  budget: string;
  attendees: string;
  outcome: string;
  status: "completed" | "in_progress" | "pending";
}

export type ReportDataItem = TaskItem | CallReportEntry | MarketingPostEntry | MarketingEventEntry;

export interface CallReportRow extends CallReportEntry {
  report_date: string;
  report_id: string;
}

export interface MarketingPostRow extends MarketingPostEntry {
  report_date: string;
  report_id: string;
  author_name?: string;
}

export interface MarketingEventRow extends MarketingEventEntry {
  report_date: string;
  report_id: string;
  author_name?: string;
}

export type CallReportPeriod = "week" | "month" | "all";

export function isCallEntry(item: ReportDataItem): item is CallReportEntry {
  return item.type === "call";
}

export function isMarketingPostEntry(item: ReportDataItem): item is MarketingPostEntry {
  return item.type === "marketing_post";
}

export function isMarketingEventEntry(item: ReportDataItem): item is MarketingEventEntry {
  return item.type === "marketing_event";
}

export function splitReportItems(items: ReportDataItem[] = []) {
  const calls: CallReportEntry[] = [];
  const marketingPosts: MarketingPostEntry[] = [];
  const marketingEvents: MarketingEventEntry[] = [];
  const tasks: TaskItem[] = [];
  for (const item of items) {
    if (isCallEntry(item)) {
      calls.push(item);
    } else if (isMarketingPostEntry(item)) {
      marketingPosts.push(item);
    } else if (isMarketingEventEntry(item)) {
      marketingEvents.push(item);
    } else {
      tasks.push(item);
    }
  }
  return { calls, marketingPosts, marketingEvents, tasks };
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

export function isMarketingDepartment(departmentName?: string) {
  if (!departmentName) return false;
  const name = departmentName.toLowerCase();
  return name.includes("marketing") || name.includes("truyền thông") || name.includes("mkt");
}

