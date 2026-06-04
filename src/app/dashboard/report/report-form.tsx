"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDailyReport, Profile, DailyReport, TaskItem } from "../../actions";

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
  
  // State
  const [reportDate, setReportDate] = useState(
    initialReport?.report_date || new Date().toISOString().split("T")[0]
  );
  const [tasks, setTasks] = useState<TaskItem[]>(
    initialReport?.tasks_data || [{ ...defaultTask }]
  );
  
  // Track open custom select dropdown index
  const [openSelectIdx, setOpenSelectIdx] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Add a new task block
  const handleAddTask = () => {
    setTasks([...tasks, { ...defaultTask }]);
  };

  // Remove a task block
  const handleRemoveTask = (index: number) => {
    if (tasks.length === 1) return;
    setTasks(tasks.filter((_, idx) => idx !== index));
    if (openSelectIdx === index) setOpenSelectIdx(null);
  };

  // Handle task field changes
  const handleTaskChange = (index: number, field: keyof TaskItem, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index] = {
      ...updatedTasks[index],
      [field]: value,
    };
    setTasks(updatedTasks);
  };

  // Handle Form Submission
  const handleSubmit = async (status: "draft" | "submitted") => {
    if (tasks.some(t => !t.title.trim() || !t.progress.trim())) {
      setErrorMsg("Vui lòng điền đầy đủ Tên công việc và Kết quả đạt được cho tất cả các đầu việc.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await saveDailyReport({
        id: initialReport?.id,
        date: reportDate,
        tasksData: tasks,
        status,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể lưu báo cáo, vui lòng thử lại.");
      setLoading(false);
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-3">
      <div className="max-w-xl mx-auto space-y-3">
        
        {/* Navigation / Header */}
        <div className="flex items-center justify-between px-1">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Quay lại
          </button>
          
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-lg font-bold">
            {initialReport ? "CẬP NHẬT BÁO CÁO" : "BÁO CÁO MỚI"}
          </span>
        </div>

        {/* User profile info */}
        <div className="bg-white p-3.5 rounded-lg shadow-sm">
          <h2 className="text-sm font-bold text-primary">
            {initialReport ? "Chỉnh sửa báo cáo" : "Báo cáo ngày"} {formatDateDisplay(reportDate)}
          </h2>
          <p className="text-slate-400 text-[10px] mt-0.5">
            Nhân sự: <span className="font-bold text-slate-600">{user.full_name}</span> - Khối {user.department?.name}
            {user.department?.branch && `, Chi nhánh ${user.department.branch.name}`}
          </p>
        </div>

        {/* Form elements */}
        <div className="space-y-3">
          
          {/* Date Selector */}
          <div className="bg-white p-3 rounded-lg shadow-sm space-y-1">
            <label className="block text-xs font-bold text-slate-600 uppercase">Ngày báo cáo</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              disabled={!!initialReport}
              className="bg-slate-50 text-slate-800 px-3 py-2 rounded-lg border-0 focus:outline-none focus:bg-slate-100 disabled:opacity-60 transition-colors font-semibold text-xs cursor-pointer w-full max-w-xs"
            />
          </div>

          {/* Task cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Danh sách đầu việc</h3>
            </div>

            {tasks.map((task, idx) => (
              <div
                key={idx}
                className="bg-white p-3.5 rounded-lg shadow-sm space-y-3 relative transition-all"
              >
                {/* Block header */}
                <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold">
                    Công việc #{idx + 1}
                  </span>
                  
                  {tasks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-[10px] font-bold flex items-center gap-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862" />
                      </svg>
                      Xóa bỏ
                    </button>
                  )}
                </div>

                {/* Form fields */}
                <div className="space-y-3">
                  {/* Task Name */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600">Tên công việc</label>
                    <input
                      type="text"
                      placeholder="Nhập tên đầu việc..."
                      value={task.title}
                      onChange={(e) => handleTaskChange(idx, "title", e.target.value)}
                      className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-lg border-0 focus:outline-none focus:bg-slate-100 transition-colors text-xs"
                      required
                    />
                  </div>

                  {/* Task Progress & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-slate-600">Kết quả / Tiến độ đạt được</label>
                      <input
                        type="text"
                        placeholder="Nhập kết quả..."
                        value={task.progress}
                        onChange={(e) => handleTaskChange(idx, "progress", e.target.value)}
                        className="w-full bg-slate-50 text-slate-800 px-3 py-2 rounded-lg border-0 focus:outline-none focus:bg-slate-100 transition-colors text-xs"
                        required
                      />
                    </div>

                    {/* Custom Dropdown select for task status */}
                    <div className="space-y-1 relative">
                      <label className="block text-xs font-bold text-slate-600">Trạng thái công việc</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenSelectIdx(openSelectIdx === idx ? null : idx)}
                          className="w-full bg-slate-50 text-slate-800 px-3 py-2.5 rounded-lg text-left text-xs flex items-center justify-between transition-colors cursor-pointer hover:bg-slate-100/50"
                        >
                          <span>
                            {task.status === "completed" ? "Hoàn thành" : task.status === "in_progress" ? "Đang tiến hành" : "Chờ / Chưa bắt đầu"}
                          </span>
                          <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>

                        {openSelectIdx === idx && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenSelectIdx(null)} />
                            <div className="absolute z-20 mt-1 w-full bg-white shadow-lg rounded-lg py-1 max-h-60 overflow-y-auto no-scrollbar">
                              <button
                                type="button"
                                onClick={() => {
                                  handleTaskChange(idx, "status", "in_progress");
                                  setOpenSelectIdx(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
                              >
                                Đang tiến hành
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleTaskChange(idx, "status", "completed");
                                  setOpenSelectIdx(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
                              >
                                Hoàn thành
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleTaskChange(idx, "status", "pending");
                                  setOpenSelectIdx(null);
                                }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors font-semibold"
                              >
                                Chờ / Chưa bắt đầu
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ))}

            {/* Add Task Trigger */}
            <div className="flex justify-start px-1">
              <button
                type="button"
                onClick={handleAddTask}
                className="text-primary hover:text-primary-hover font-bold transition-colors flex items-center gap-1.5 cursor-pointer py-1 text-xs"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Thêm đầu việc mới
              </button>
            </div>

          </div>

          {/* Feedback from Manager if present */}
          {initialReport?.feedback && (
            <div className="bg-amber-50 text-amber-800 p-3.5 rounded-lg text-xs space-y-1">
              <h4 className="font-bold flex items-center gap-1">
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Yêu cầu chỉnh sửa từ Quản lý:
              </h4>
              <p className="text-slate-700 mt-1 italic">"{initialReport.feedback}"</p>
            </div>
          )}

          {/* Errors */}
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Action Triggers */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit("draft")}
              className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-4 py-3 rounded-lg shadow-sm transition-colors text-xs cursor-pointer border-0 flex-grow"
            >
              Lưu bản nháp
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit("submitted")}
              className="bg-primary text-white hover:bg-primary-hover font-bold px-6 py-3 rounded-lg shadow-md transition-colors text-xs cursor-pointer flex-grow text-center"
            >
              {loading ? "Đang gửi..." : "Gửi báo cáo"}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
