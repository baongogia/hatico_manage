"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { glassPanel } from "@/lib/glass-styles";
import { saveDailyReport, Profile, DailyReport, TaskItem } from "../../actions";
import PageBackground from "../page-background";

interface ReportFormProps {
  user: Profile;
  initialReport: DailyReport | null;
}

const defaultTask: TaskItem = {
  title: "",
  progress: "",
  status: "in_progress",
};

export default function ReportForm({ user, initialReport }: ReportFormProps) {
  const router = useRouter();

  const [reportDate, setReportDate] = useState(
    initialReport?.report_date || new Date().toISOString().split("T")[0]
  );
  const [tasks, setTasks] = useState<TaskItem[]>(
    initialReport?.tasks_data?.length
      ? initialReport.tasks_data
      : [{ ...defaultTask }]
  );

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusIndexRef = useRef<number | null>(null);

  useEffect(() => {
    router.prefetch("/dashboard");
  }, [router]);

  const appendTask = () => {
    focusIndexRef.current = tasks.length;
    setTasks((prev) => [...prev, { ...defaultTask }]);
  };

  useEffect(() => {
    const idx = focusIndexRef.current;
    if (idx === null) return;
    focusIndexRef.current = null;

    requestAnimationFrame(() => {
      const input = inputRefs.current[idx];
      if (!input) return;
      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [tasks.length]);

  const handleRemoveTask = (index: number) => {
    if (tasks.length === 1) {
      setTasks([{ ...defaultTask }]);
      return;
    }
    setTasks(tasks.filter((_, idx) => idx !== index));
  };

  const handleTaskChange = (index: number, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = { ...updatedTasks[index], title: value };
    setTasks(updatedTasks);
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = tasks[index].title.trim();
      if (!trimmed) return;
      if (index === tasks.length - 1) {
        appendTask();
      }
    }
  };

  const handleSubmit = async () => {
    const validTasks = tasks
      .filter((t) => t.title.trim())
      .map((t) => ({
        title: t.title.trim(),
        progress: "",
        status: "in_progress" as const,
      }));

    if (validTasks.length === 0) {
      setErrorMsg("Vui lòng thêm ít nhất một đầu việc.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await saveDailyReport({
        id: initialReport?.id,
        date: reportDate,
        tasksData: validTasks,
        status: "submitted",
      });

      if (res.error) {
        throw new Error(res.error);
      }

      router.replace("/dashboard?notice=submitted");
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể lưu báo cáo, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="relative z-10 flex min-h-[100dvh] items-start justify-center py-4 px-3 max-sm:pt-[max(1rem,env(safe-area-inset-top))] overflow-x-hidden">
      <PageBackground />

      <div className="relative z-10 w-full max-w-xl space-y-3">
        <div className="flex items-center justify-between px-1">
          <Link
            href="/dashboard"
            prefetch
            className="flex items-center gap-1.5 text-primary hover:text-primary-hover font-bold text-xs transition-opacity cursor-pointer active:opacity-60 touch-manipulation"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại
          </Link>

          <span className="text-[10px] bg-white/60 text-primary border border-white/80 px-2 py-0.5 rounded-lg font-bold backdrop-blur-sm">
            {initialReport ? "CẬP NHẬT BÁO CÁO" : "BÁO CÁO MỚI"}
          </span>
        </div>

        <div className={`${glassPanel} p-3.5`}>
          <h2 className="text-sm font-bold text-primary">
            {initialReport ? "Chỉnh sửa báo cáo" : "Báo cáo ngày"} {formatDateDisplay(reportDate)}
          </h2>
          <p className="text-slate-700 text-[10px] mt-0.5">
            Nhân sự: <span className="font-bold text-slate-900">{user.full_name}</span> - Khối{" "}
            {user.department?.name}
            {user.department?.branch && `, Chi nhánh ${user.department.branch.name}`}
          </p>
        </div>

        <div className="space-y-3">
          <div className={`${glassPanel} p-3 space-y-2`}>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wide">Danh sách đầu việc</h3>
            <p className="text-[10px] text-slate-600">Nhập tên công việc, Enter để thêm dòng mới</p>

            <div className="space-y-1.5">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white/70 border border-slate-200/80 px-2.5 py-1.5 rounded-lg"
                >
                  <span className="text-[10px] text-slate-500 font-bold w-4 shrink-0 text-center">
                    {idx + 1}
                  </span>
                  <input
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    placeholder="Nhập đầu việc..."
                    value={task.title}
                    onChange={(e) => handleTaskChange(idx, e.target.value)}
                    onKeyDown={(e) => handleTaskKeyDown(e, idx)}
                    className="flex-1 bg-transparent text-slate-900 text-base sm:text-xs focus:outline-none placeholder:text-slate-400 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(idx)}
                    className="text-slate-400 hover:text-rose-500 p-0.5 shrink-0 transition-colors cursor-pointer"
                    aria-label="Xóa đầu việc"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={appendTask}
              className="text-primary hover:text-primary-hover font-bold transition-colors flex items-center gap-1.5 cursor-pointer py-1 text-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Thêm đầu việc
            </button>
          </div>

          {errorMsg && (
            <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-primary text-white hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-400 font-bold px-6 py-3 rounded-lg shadow-md transition-colors text-xs cursor-pointer text-center"
          >
            {loading ? "Đang gửi..." : initialReport ? "Cập nhật báo cáo" : "Gửi báo cáo"}
          </button>
        </div>
      </div>
    </div>
  );
}
