"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getMarketingReports,
  saveMarketingReportsBatch,
  type MarketingPostRow,
  type MarketingEventRow,
  type Profile,
} from "../actions";
import type {
  MarketingPostEntry,
  MarketingEventEntry,
  CallReportPeriod,
} from "@/lib/report-data";
import { layoutGap, layoutPad } from "@/lib/glass-styles";
import { DEFAULT_BG_URL } from "./page-background";
import AdminSelect from "./admin-select";
import { downloadMarketingReportExcel } from "@/lib/marketing-report-export";
import { MarketingExcelPreviewModal } from "./marketing-excel-preview-modal";
import DatePickerModal from "./date-picker-modal";

const TRAILER_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "Ben", label: "Ben" },
  { value: "Lồng", label: "Lồng" },
  { value: "Sàn", label: "Sàn" },
  { value: "Téc", label: "Téc" },
  { value: "Siêu trường", label: "Siêu trường" },
  { value: "Lửng", label: "Lửng" },
  { value: "Xương", label: "Xương" },
];

const PERIOD_TABS = [
  { value: "week" as const, label: "1 tuần" },
  { value: "month" as const, label: "1 tháng" },
  { value: "all" as const, label: "Tất cả" },
];

const PLATFORM_OPTIONS = [
  { value: "Tiktok", label: "Tiktok" },
  { value: "Facebook", label: "Facebook" },
  { value: "Youtube", label: "Youtube" },
  { value: "Website", label: "Website" },
];

const STATUS_OPTIONS = [
  { value: "completed", label: "Hoàn thành" },
  { value: "in_progress", label: "Đang tiến hành" },
  { value: "pending", label: "Chờ duyệt" },
];

const TikTokIcon = (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.94-1.74-.22-.23-.45-.48-.64-.73v7.28c-.08 3.26-2.01 6.34-5.11 7.4-3.1 1.13-6.85.34-9.06-2-2.31-2.39-2.73-6.27-1.02-9.14 1.7-2.92 5.29-4.48 8.59-3.79v4.2c-1.84-.46-3.87.21-4.79 1.83-.97 1.67-.54 3.98 1.02 5.16 1.54 1.19 3.93.98 5.2-.44.59-.65.75-1.51.74-2.36.01-4.07.01-8.14.01-12.21-.01-.32-.03-.64-.03-.96z" />
  </svg>
);

const FacebookIcon = (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const YouTubeIcon = (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.108C19.524 3.545 12 3.545 12 3.545s-7.525 0-9.388.51a3.004 3.004 0 0 0-2.11 2.108C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.108C4.475 20.455 12 20.455 12 20.455s7.524 0 9.388-.51a3.003 3.003 0 0 0 2.11-2.108C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const WebsiteIcon = (
  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1.9-1.4h-1v-3c0-.55-.45-1-1-1h-6v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.4z" />
  </svg>
);

const cellInput =
  "w-full min-w-[4.5rem] min-h-[2rem] px-2 py-1.5 text-xs text-slate-900 bg-white border border-slate-200/80 rounded focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/50";

const mobileFormInput =
  "input-compact w-full h-7 px-2 text-slate-900 bg-white border border-slate-200/70 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-slate-400";

const toolbarBtn =
  "inline-flex items-center justify-center shrink-0 h-8 sm:h-9 px-2.5 sm:px-3 rounded-[6px] text-[10px] sm:text-xs font-bold touch-manipulation transition-colors cursor-pointer";

type MobilePostFormState = Omit<MarketingPostEntry, "type"> & { report_date: string };
type MobileEventFormState = Omit<MarketingEventEntry, "type">;

type EditablePostRow = MarketingPostRow & { rowId: string };
type EditableEventRow = MarketingEventRow & { rowId: string };

type MarketingReportPanelProps = {
  profile: Profile;
};

function toEditablePostRows(posts: MarketingPostRow[]): EditablePostRow[] {
  return posts.map((post, i) => ({
    ...post,
    rowId: `${post.report_id}-${post.report_date}-${i}`,
  }));
}

function toEditableEventRows(events: MarketingEventRow[]): EditableEventRow[] {
  return events.map((event, i) => ({
    ...event,
    rowId: `${event.report_id}-${event.report_date}-${i}`,
  }));
}

function togglePlatform(currentPlatforms: string, platformToToggle: string) {
  const list = currentPlatforms.split(", ").filter(Boolean);
  if (list.includes(platformToToggle)) {
    return list.filter((p) => p !== platformToToggle).join(", ");
  } else {
    return [...list, platformToToggle].join(", ");
  }
}

function emptyMobilePostForm(): MobilePostFormState {
  return {
    platform: "Tiktok",
    title: "",
    link: "",
    views: "",
    likes: "",
    comments: "",
    shares: "",
    status: "completed",
    report_date: new Date().toISOString().split("T")[0],
  };
}

function emptyMobileEventForm(): MobileEventFormState {
  return {
    event_name: "",
    event_date: new Date().toISOString().split("T")[0],
    trailer_type: "",
    qty: "",
    location: "",
    budget: "",
    attendees: "",
    outcome: "",
    status: "completed",
  };
}

function newEmptyPostRow(todayStr: string): EditablePostRow {
  return {
    type: "marketing_post",
    rowId: `new-post-${crypto.randomUUID()}`,
    report_id: "",
    report_date: todayStr,
    platform: "Tiktok",
    title: "",
    link: "",
    views: "",
    likes: "",
    comments: "",
    shares: "",
    status: "completed",
  };
}

function newEmptyEventRow(todayStr: string): EditableEventRow {
  return {
    type: "marketing_event",
    rowId: `new-event-${crypto.randomUUID()}`,
    report_id: "",
    report_date: todayStr,
    event_name: "",
    event_date: todayStr,
    trailer_type: "",
    qty: "",
    location: "",
    budget: "",
    attendees: "",
    outcome: "",
    status: "completed",
  };
}

export function MarketingReportPanel({
  profile,
}: MarketingReportPanelProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const isAdmin = profile.role === "admin";

  const [period, setPeriod] = useState<CallReportPeriod>("week");
  const [selectedStaffId, setSelectedStaffId] = useState<string>(profile.id);
  const [activeSubTab, setActiveSubTab] = useState<"posts" | "events">("posts");

  const [posts, setPosts] = useState<EditablePostRow[]>([]);
  const [events, setEvents] = useState<EditableEventRow[]>([]);

  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterDay, setFilterDay] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const monthOptions = useMemo(() => {
    const options = [{ value: "all", label: "Tất cả các tháng" }];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      options.push({
        value: `${yyyy}-${mm}`,
        label: `Tháng ${mm}/${yyyy}`,
      });
    }
    return options;
  }, []);

  const daysInMonth = useMemo(() => {
    if (filterMonth === "all") return [];
    const [yyyy, mm] = filterMonth.split("-").map(Number);
    const lastDay = new Date(yyyy, mm, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => {
      const d = i + 1;
      const date = new Date(yyyy, mm - 1, d);
      const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      return {
        dayStr: String(d).padStart(2, "0"),
        label: `${d}`,
        dayName: dayNames[date.getDay()],
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      };
    });
  }, [filterMonth]);

  const displayedPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filterMonth !== "all") {
        if (!post.report_date.startsWith(filterMonth)) return false;
      }
      if (filterDay !== "all") {
        const dayStr = post.report_date.slice(8, 10);
        if (dayStr !== filterDay) return false;
      }
      if (filterPlatform !== "all") {
        if (!post.platform.includes(filterPlatform)) return false;
      }
      return true;
    });
  }, [posts, filterMonth, filterDay, filterPlatform]);

  const displayedEvents = useMemo(() => {
    return events.filter((event) => {
      if (filterMonth !== "all") {
        if (!event.event_date.startsWith(filterMonth)) return false;
      }
      if (filterDay !== "all") {
        const dayStr = event.event_date.slice(8, 10);
        if (dayStr !== filterDay) return false;
      }
      return true;
    });
  }, [events, filterMonth, filterDay]);

  const [marketingStaff, setMarketingStaff] = useState<{ id: string; full_name: string }[]>([]);

  const [loadedPostDates, setLoadedPostDates] = useState<Set<string>>(new Set());
  const [loadedEventDates, setLoadedEventDates] = useState<Set<string>>(new Set());

  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());

  const [errorMsg, setErrorMsg] = useState("");
  const [mobilePostForm, setMobilePostForm] = useState<MobilePostFormState>(
    emptyMobilePostForm,
  );
  const [mobileEventForm, setMobileEventForm] = useState<MobileEventFormState>(
    emptyMobileEventForm,
  );

  const [editingPostRowId, setEditingPostRowId] = useState<string | null>(null);
  const [editingEventRowId, setEditingEventRowId] = useState<string | null>(
    null,
  );

  const [activeDatePicker, setActiveDatePicker] = useState<{
    type: "post" | "event" | "post-mobile" | "event-mobile";
    rowId: string;
    value: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [showExcelPreview, setShowExcelPreview] = useState(false);

  const postTitleRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const eventNameRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const focusPostRowIdRef = useRef<string | null>(null);
  const focusEventRowIdRef = useRef<string | null>(null);
  
  const latestPosts = useRef(posts);
  const latestEvents = useRef(events);
  
  useEffect(() => {
    latestPosts.current = posts;
    latestEvents.current = events;
  }, [posts, events]);

  useEffect(() => {
    const pid = focusPostRowIdRef.current;
    if (pid) {
      focusPostRowIdRef.current = null;
      requestAnimationFrame(() => {
        postTitleRefs.current.get(pid)?.focus();
      });
    }
  }, [posts]);

  useEffect(() => {
    const eid = focusEventRowIdRef.current;
    if (eid) {
      focusEventRowIdRef.current = null;
      requestAnimationFrame(() => {
        eventNameRefs.current.get(eid)?.focus();
      });
    }
  }, [events]);

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const applyFetched = (
    fetchedPosts: MarketingPostRow[],
    fetchedEvents: MarketingEventRow[],
    staffList?: { id: string; full_name: string }[],
  ) => {
    setPosts((prev) => {
      const savedPosts = toEditablePostRows(fetchedPosts);
      const unsaved = prev.filter((p) => {
        if (!p.rowId.startsWith("new-")) return false;
        // Keep if completely empty
        if (!p.title.trim() && !p.link.trim() && !p.views.trim() && !p.likes.trim()) return true;
        // Check if already saved
        const isSaved = savedPosts.some((sp) =>
          sp.title === p.title &&
          sp.platform === p.platform &&
          sp.link === p.link &&
          sp.report_date === p.report_date
        );
        return !isSaved;
      });
      return [...savedPosts, ...unsaved];
    });

    setEvents((prev) => {
      const savedEvents = toEditableEventRows(fetchedEvents);
      const unsaved = prev.filter((e) => {
        if (!e.rowId.startsWith("new-")) return false;
        // Keep if completely empty
        if (!e.event_name.trim() && !e.location?.trim() && !e.budget.trim() && !e.qty?.trim()) return true;
        // Check if already saved
        const isSaved = savedEvents.some((se) =>
          se.event_name === e.event_name &&
          se.event_date === e.event_date &&
          se.location === e.location &&
          se.budget === e.budget
        );
        return !isSaved;
      });
      return [...savedEvents, ...unsaved];
    });

    setLoadedPostDates(new Set(fetchedPosts.map((p) => p.report_date)));
    setLoadedEventDates(new Set(fetchedEvents.map((e) => e.report_date)));
    if (staffList) {
      setMarketingStaff(staffList);
    }
    setSelectedPosts(new Set());
    setSelectedEvents(new Set());
    setErrorMsg("");
  };

  const loadReports = (p: CallReportPeriod, sId: string) => {
    startTransition(async () => {
      const result = await getMarketingReports(p, sId);
      if (!("error" in result)) {
        applyFetched(result.posts, result.events, result.marketingStaff);
      } else {
        setErrorMsg(result.error || "Không thể tải báo cáo");
      }
    });
  };

  useEffect(() => {
    loadReports(period, selectedStaffId);
  }, []);


  const handlePeriodChange = (value: CallReportPeriod) => {
    setPeriod(value);
    loadReports(value, selectedStaffId);
  };

  const handleStaffChange = (value: string) => {
    setSelectedStaffId(value);
    loadReports(period, value);
  };

  // Metric summaries
  const postMetrics = useMemo(() => {
    let tiktok = 0;
    let facebook = 0;
    let youtube = 0;
    let website = 0;
    let views = 0;
    let likes = 0;

    posts.forEach((p) => {
      if (!p.title.trim()) return;
      if (p.platform.includes("Tiktok")) tiktok++;
      if (p.platform.includes("Facebook")) facebook++;
      if (p.platform.includes("Youtube")) youtube++;
      if (p.platform.includes("Website")) website++;

      const v = parseInt(p.views.replace(/[^0-9]/g, "")) || 0;
      const l = parseInt(p.likes.replace(/[^0-9]/g, "")) || 0;
      views += v;
      likes += l;
    });

    return {
      total: posts.filter((p) => p.title.trim()).length,
      tiktok,
      facebook,
      youtube,
      website,
      views,
      likes,
    };
  }, [posts]);

  const eventMetrics = useMemo(() => {
    let total = 0;
    let budget = 0;
    let attendees = 0;

    events.forEach((e) => {
      if (!e.event_name.trim()) return;
      total++;
      const b = parseInt(e.budget.replace(/[^0-9]/g, "")) || 0;
      const a = parseInt(e.attendees.replace(/[^0-9]/g, "")) || 0;
      budget += b;
      attendees += a;
    });

    return {
      total,
      budget,
      attendees,
    };
  }, [events]);

  // Editing logic for Posts
  const updatePostRow = (
    rowId: string,
    field: keyof Omit<EditablePostRow, "type" | "rowId">,
    value: string,
    shouldSave = false,
  ) => {
    setPosts((prev) => {
      const next = prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r));
      if (shouldSave) {
        const editedRow = next.find((r) => r.rowId === rowId);
        if (editedRow && editedRow.title.trim()) {
          setTimeout(() => {
            startSave(async () => {
              await persistReports(next, latestEvents.current, [], true);
            });
          }, 0);
        }
      }
      return next;
    });
  };

  const handleAddPostRow = () => {
    const row = newEmptyPostRow(todayStr);
    focusPostRowIdRef.current = row.rowId;
    setPosts((prev) => [...prev, row]);
    setLoadedPostDates((prev) => new Set([...prev, todayStr]));
  };

  const toggleSelectPost = (rowId: string) => {
    setSelectedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAllPosts = () => {
    if (selectedPosts.size === displayedPosts.length) {
      setSelectedPosts(new Set());
    } else {
      setSelectedPosts(new Set(displayedPosts.map((r) => r.rowId)));
    }
  };

  // Editing logic for Events
  const updateEventRow = (
    rowId: string,
    field: keyof Omit<MarketingEventEntry, "type">,
    value: string,
    shouldSave = false,
  ) => {
    setEvents((prev) => {
      const next = prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r));
      if (shouldSave) {
        const editedRow = next.find((r) => r.rowId === rowId);
        if (editedRow && editedRow.event_name.trim()) {
          setTimeout(() => {
            startSave(async () => {
              await persistReports(latestPosts.current, next, [], true);
            });
          }, 0);
        }
      }
      return next;
    });
  };

  const handleAddEventRow = () => {
    const row = newEmptyEventRow(todayStr);
    focusEventRowIdRef.current = row.rowId;
    setEvents((prev) => [...prev, row]);
    setLoadedEventDates((prev) => new Set([...prev, todayStr]));
  };

  const toggleSelectEvent = (rowId: string) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAllEvents = () => {
    if (selectedEvents.size === displayedEvents.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(displayedEvents.map((r) => r.rowId)));
    }
  };

  const handleMarketingBlur = () => {
    const currentPosts = latestPosts.current;
    const currentEvents = latestEvents.current;
    const hasValidPosts = currentPosts.some((p) => p.title.trim());
    const hasValidEvents = currentEvents.some((e) => e.event_name.trim());
    if (hasValidPosts || hasValidEvents) {
      startSave(async () => {
        await persistReports(currentPosts, currentEvents, [], true);
      });
    }
  };

  // Mobile Form submit helpers
  const handleMobilePostSubmit = () => {
    if (!mobilePostForm.title.trim()) {
      setErrorMsg("Vui lòng nhập tiêu đề bài viết.");
      return;
    }
    setErrorMsg("");

    let nextPosts: EditablePostRow[];
    if (editingPostRowId) {
      nextPosts = posts.map((r) =>
        r.rowId === editingPostRowId ? { ...r, ...mobilePostForm } : r,
      );
    } else {
      const row: EditablePostRow = {
        ...newEmptyPostRow(todayStr),
        ...mobilePostForm,
      };
      nextPosts = [...posts, row];
      setLoadedPostDates((prev) => new Set([...prev, todayStr]));
    }
    setPosts(nextPosts);
    setEditingPostRowId(null);
    setMobilePostForm(emptyMobilePostForm());

    startSave(async () => {
      await persistReports(nextPosts, events);
    });
  };

  const handleMobileEventSubmit = () => {
    if (!mobileEventForm.event_name.trim()) {
      setErrorMsg("Vui lòng nhập tên sự kiện.");
      return;
    }
    setErrorMsg("");

    let nextEvents: EditableEventRow[];
    if (editingEventRowId) {
      nextEvents = events.map((r) =>
        r.rowId === editingEventRowId ? { ...r, ...mobileEventForm } : r,
      );
    } else {
      const row: EditableEventRow = {
        ...newEmptyEventRow(mobileEventForm.event_date || todayStr),
        ...mobileEventForm,
      };
      nextEvents = [...events, row];
      setLoadedEventDates((prev) => new Set([...prev, row.event_date]));
    }
    setEvents(nextEvents);
    setEditingEventRowId(null);
    setMobileEventForm(emptyMobileEventForm());

    startSave(async () => {
      await persistReports(posts, nextEvents);
    });
  };

  const persistReports = async (
    currentPosts: EditablePostRow[],
    currentEvents: EditableEventRow[],
    deletedDates: string[] = [],
    skipRefresh: boolean = false,
  ) => {
    const datesToSave = new Set([
      ...loadedPostDates,
      ...loadedEventDates,
      ...deletedDates,
      ...currentPosts.filter(p => p.title.trim()).map(p => p.report_date),
      ...currentEvents.filter(e => e.event_name.trim()).map(e => e.event_date),
    ]);
    if (datesToSave.size === 0) return;

    // Group items by date
    const byDate = new Map<
      string,
      {
        posts: Omit<MarketingPostEntry, "type">[];
        events: Omit<MarketingEventEntry, "type">[];
      }
    >();

    // Init dates
    datesToSave.forEach((d) => {
      byDate.set(d, { posts: [], events: [] });
    });

    currentPosts.forEach((post) => {
      if (!post.title.trim()) return;
      const grp = byDate.get(post.report_date) || { posts: [], events: [] };
      grp.posts.push({
        platform: post.platform,
        title: post.title.trim(),
        link: post.link.trim(),
        views: post.views.trim(),
        likes: post.likes.trim(),
        comments: post.comments.trim(),
        shares: post.shares.trim(),
        status: post.status,
      });
      byDate.set(post.report_date, grp);
    });

    currentEvents.forEach((event) => {
      if (!event.event_name.trim()) return;
      const grp = byDate.get(event.event_date) || { posts: [], events: [] };
      grp.events.push({
        event_name: event.event_name.trim(),
        event_date: event.event_date.trim(),
        trailer_type: event.trailer_type?.trim() || "",
        qty: event.qty?.trim() || "",
        location: event.location?.trim() || "",
        budget: event.budget.trim(),
        attendees: event.attendees.trim(),
        outcome: event.outcome.trim(),
        status: event.status,
      });
      byDate.set(event.event_date, grp);
    });

    const entries = [...datesToSave].map((date) => {
      const grp = byDate.get(date) || { posts: [], events: [] };
      return {
        date,
        posts: grp.posts,
        events: grp.events,
      };
    });

    const result = await saveMarketingReportsBatch(
      entries,
      isAdmin ? selectedStaffId : undefined,
    );

    if ("error" in result) {
      setErrorMsg(result.error || "Không thể lưu báo cáo.");
      return;
    }

    if (!skipRefresh) {
      const refresh = await getMarketingReports(period, selectedStaffId);
      if (!("error" in refresh)) {
        applyFetched(refresh.posts, refresh.events);
      }
    }
  };

  const handleSave = () => {
    setErrorMsg("");
    startSave(async () => {
      await persistReports(posts, events);
    });
  };

  const handleExportExcel = () => {
    setShowExcelPreview(true);
  };

  const handleConfirmExportExcel = async () => {
    setShowExcelPreview(false);
    try {
      const label =
        PERIOD_TABS.find((t) => t.value === period)?.label || period;
      const exportPosts = posts.filter((p) => p.title.trim());
      const exportEvents = events.filter((e) => e.event_name.trim());
      
      const staffLabel = selectedStaffId === "all"
        ? "Tat_ca_nhan_su"
        : (marketingStaff.find(s => s.id === selectedStaffId)?.full_name || profile.full_name);
        
      const branchLabel = profile.department?.branch
        ? `${profile.department.name} - ${profile.department.branch.name}`
        : profile.department?.name;

      await downloadMarketingReportExcel(
        `Bao_cao_marketing_${staffLabel.replace(/\s+/g, "_")}_${label}.xlsx`,
        {
          period,
          staffName: selectedStaffId === "all" ? "Tất cả nhân sự" : (marketingStaff.find(s => s.id === selectedStaffId)?.full_name || profile.full_name),
          branchName: branchLabel,
          posts: exportPosts,
          events: exportEvents,
        }
      );
    } catch (err) {
      console.error(err);
      window.alert("Không xuất được Excel. Vui lòng thử lại.");
    }
  };

  const handleDeleteSelected = () => {
    if (activeSubTab === "posts" && selectedPosts.size > 0) {
      const deletedDates = posts
        .filter((r) => selectedPosts.has(r.rowId))
        .map((r) => r.report_date);
      const nextPosts = posts.filter((r) => !selectedPosts.has(r.rowId));

      if ([...selectedPosts].some((id) => id === editingPostRowId)) {
        setEditingPostRowId(null);
        setMobilePostForm(emptyMobilePostForm());
      }

      setPosts(nextPosts);
      setSelectedPosts(new Set());
      setErrorMsg("");

      startSave(async () => {
        await persistReports(nextPosts, events, deletedDates);
      });
    } else if (activeSubTab === "events" && selectedEvents.size > 0) {
      const deletedDates = events
        .filter((r) => selectedEvents.has(r.rowId))
        .map((r) => r.event_date);
      const nextEvents = events.filter((r) => !selectedEvents.has(r.rowId));

      if ([...selectedEvents].some((id) => id === editingEventRowId)) {
        setEditingEventRowId(null);
        setMobileEventForm(emptyMobileEventForm());
      }

      setEvents(nextEvents);
      setSelectedEvents(new Set());
      setErrorMsg("");

      startSave(async () => {
        await persistReports(posts, nextEvents, deletedDates);
      });
    }
  };

  return (
    <div
      className={`no-print flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_8px_32px_rgba(15,45,89,0.08)] transition-opacity duration-200 ${
        isPending ? "opacity-70 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Title Header */}
      <div className="relative shrink-0 overflow-hidden border-b border-primary/30">
        <Image
          src={DEFAULT_BG_URL}
          alt=""
          fill
          className="object-cover opacity-30"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary-hover opacity-95"
          aria-hidden
        />
        <div className={`relative ${layoutPad} flex flex-col ${layoutGap}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Báo cáo phòng Marketing
              </h2>
              <p className="text-[10px] text-white/70 mt-0.5 truncate">
                {profile.full_name} · Phòng Marketing
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isPending}
                className="shrink-0 h-9 flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-primary bg-white hover:bg-white/90 border border-white/30 shadow-sm cursor-pointer touch-manipulation transition-colors disabled:opacity-60"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="hidden sm:inline">Xuất Excel</span>
                <span className="sm:hidden">Excel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Metrics & Filters Dashboard Panel */}
      <div className={`shrink-0 ${layoutPad} pb-1.5`}>
        <div className="flex flex-col gap-3.5 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 shadow-xs">
          {/* Top Row: Metrics (split into 2 equal columns on medium+ screens) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Column 1: Hiệu suất Đăng bài */}
            <div className="flex flex-col gap-1.5 justify-center">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                  Đăng bài
                </span>
                <span className="text-xs font-bold text-primary">
                  {postMetrics.total} bài
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1 text-center">
                <div>
                  <p className="text-xs font-extrabold text-primary">{postMetrics.tiktok}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Tiktok</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-primary">{postMetrics.facebook}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Facebook</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-primary">{postMetrics.youtube}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Youtube</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-primary">{postMetrics.website}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Website</p>
                </div>
                <div className="border-l border-slate-200/50">
                  <p className="text-xs font-extrabold text-primary">
                    {postMetrics.views >= 1000
                      ? `${(postMetrics.views / 1000).toFixed(1)}k`
                      : postMetrics.views}
                  </p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Xem</p>
                </div>
              </div>
            </div>

            {/* Column 2: Sự kiện & Bàn giao */}
            <div className="flex flex-col gap-1.5 justify-center border-t md:border-t-0 md:border-l border-slate-200/60 pt-2.5 md:pt-0 md:pl-4">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-1">
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-wider">
                  Sự kiện
                </span>
                <span className="text-xs font-bold text-primary">
                  {eventMetrics.total} sự kiện
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-xs font-extrabold text-primary">{eventMetrics.total}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Sự kiện</p>
                </div>
                <div className="border-l border-r border-slate-200/50">
                  <p className="text-xs font-extrabold text-primary">{eventMetrics.attendees}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide font-sans">Tham gia</p>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-primary truncate px-0.5">{eventMetrics.budget || 0}</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wide">Chi phí</p>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Row: Filters & Platform Selectors (flex container, full width) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/50 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Sub-tab selection */}
              <div
                className="flex items-center gap-0.5 bg-slate-200/60 p-0.5 rounded-[6px] border border-slate-300/40 shrink-0 h-8"
                role="group"
                aria-label="Chọn loại dữ liệu"
              >
                <button
                  type="button"
                  onClick={() => setActiveSubTab("posts")}
                  className={`px-3 h-full rounded-[4px] text-xs font-bold cursor-pointer transition-colors ${
                    activeSubTab === "posts"
                      ? "bg-primary text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Đăng bài
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("events")}
                  className={`px-3 h-full rounded-[4px] text-xs font-bold cursor-pointer transition-colors ${
                    activeSubTab === "events"
                      ? "bg-primary text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Sự kiện
                </button>
              </div>

              <AdminSelect
                compact
                value={filterMonth}
                onChange={(v) => {
                  setFilterMonth(v);
                  setFilterDay("all");
                }}
                options={monthOptions}
                className="w-40 shrink-0"
              />
              <span className="flex items-center justify-center h-8 px-2.5 rounded-[4px] text-[10px] font-extrabold bg-primary/10 text-primary border border-primary/15 whitespace-nowrap">
                {activeSubTab === "posts" 
                  ? `${displayedPosts.length} / ${posts.length} bài` 
                  : `${displayedEvents.length} / ${events.length} sự kiện`}
              </span>
            </div>

            {/* Platform Selector Buttons (for Posts only) */}
            {activeSubTab === "posts" && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterPlatform("all")}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-bold border transition-all duration-200 cursor-pointer shadow-2xs ${
                    filterPlatform === "all"
                      ? "bg-primary border-primary text-white scale-[1.02] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPlatform("Tiktok")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-bold border transition-all duration-200 cursor-pointer shadow-2xs ${
                    filterPlatform === "Tiktok"
                      ? "bg-[#fe2c55]/10 border-[#fe2c55]/30 text-[#fe2c55] scale-[1.02] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {TikTokIcon}
                  <span className="font-sans">TikTok</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPlatform("Facebook")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-bold border transition-all duration-200 cursor-pointer shadow-2xs ${
                    filterPlatform === "Facebook"
                      ? "bg-[#1877f2]/10 border-[#1877f2]/30 text-[#1877f2] scale-[1.02] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {FacebookIcon}
                  <span className="font-sans">Facebook</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPlatform("Youtube")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-bold border transition-all duration-200 cursor-pointer shadow-2xs ${
                    filterPlatform === "Youtube"
                      ? "bg-[#ff0000]/10 border-[#ff0000]/30 text-[#ff0000] scale-[1.02] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {YouTubeIcon}
                  <span className="font-sans">YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPlatform("Website")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-bold border transition-all duration-200 cursor-pointer shadow-2xs ${
                    filterPlatform === "Website"
                      ? "bg-slate-700/10 border-slate-700/30 text-slate-800 scale-[1.02] shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {WebsiteIcon}
                  <span className="font-sans">Website</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Row: Horizontal Day Scroller (Spans Full Width, Only when month is active) */}
          {filterMonth !== "all" && daysInMonth.length > 0 && (
            <div className="border-t border-slate-200/50 pt-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  Chọn ngày báo cáo:
                </span>
                {filterDay !== "all" && (
                  <button
                    type="button"
                    onClick={() => setFilterDay("all")}
                    className="text-[8px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    Tất cả ngày trong tháng
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar scroll-smooth">
                <button
                  type="button"
                  onClick={() => setFilterDay("all")}
                  className={`shrink-0 flex flex-col items-center justify-center w-8 h-8 rounded-md border text-center transition-all cursor-pointer ${
                    filterDay === "all"
                      ? "bg-primary border-primary text-white font-bold shadow-xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <span className="text-[7px] uppercase font-bold opacity-75">Tất</span>
                  <span className="text-[9px] font-extrabold">Cả</span>
                </button>
                {daysInMonth.map((day) => (
                  <button
                    key={day.dayStr}
                    type="button"
                    onClick={() => setFilterDay(day.dayStr)}
                    className={`shrink-0 flex flex-col items-center justify-center w-8 h-8 rounded-md border text-center transition-all cursor-pointer ${
                      filterDay === day.dayStr
                        ? "bg-primary border-primary text-white font-bold shadow-xs"
                        : day.isWeekend
                          ? "bg-amber-50/70 border-amber-200/80 text-amber-800 hover:bg-amber-100/80"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className={`text-[7px] uppercase font-bold ${filterDay === day.dayStr ? "text-white/90" : "text-slate-400"}`}>
                      {day.dayName}
                    </span>
                    <span className="text-[9px] font-extrabold">{day.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar / Actions & Filters */}
      <div className={`shrink-0 ${layoutPad} flex flex-col ${layoutGap} pt-1`}>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2">

          <button
            type="button"
            onClick={activeSubTab === "posts" ? handleAddPostRow : handleAddEventRow}
            className={`${toolbarBtn} hidden sm:inline-flex text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20`}
          >
            + Thêm dòng
          </button>

          {((activeSubTab === "posts" && selectedPosts.size > 0) ||
            (activeSubTab === "events" && selectedEvents.size > 0)) && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isSaving}
              className={`${toolbarBtn} text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60`}
            >
              Xóa (
              {activeSubTab === "posts" ? selectedPosts.size : selectedEvents.size}
              )
            </button>
          )}

          <button
            type="button"
            disabled={isSaving || isPending}
            onClick={handleSave}
            className={`${toolbarBtn} text-white bg-primary hover:bg-primary-hover disabled:opacity-60 shadow-sm`}
          >
            {isSaving ? "Đang lưu..." : "Lưu báo cáo"}
          </button>

          {/* Period Tabs */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 sm:ml-2 sm:pl-2 sm:border-l sm:border-slate-200 shrink-0"
            role="group"
            aria-label="Lọc khoảng thời gian"
          >
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => handlePeriodChange(tab.value)}
                className={`${toolbarBtn} ${
                  period === tab.value
                    ? "bg-primary text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[9px] sm:text-[10px] text-slate-500 sm:ml-auto shrink-0">
            {activeSubTab === "posts" ? posts.length : events.length} dòng
          </span>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-[10px] sm:text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Mobile Forms */}
        <div className="sm:hidden rounded-xl border border-slate-200/70 bg-gradient-to-b from-slate-50/90 to-white p-2.5 space-y-2 shadow-sm">
          {activeSubTab === "posts" ? (
            <>
              <p className="text-[9px] font-bold text-primary uppercase tracking-wider">
                {editingPostRowId ? "Chỉnh sửa bài đăng" : "Thêm bài đăng mới"}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="space-y-0.5 col-span-2">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Nền tảng
                  </span>
                  <div className="flex items-center gap-1.5 h-8 bg-slate-50/50 rounded border border-slate-200/40 px-1">
                    <button
                      type="button"
                      onClick={() => setMobilePostForm((p) => ({ ...p, platform: togglePlatform(p.platform, "Tiktok") }))}
                      title="Tiktok"
                      className={`flex-1 flex justify-center items-center p-1 rounded transition-all cursor-pointer ${
                        mobilePostForm.platform.includes("Tiktok")
                          ? "bg-[#fe2c55]/10 text-[#fe2c55]"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {TikTokIcon}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePostForm((p) => ({ ...p, platform: togglePlatform(p.platform, "Facebook") }))}
                      title="Facebook"
                      className={`flex-1 flex justify-center items-center p-1 rounded transition-all cursor-pointer ${
                        mobilePostForm.platform.includes("Facebook")
                          ? "bg-[#1877f2]/10 text-[#1877f2]"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {FacebookIcon}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePostForm((p) => ({ ...p, platform: togglePlatform(p.platform, "Youtube") }))}
                      title="Youtube"
                      className={`flex-1 flex justify-center items-center p-1 rounded transition-all cursor-pointer ${
                        mobilePostForm.platform.includes("Youtube")
                          ? "bg-[#ff0000]/10 text-[#ff0000]"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {YouTubeIcon}
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobilePostForm((p) => ({ ...p, platform: togglePlatform(p.platform, "Website") }))}
                      title="Website"
                      className={`flex-1 flex justify-center items-center p-1 rounded transition-all cursor-pointer ${
                        mobilePostForm.platform.includes("Website")
                          ? "bg-slate-700/15 text-slate-800"
                          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {WebsiteIcon}
                    </button>
                  </div>
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Tiêu đề *
                  </span>
                  <input
                    type="text"
                    placeholder="Tiêu đề video/bài viết"
                    value={mobilePostForm.title}
                    onChange={(e) =>
                      setMobilePostForm((p) => ({ ...p, title: e.target.value }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Link bài đăng
                  </span>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={mobilePostForm.link}
                    onChange={(e) =>
                      setMobilePostForm((p) => ({ ...p, link: e.target.value }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Lượt xem
                  </span>
                  <input
                    type="text"
                    placeholder=""
                    value={mobilePostForm.views}
                    onChange={(e) =>
                      setMobilePostForm((p) => ({ ...p, views: e.target.value }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Lượt thích
                  </span>
                  <input
                    type="text"
                    placeholder=""
                    value={mobilePostForm.likes}
                    onChange={(e) =>
                      setMobilePostForm((p) => ({ ...p, likes: e.target.value }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Ngày
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDatePicker({
                        type: "post-mobile",
                        rowId: "",
                        value: mobilePostForm.report_date,
                      })
                    }
                    className="flex items-center justify-between px-2 h-7 text-[10px] text-slate-800 bg-white border border-slate-200/80 rounded hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary/30 w-full"
                  >
                    <span className="font-sans font-medium">{formatDateDisplay(mobilePostForm.report_date)}</span>
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </label>
              </div>
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleMobilePostSubmit}
                  className="flex-1 h-7 rounded-md text-[10px] font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer touch-manipulation transition-colors shadow-sm"
                >
                  {editingPostRowId ? "Cập nhật" : "Thêm bài"}
                </button>
                {editingPostRowId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPostRowId(null);
                      setMobilePostForm(emptyMobilePostForm());
                    }}
                    className="h-7 px-2.5 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer touch-manipulation transition-colors"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-[9px] font-bold text-primary uppercase tracking-wider">
                {editingEventRowId ? "Chỉnh sửa bàn giao / sự kiện" : "Thêm bàn giao / sự kiện mới"}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="space-y-0.5 col-span-2">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Sự kiện / Khách hàng *
                  </span>
                  <input
                    type="text"
                    placeholder="Nhập tên sự kiện / khách hàng bàn giao"
                    value={mobileEventForm.event_name}
                    onChange={(e) =>
                      setMobileEventForm((p) => ({
                        ...p,
                        event_name: e.target.value,
                      }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Ngày thực hiện
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveDatePicker({
                        type: "event-mobile",
                        rowId: "",
                        value: mobileEventForm.event_date,
                      })
                    }
                    className="flex items-center justify-between px-2 h-7 text-[10px] text-slate-800 bg-white border border-slate-200/80 rounded hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-primary/30 w-full"
                  >
                    <span className="font-sans font-medium">{formatDateDisplay(mobileEventForm.event_date)}</span>
                    <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Loại mooc
                  </span>
                  <AdminSelect
                    micro
                    portal
                    value={mobileEventForm.trailer_type || ""}
                    onChange={(v) =>
                      setMobileEventForm((p) => ({
                        ...p,
                        trailer_type: v,
                      }))
                    }
                    options={TRAILER_TYPE_OPTIONS}
                    placeholder="—"
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Số lượng mooc
                  </span>
                  <input
                    type="text"
                    placeholder="Số lượng"
                    value={mobileEventForm.qty || ""}
                    onChange={(e) =>
                      setMobileEventForm((p) => ({
                        ...p,
                        qty: e.target.value,
                      }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Địa điểm bàn giao
                  </span>
                  <input
                    type="text"
                    placeholder="Hải Phòng..."
                    value={mobileEventForm.location || ""}
                    onChange={(e) =>
                      setMobileEventForm((p) => ({
                        ...p,
                        location: e.target.value,
                      }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Chi phí (VNĐ)
                  </span>
                  <input
                    type="text"
                    placeholder="Chi phí"
                    value={mobileEventForm.budget}
                    onChange={(e) =>
                      setMobileEventForm((p) => ({
                        ...p,
                        budget: e.target.value,
                      }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Khách mời
                  </span>
                  <input
                    type="text"
                    placeholder="Số người tham gia"
                    value={mobileEventForm.attendees}
                    onChange={(e) =>
                      setMobileEventForm((p) => ({
                        ...p,
                        attendees: e.target.value,
                      }))
                    }
                    className={mobileFormInput}
                  />
                </label>
                <label className="space-y-0.5 col-span-2">
                  <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">
                    Kết quả / Đánh giá
                  </span>
                  <input
                    type="text"
                    placeholder="Đạt KPI/tốt..."
                    value={mobileEventForm.outcome}
                    onChange={(e) =>
                      setMobileEventForm((p) => ({
                        ...p,
                        outcome: e.target.value,
                      }))
                    }
                    className={mobileFormInput}
                  />
                </label>
              </div>
              <div className="flex gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={handleMobileEventSubmit}
                  className="flex-1 h-7 rounded-md text-[10px] font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer touch-manipulation transition-colors shadow-sm"
                >
                  {editingEventRowId ? "Cập nhật" : "Thêm sự kiện"}
                </button>
                {editingEventRowId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEventRowId(null);
                      setMobileEventForm(emptyMobileEventForm());
                    }}
                    className="h-7 px-2.5 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer touch-manipulation transition-colors"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Table view */}
      <div className={`flex-1 min-h-0 overflow-auto ${layoutPad} pt-0`}>
        {activeSubTab === "posts" ? (
          <>
            {/* Posts Table (Mobile version) */}
            <div className="sm:hidden rounded-lg border border-slate-100 bg-white min-w-0">
              <table className="w-full text-left text-[9px] leading-tight">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="w-7 px-1 py-1.5 border border-white/15">
                      <input
                        type="checkbox"
                        checked={
                          posts.length > 0 && selectedPosts.size === posts.length
                        }
                        onChange={toggleSelectAllPosts}
                        className="w-3.5 h-3.5 accent-white cursor-pointer"
                        aria-label="Chọn tất cả"
                      />
                    </th>
                    <th className="px-1 py-1.5 font-bold border border-white/15">
                      Nền tảng
                    </th>
                    <th className="px-1 py-1.5 font-bold border border-white/15">
                      Tiêu đề
                    </th>
                    <th className="px-1 py-1.5 font-bold border border-white/15 w-11">
                      Ngày
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {posts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2 py-6 text-center text-slate-400 italic border border-slate-200/80"
                      >
                        Chưa có dòng bài đăng — điền form phía trên
                      </td>
                    </tr>
                  ) : (
                    posts.map((row, i) => (
                      <tr
                        key={row.rowId}
                        onClick={() => {
                          setMobilePostForm({
                            platform: row.platform,
                            title: row.title,
                            link: row.link,
                            views: row.views,
                            likes: row.likes,
                            comments: row.comments,
                            shares: row.shares,
                            status: row.status,
                            report_date: row.report_date,
                          });
                          setEditingPostRowId(row.rowId);
                          setErrorMsg("");
                        }}
                        className={`cursor-pointer ${
                          i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                        } ${
                          editingPostRowId === row.rowId
                            ? "ring-1 ring-inset ring-primary/30"
                            : ""
                        } ${selectedPosts.has(row.rowId) ? "bg-primary/5" : ""}`}
                      >
                        <td
                          className="px-1 py-1 border border-slate-200/80 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedPosts.has(row.rowId)}
                            onChange={() => toggleSelectPost(row.rowId)}
                            className="w-3 h-3 accent-primary cursor-pointer"
                            aria-label={`Chọn ${row.title || "bài đăng"}`}
                          />
                        </td>
                        <td className="px-1 py-1 border border-slate-200/80 font-bold text-primary max-w-[3.5rem] truncate">
                          {row.platform}
                        </td>
                        <td className="px-1 py-1 border border-slate-200/80 font-semibold text-slate-950 truncate max-w-[7rem]">
                          {row.title || "—"}
                        </td>
                        <td className="px-1 py-1 border border-slate-200/80 text-slate-500 whitespace-nowrap">
                          {formatDateDisplay(row.report_date).slice(0, 5)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Posts Table (Desktop version) */}
            <div className="hidden sm:block rounded-lg border border-slate-100 bg-white min-w-0">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="w-9 px-2 py-2 border border-white/15">
                        <input
                          type="checkbox"
                          checked={
                            posts.length > 0 &&
                            selectedPosts.size === posts.length
                          }
                          onChange={toggleSelectAllPosts}
                          className="w-3.5 h-3.5 accent-white cursor-pointer"
                          aria-label="Chọn tất cả"
                        />
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-24">
                        Nền tảng
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 min-w-[10rem]">
                        Tiêu đề / Nội dung bài đăng
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 min-w-[8rem]">
                        Đường dẫn (Link)
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-20">
                        Lượt xem
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-20">
                        Lượt thích
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-24">
                        Ngày
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPosts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-3 py-10 text-center text-slate-400 italic border border-slate-200/80"
                        >
                          Chưa có dòng bài đăng — bấm &quot;Thêm dòng&quot; để
                          bắt đầu
                        </td>
                      </tr>
                    ) : (
                      displayedPosts.map((row, i) => (
                        <tr
                          key={row.rowId}
                          className={`${
                            i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                          } ${
                            selectedPosts.has(row.rowId)
                              ? "ring-1 ring-inset ring-primary/25 bg-primary/2"
                              : ""
                          }`}
                        >
                          <td className="px-2 py-1 border border-slate-200/80 text-center">
                            <input
                              type="checkbox"
                              checked={selectedPosts.has(row.rowId)}
                              onChange={() => toggleSelectPost(row.rowId)}
                              className="w-3.5 h-3.5 accent-primary cursor-pointer"
                              aria-label={`Chọn ${row.title || "dòng mới"}`}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <div className="flex items-center justify-center gap-1.5 h-8 bg-slate-50/50 rounded border border-slate-200/40 px-1">
                              <button
                                type="button"
                                onClick={() => updatePostRow(row.rowId, "platform", togglePlatform(row.platform, "Tiktok"), true)}
                                title="Tiktok"
                                className={`p-1 rounded transition-all cursor-pointer ${
                                  row.platform.includes("Tiktok")
                                    ? "bg-[#fe2c55]/10 text-[#fe2c55] scale-110"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {TikTokIcon}
                              </button>
                              <button
                                type="button"
                                onClick={() => updatePostRow(row.rowId, "platform", togglePlatform(row.platform, "Facebook"), true)}
                                title="Facebook"
                                className={`p-1 rounded transition-all cursor-pointer ${
                                  row.platform.includes("Facebook")
                                    ? "bg-[#1877f2]/10 text-[#1877f2] scale-110"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {FacebookIcon}
                              </button>
                              <button
                                type="button"
                                onClick={() => updatePostRow(row.rowId, "platform", togglePlatform(row.platform, "Youtube"), true)}
                                title="Youtube"
                                className={`p-1 rounded transition-all cursor-pointer ${
                                  row.platform.includes("Youtube")
                                    ? "bg-[#ff0000]/10 text-[#ff0000] scale-110"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {YouTubeIcon}
                              </button>
                              <button
                                type="button"
                                onClick={() => updatePostRow(row.rowId, "platform", togglePlatform(row.platform, "Website"), true)}
                                title="Website"
                                className={`p-1 rounded transition-all cursor-pointer ${
                                  row.platform.includes("Website")
                                    ? "bg-slate-700/15 text-slate-800 scale-110"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {WebsiteIcon}
                              </button>
                            </div>
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              ref={(el) => {
                                if (el) postTitleRefs.current.set(row.rowId, el);
                                else postTitleRefs.current.delete(row.rowId);
                              }}
                              type="text"
                              placeholder="Tiêu đề video/bài đăng *"
                              value={row.title}
                              onChange={(e) =>
                                updatePostRow(row.rowId, "title", e.target.value)
                              }
                              onBlur={handleMarketingBlur}
                              className={`${cellInput} font-semibold`}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder="Link liên kết"
                              value={row.link}
                              onChange={(e) =>
                                updatePostRow(row.rowId, "link", e.target.value)
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder=""
                              value={row.views}
                              onChange={(e) =>
                                updatePostRow(row.rowId, "views", e.target.value)
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder=""
                              value={row.likes}
                              onChange={(e) =>
                                updatePostRow(row.rowId, "likes", e.target.value)
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDatePicker({
                                  type: "post",
                                  rowId: row.rowId,
                                  value: row.report_date,
                                })
                              }
                              className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-800 bg-white border border-slate-200/80 rounded hover:bg-slate-50/80 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/30 w-full min-h-[2rem]"
                            >
                              <span className="font-sans font-medium text-slate-700">{formatDateDisplay(row.report_date)}</span>
                              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Events Table (Mobile version) */}
            <div className="sm:hidden rounded-lg border border-slate-100 bg-white min-w-0">
              <table className="w-full text-left text-[9px] leading-tight">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="w-7 px-1 py-1.5 border border-white/15">
                      <input
                        type="checkbox"
                        checked={
                          events.length > 0 &&
                          selectedEvents.size === events.length
                        }
                        onChange={toggleSelectAllEvents}
                        className="w-3.5 h-3.5 accent-white cursor-pointer"
                        aria-label="Chọn tất cả"
                      />
                    </th>
                    <th className="px-1 py-1.5 font-bold border border-white/15">
                      Sự kiện
                    </th>
                    <th className="px-1 py-1.5 font-bold border border-white/15">
                      Kết quả
                    </th>
                    <th className="px-1 py-1.5 font-bold border border-white/15 w-11">
                      Ngày
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-2 py-6 text-center text-slate-400 italic border border-slate-200/80"
                      >
                        Chưa có dòng sự kiện — điền form phía trên
                      </td>
                    </tr>
                  ) : (
                    events.map((row, i) => (
                      <tr
                        key={row.rowId}
                        onClick={() => {
                          setMobileEventForm({
                            event_name: row.event_name,
                            event_date: row.event_date,
                            trailer_type: row.trailer_type || "",
                            qty: row.qty || "",
                            location: row.location || "",
                            budget: row.budget,
                            attendees: row.attendees,
                            outcome: row.outcome,
                            status: row.status,
                          });
                          setEditingEventRowId(row.rowId);
                          setErrorMsg("");
                        }}
                        className={`cursor-pointer ${
                          i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                        } ${
                          editingEventRowId === row.rowId
                            ? "ring-1 ring-inset ring-primary/30"
                            : ""
                        } ${selectedEvents.has(row.rowId) ? "bg-primary/5" : ""}`}
                      >
                        <td
                          className="px-1 py-1 border border-slate-200/80 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={selectedEvents.has(row.rowId)}
                            onChange={() => toggleSelectEvent(row.rowId)}
                            className="w-3 h-3 accent-primary cursor-pointer"
                            aria-label={`Chọn ${row.event_name || "sự kiện"}`}
                          />
                        </td>
                        <td className="px-1 py-1 border border-slate-200/80 font-bold text-slate-900 truncate max-w-[6rem]">
                          {row.event_name}
                        </td>
                        <td className="px-1 py-1 border border-slate-200/80 text-slate-600 truncate max-w-[5rem]">
                          {row.outcome || "—"}
                        </td>
                        <td className="px-1 py-1 border border-slate-200/80 text-slate-500 whitespace-nowrap">
                          {formatDateDisplay(row.event_date).slice(0, 5)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Events Table (Desktop version) */}
            <div className="hidden sm:block rounded-lg border border-slate-100 bg-white min-w-0">
              <div className="overflow-x-auto overflow-y-visible">
                <table className="w-full min-w-[850px] text-left text-xs">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="w-9 px-2 py-2 border border-white/15">
                        <input
                          type="checkbox"
                          checked={
                            events.length > 0 &&
                            selectedEvents.size === events.length
                        }
                          onChange={toggleSelectAllEvents}
                          className="w-3.5 h-3.5 accent-white cursor-pointer"
                          aria-label="Chọn tất cả"
                        />
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 min-w-[10rem]">
                        Sự kiện / Khách hàng
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-28">
                        Ngày thực hiện
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-24">
                        Loại mooc
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-20">
                        Số lượng
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 min-w-[8rem]">
                        Địa điểm
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-24">
                        Chi phí (VNĐ)
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 w-20">
                        Khách mời
                      </th>
                      <th className="px-2 py-2 font-bold text-center border border-white/15 min-w-[8rem]">
                        Kết quả đạt được
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedEvents.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-3 py-10 text-center text-slate-400 italic border border-slate-200/80"
                        >
                          Chưa có dòng sự kiện — bấm &quot;Thêm dòng&quot; để
                          bắt đầu
                        </td>
                      </tr>
                    ) : (
                      displayedEvents.map((row, i) => (
                        <tr
                          key={row.rowId}
                          className={`${
                            i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                          } ${
                            selectedEvents.has(row.rowId)
                              ? "ring-1 ring-inset ring-primary/25 bg-primary/2"
                              : ""
                          }`}
                        >
                          <td className="px-2 py-1 border border-slate-200/80 text-center">
                            <input
                              type="checkbox"
                              checked={selectedEvents.has(row.rowId)}
                              onChange={() => toggleSelectEvent(row.rowId)}
                              className="w-3.5 h-3.5 accent-primary cursor-pointer"
                              aria-label={`Chọn ${row.event_name || "dòng mới"}`}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              ref={(el) => {
                                if (el) eventNameRefs.current.set(row.rowId, el);
                                else eventNameRefs.current.delete(row.rowId);
                              }}
                              type="text"
                              placeholder="Tên sự kiện / Khách hàng *"
                              value={row.event_name}
                              onChange={(e) =>
                                updateEventRow(
                                  row.rowId,
                                  "event_name",
                                  e.target.value,
                                )
                              }
                              onBlur={handleMarketingBlur}
                              className={`${cellInput} font-semibold`}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <button
                              type="button"
                              onClick={() =>
                                setActiveDatePicker({
                                  type: "event",
                                  rowId: row.rowId,
                                  value: row.event_date,
                                })
                              }
                              className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-800 bg-white border border-slate-200/80 rounded hover:bg-slate-50/80 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary/30 w-full min-h-[2rem]"
                            >
                              <span className="font-sans font-medium text-slate-700">{formatDateDisplay(row.event_date)}</span>
                              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <AdminSelect
                              compact
                              portal
                              value={row.trailer_type || ""}
                              onChange={(v) =>
                                updateEventRow(row.rowId, "trailer_type", v, true)
                              }
                              options={TRAILER_TYPE_OPTIONS}
                              placeholder="—"
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder="SL"
                              value={row.qty || ""}
                              onChange={(e) =>
                                updateEventRow(row.rowId, "qty", e.target.value)
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder="Địa điểm bàn giao"
                              value={row.location || ""}
                              onChange={(e) =>
                                updateEventRow(row.rowId, "location", e.target.value)
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder="Chi phí"
                              value={row.budget}
                              onChange={(e) =>
                                updateEventRow(row.rowId, "budget", e.target.value)
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder="Khách"
                              value={row.attendees}
                              onChange={(e) =>
                                updateEventRow(
                                  row.rowId,
                                  "attendees",
                                  e.target.value,
                                )
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                          <td className="p-1 border border-slate-200/80">
                            <input
                              type="text"
                              placeholder="Kết quả / Đánh giá KPI"
                              value={row.outcome}
                              onChange={(e) =>
                                updateEventRow(
                                  row.rowId,
                                  "outcome",
                                  e.target.value,
                                )
                              }
                              onBlur={handleMarketingBlur}
                              className={cellInput}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <MarketingExcelPreviewModal
        open={showExcelPreview}
        onClose={() => setShowExcelPreview(false)}
        onConfirm={handleConfirmExportExcel}
        period={period}
        staffName={selectedStaffId === "all" ? "Tất cả nhân sự" : (marketingStaff.find(s => s.id === selectedStaffId)?.full_name || profile.full_name)}
        branchName={profile.department?.branch ? `${profile.department.name} - ${profile.department.branch.name}` : profile.department?.name}
        posts={posts.filter((p) => p.title.trim())}
        events={events.filter((e) => e.event_name.trim())}
      />

      {activeDatePicker && (
        <DatePickerModal
          open={!!activeDatePicker}
          value={activeDatePicker.value}
          onClose={() => setActiveDatePicker(null)}
          onSelect={(newDate) => {
            if (activeDatePicker.type === "post") {
              updatePostRow(activeDatePicker.rowId, "report_date", newDate, true);
            } else if (activeDatePicker.type === "event") {
              updateEventRow(activeDatePicker.rowId, "event_date", newDate, true);
            } else if (activeDatePicker.type === "post-mobile") {
              setMobilePostForm((p) => ({ ...p, report_date: newDate }));
            } else if (activeDatePicker.type === "event-mobile") {
              setMobileEventForm((p) => ({ ...p, event_date: newDate }));
            }
            setActiveDatePicker(null);
          }}
        />
      )}
    </div>
  );
}
