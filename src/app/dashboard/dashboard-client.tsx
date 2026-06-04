"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReport, submitFeedback, logoutUser, DailyReport, Profile } from "../actions";

interface DashboardClientProps {
  initialData: {
    role: string;
    profile: Profile;
    reports?: DailyReport[];
    employees?: Profile[];
    date?: string;
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Destructure initial data
  const { role, profile, reports: initialReports = [], employees = [], date: initialDate } = initialData;

  // States
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  
  // Custom Alert Modal state
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: "",
    message: ""
  });

  // Mobile navigation tabs
  const [activeManagerTab, setActiveManagerTab] = useState<"summary" | "detail">("summary");
  const [activeEmployeeTab, setActiveEmployeeTab] = useState<"today" | "history">("today");

  // Feedback action state
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("hatico_user_session");
    router.push("/login");
    router.refresh();
  };

  // Handle date change
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    startTransition(() => {
      router.push(`/dashboard?date=${newDate}`);
    });
  };

  // Handle Approval
  const handleApproval = async (reportId: string, approve: boolean) => {
    setApprovalLoading(true);
    try {
      const res = await approveReport(reportId, approve);
      if (res.error) {
        setAlertModal({ show: true, title: "Lỗi hệ thống", message: res.error });
      } else {
        router.refresh();
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport(prev => prev ? {
            ...prev,
            status: approve ? "approved" : "submitted",
            approved_by: approve ? profile.id : undefined
          } : null);
        }
      }
    } catch (err: any) {
      console.error(err);
      setAlertModal({ show: true, title: "Lỗi kết nối", message: err.message || "Không thể thực hiện phê duyệt." });
    } finally {
      setApprovalLoading(false);
    }
  };

  // Handle Feedback Submission
  const handleFeedback = async (reportId: string, requestChanges: boolean) => {
    if (!feedbackText.trim() && !requestChanges) {
      setAlertModal({ show: true, title: "Nhắc nhở", message: "Vui lòng nhập nội dung phản hồi" });
      return;
    }
    setFeedbackLoading(true);
    try {
      const res = await submitFeedback({
        reportId,
        feedback: feedbackText,
        requestChanges
      });
      if (res.error) {
        setAlertModal({ show: true, title: "Lỗi hệ thống", message: res.error });
      } else {
        setFeedbackText("");
        router.refresh();
        if (selectedReport && selectedReport.id === reportId) {
          setSelectedReport(prev => prev ? {
            ...prev,
            feedback: feedbackText,
            status: requestChanges ? "draft" : prev.status
          } : null);
        }
        if (requestChanges) {
          setSelectedReport(null);
          setActiveManagerTab("summary"); // Switch back on mobile
        }
      }
    } catch (err: any) {
      console.error(err);
      setAlertModal({ show: true, title: "Lỗi kết nối", message: err.message || "Không thể gửi phản hồi." });
    } finally {
      setFeedbackLoading(false);
    }
  };

  // Export to Excel (CSV with UTF-8 BOM)
  const handleExportExcel = () => {
    const headers = ["Họ và tên", "Bộ phận", "Ngày báo cáo", "Tên công việc", "Tiến độ / Kết quả", "Trạng thái"];
    const rows: string[][] = [];

    // Loop through all employees and find their reports
    for (const emp of employees) {
      const report = initialReports.find(r => r.user_id === emp.id);
      if (report) {
        for (const task of report.tasks_data) {
          rows.push([
            emp.full_name,
            emp.department?.name || "",
            selectedDate,
            task.title,
            task.progress,
            task.status === "completed" ? "Hoàn thành" : task.status === "in_progress" ? "Đang tiến hành" : "Chờ/Chưa bắt đầu"
          ]);
        }
      } else {
        rows.push([
          emp.full_name,
          emp.department?.name || "",
          selectedDate,
          "Chưa nộp báo cáo",
          "-",
          "-"
        ]);
      }
    }

    const csvContent = "\uFEFF" + [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Bao_cao_Hatico_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper: Get status details
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { text: "Đã duyệt", classes: "bg-emerald-50 text-emerald-700 font-semibold" };
      case "submitted":
        return { text: "Chờ duyệt", classes: "bg-blue-50 text-blue-700 font-semibold" };
      case "draft":
        return { text: "Bản nháp", classes: "bg-slate-100 text-slate-600 font-semibold" };
      default:
        return { text: "Chưa nộp", classes: "bg-rose-50 text-rose-600 font-semibold" };
    }
  };

  const getTaskStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { text: "Hoàn thành", classes: "bg-emerald-50 text-emerald-700" };
      case "in_progress":
        return { text: "Đang tiến hành", classes: "bg-amber-50 text-amber-700" };
      default:
        return { text: "Chờ/Chưa làm", classes: "bg-slate-100 text-slate-600" };
    }
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return "";
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayReport = role === "employee" ? initialReports.find(r => r.report_date === todayStr) : null;

  // Filter employees based on reports & status filter
  const filteredEmployees = employees.filter(emp => {
    const report = initialReports.find(r => r.user_id === emp.id);
    const status = report ? report.status : "missing";
    if (statusFilter === "all") return true;
    return status === statusFilter;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans relative">
      
      {/* 1. TOP HEADER */}
      <header className="bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] px-3 py-2 flex items-center justify-between h-12 shrink-0 z-10 no-print">
        <div className="flex items-center gap-2">
          <img
            src="/logo/hatico_logo.png"
            alt="Hatico Logo"
            className="w-8 h-8 object-contain rounded-lg"
          />
          <div>
            <span className="font-bold text-primary tracking-tight text-sm">HATICO</span>
            <span className="hidden sm:inline-block text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-lg ml-1.5 font-bold uppercase">
              {role === "employee" ? "Nhân viên" : role === "department_manager" ? "Trưởng bộ phận" : "Giám đốc"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] leading-tight hidden sm:block">
            <p className="font-bold text-slate-800">{profile.full_name}</p>
            <p className="text-slate-400">
              {profile.department?.name}
              {profile.department?.branch && ` - ${profile.department.branch.name}`}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-slate-500 hover:text-rose-600 text-xs font-bold transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
            Thoát
          </button>
        </div>
      </header>

      {/* 2. MAIN PORTAL BODY */}
      <div className="flex-grow h-[calc(100vh-48px)] overflow-hidden relative flex flex-col no-print">
        
        {/* ==================== A. EMPLOYEE PORTAL ==================== */}
        {role === "employee" && (
          <div className="flex flex-col h-full">
            {/* Mobile Tab headers - employee */}
            <div className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] px-3 py-1 flex sm:hidden justify-around border-b border-slate-100 shrink-0">
              <button
                onClick={() => setActiveEmployeeTab("today")}
                className={`py-1.5 text-xs font-bold border-b-2 transition-all ${
                  activeEmployeeTab === "today" ? "border-primary text-primary" : "border-transparent text-slate-400"
                }`}
              >
                Báo cáo hôm nay
              </button>
              <button
                onClick={() => setActiveEmployeeTab("history")}
                className={`py-1.5 text-xs font-bold border-b-2 transition-all ${
                  activeEmployeeTab === "history" ? "border-primary text-primary" : "border-transparent text-slate-400"
                }`}
              >
                Lịch sử báo cáo
              </button>
            </div>

            {/* Split layout */}
            <div className="flex-grow flex overflow-hidden">
              
              {/* History Section */}
              <div className={`${
                activeEmployeeTab === "history" ? "flex" : "hidden"
              } sm:flex flex-col w-full sm:w-80 border-r border-slate-100 bg-white shrink-0 h-full overflow-hidden`}>
                <div className="p-3 border-b border-slate-100 shrink-0">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lịch sử báo cáo đã nộp</h3>
                </div>
                <div className="flex-grow overflow-y-auto no-scrollbar p-3 space-y-2">
                  {initialReports.length === 0 ? (
                    <p className="text-slate-400 text-xs italic p-2 text-center">Chưa nộp báo cáo nào</p>
                  ) : (
                    initialReports.map((report) => (
                      <div
                        key={report.id}
                        onClick={() => {
                          setSelectedReport(report);
                          setActiveEmployeeTab("today");
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors text-left flex items-center justify-between ${
                          selectedReport?.id === report.id ? "bg-slate-100" : "hover:bg-slate-50 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-800">{formatDateDisplay(report.report_date)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{report.tasks_data?.length || 0} việc đã làm</p>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-lg ${getStatusBadge(report.status).classes}`}>
                          {getStatusBadge(report.status).text}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Active / Selected Report Section */}
              <div className={`${
                activeEmployeeTab === "today" ? "flex" : "hidden sm:flex"
              } flex-grow flex-col h-full bg-slate-50 overflow-y-auto p-3 space-y-3`}>
                
                <div className="bg-white p-3 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.01)] shrink-0 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-primary">Xin chào, {profile.full_name}</h2>
                    <p className="text-[10px] text-slate-400">Khối {profile.department?.name} {profile.department?.branch && ` - ${profile.department.branch.name}`}</p>
                  </div>
                  <button
                    onClick={() => router.push("/dashboard/report")}
                    className="bg-primary text-white hover:bg-primary-hover font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    Viết báo cáo mới
                  </button>
                </div>

                {selectedReport || todayReport ? (
                  <div className="space-y-3">
                    {(() => {
                      const displayReport = selectedReport || todayReport;
                      if (!displayReport) return null;
                      return (
                        <div className="bg-white p-4 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                            <div>
                              <h3 className="text-xs font-bold text-slate-700">
                                Báo cáo ngày {formatDateDisplay(displayReport.report_date)}
                              </h3>
                              {displayReport.id === todayReport?.id && (
                                <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-lg font-bold mt-1 inline-block">Báo cáo hôm nay</span>
                              )}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-lg ${getStatusBadge(displayReport.status).classes}`}>
                              {getStatusBadge(displayReport.status).text}
                            </span>
                          </div>

                          <div className="space-y-2">
                            <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Đầu việc chi tiết:</h4>
                            <div className="space-y-2">
                              {displayReport.tasks_data.map((task, idx) => (
                                <div key={idx} className="bg-slate-50 p-2.5 rounded-lg flex items-center justify-between text-xs gap-3">
                                  <div>
                                    <p className="font-bold text-slate-800">{task.title}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Tiến độ/Kết quả: {task.progress}</p>
                                  </div>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-lg whitespace-nowrap ${getTaskStatusBadge(task.status).classes}`}>
                                    {getTaskStatusBadge(task.status).text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {displayReport.feedback && (
                            <div className="bg-blue-50/50 p-3 rounded-lg border-0 text-xs">
                              <p className="font-bold text-primary">Phản hồi của quản lý:</p>
                              <p className="text-slate-700 mt-1 italic">"{displayReport.feedback}"</p>
                            </div>
                          )}

                          {displayReport.status !== "approved" && (
                            <div className="pt-2 border-t border-slate-50 flex gap-2">
                              <button
                                onClick={() => router.push(`/dashboard/report?id=${displayReport.id}`)}
                                className="bg-primary text-white hover:bg-primary-hover font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                              >
                                Chỉnh sửa báo cáo
                              </button>
                              {selectedReport && (
                                <button
                                  onClick={() => setSelectedReport(null)}
                                  className="bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                                >
                                  Xem báo cáo hôm nay
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="bg-white p-6 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center text-center py-12">
                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-lg mb-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-bold text-sm">Chưa có báo cáo hôm nay</p>
                    <p className="text-slate-400 text-xs mt-1">Vui lòng viết báo cáo để gửi lên ban giám đốc.</p>
                    <button
                      onClick={() => router.push("/dashboard/report")}
                      className="bg-primary text-white hover:bg-primary-hover font-bold px-5 py-2.5 rounded-lg mt-4 transition-colors shadow-sm cursor-pointer text-xs"
                    >
                      Bắt đầu viết ngay
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ==================== B. MANAGER / ADMIN PORTAL ==================== */}
        {(role === "department_manager" || role === "branch_director") && (
          <div className="flex flex-col h-full">
            
            {/* Top Control Panel */}
            <div className="bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] p-3 shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 z-10">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-600 uppercase">Ngày:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="bg-slate-50 text-slate-800 px-3 py-1.5 rounded-lg border-0 focus:outline-none focus:bg-slate-100 transition-colors font-semibold text-xs cursor-pointer"
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[280px] sm:max-w-none">
                  {["all", "submitted", "approved", "draft", "missing"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        statusFilter === filter
                          ? "bg-primary text-white"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                      }`}
                    >
                      {filter === "all" ? "Tất cả" : filter === "submitted" ? "Chờ" : filter === "approved" ? "Duyệt" : filter === "draft" ? "Nháp" : "Chưa"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleExportExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  Tải Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Xuất PDF
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="bg-white border-b border-slate-100 p-2 shrink-0 grid grid-cols-4 gap-2 text-center text-[10px] leading-tight">
              <div className="bg-slate-50 py-1.5 rounded-lg">
                <p className="text-slate-400 font-bold">NHÂN SỰ</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{employees.length}</p>
              </div>
              <div className="bg-blue-50/50 py-1.5 rounded-lg">
                <p className="text-blue-500 font-bold">ĐÃ NỘP</p>
                <p className="text-xs font-bold text-blue-700 mt-0.5">
                  {initialReports.filter(r => r.status === "submitted" || r.status === "approved").length}
                </p>
              </div>
              <div className="bg-emerald-50/50 py-1.5 rounded-lg">
                <p className="text-emerald-500 font-bold">ĐÃ DUYỆT</p>
                <p className="text-xs font-bold text-emerald-700 mt-0.5">
                  {initialReports.filter(r => r.status === "approved").length}
                </p>
              </div>
              <div className="bg-rose-50/50 py-1.5 rounded-lg">
                <p className="text-rose-500 font-bold">CHƯA DUYỆT</p>
                <p className="text-xs font-bold text-rose-700 mt-0.5">
                  {employees.length - initialReports.filter(r => r.status === "approved").length}
                </p>
              </div>
            </div>

            {/* Mobile Tab headers - manager */}
            <div className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)] px-3 py-1 flex sm:hidden justify-around border-b border-slate-100 shrink-0">
              <button
                onClick={() => setActiveManagerTab("summary")}
                className={`py-1.5 text-xs font-bold border-b-2 transition-all ${
                  activeManagerTab === "summary" ? "border-primary text-primary" : "border-transparent text-slate-400"
                }`}
              >
                Danh sách tổng quan
              </button>
              <button
                onClick={() => setActiveManagerTab("detail")}
                disabled={!selectedReport}
                className={`py-1.5 text-xs font-bold border-b-2 transition-all disabled:opacity-30 ${
                  activeManagerTab === "detail" ? "border-primary text-primary" : "border-transparent text-slate-400"
                }`}
              >
                Chi tiết báo cáo
              </button>
            </div>

            {/* Split panel workspace */}
            <div className="flex-grow flex overflow-hidden">
              
              {/* Employee Checklist List */}
              <div className={`${
                activeManagerTab === "summary" ? "flex" : "hidden"
              } sm:flex flex-col w-full sm:w-80 border-r border-slate-100 bg-white shrink-0 h-full overflow-hidden`}>
                <div className="p-3 border-b border-slate-50 shrink-0">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Danh sách nhân sự</h4>
                </div>
                <div className="flex-grow overflow-y-auto no-scrollbar p-3 space-y-2">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-slate-400 text-xs italic text-center p-4">Không có nhân sự phù hợp bộ lọc</p>
                  ) : (
                    filteredEmployees.map((emp) => {
                      const report = initialReports.find(r => r.user_id === emp.id);
                      const status = report ? report.status : "missing";
                      const isSelected = selectedReport?.user_id === emp.id;

                      return (
                        <div
                          key={emp.id}
                          onClick={() => {
                            if (report) {
                              setSelectedReport({ ...report, profile: emp });
                              setActiveManagerTab("detail");
                            } else {
                              setSelectedReport(null);
                              setAlertModal({
                                show: true,
                                title: "Thông báo",
                                message: `Nhân sự ${emp.full_name} chưa làm báo cáo ngày hôm nay.`
                              });
                            }
                          }}
                          className={`p-2.5 rounded-lg transition-colors text-left flex items-center justify-between cursor-pointer ${
                            isSelected ? "bg-slate-100" : "hover:bg-slate-50 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.01)]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded-lg text-primary font-bold text-xs uppercase">
                              {emp.full_name.split(" ").pop()?.substring(0, 2)}
                            </div>
                            <div className="leading-tight">
                              <p className="text-xs font-bold text-slate-800">{emp.full_name}</p>
                              <p className="text-[10px] text-slate-400">{emp.department?.name}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-lg ${getStatusBadge(status).classes}`}>
                            {getStatusBadge(status).text}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Detailed Report Inspection Area */}
              <div className={`${
                activeManagerTab === "detail" ? "flex" : "hidden sm:flex"
              } flex-grow flex-col h-full bg-slate-50 overflow-y-auto p-3`}>
                
                {selectedReport ? (
                  <div className="bg-white p-4 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.01)] space-y-4 max-w-2xl w-full mx-auto">
                    
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <div>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-bold">CHI TIẾT KIỂM TRA</span>
                        <h3 className="text-sm font-bold text-slate-800 mt-1">
                          Báo cáo ngày {formatDateDisplay(selectedReport.report_date)}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Nhân sự: <span className="font-bold text-slate-700">{selectedReport.profile?.full_name}</span>
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-lg ${getStatusBadge(selectedReport.status).classes}`}>
                        {getStatusBadge(selectedReport.status).text}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Công việc thực hiện:</h4>
                      <div className="space-y-2">
                        {selectedReport.tasks_data?.map((task, idx) => (
                          <div key={idx} className="bg-slate-50 p-2.5 rounded-lg space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">{idx + 1}. {task.title}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-lg ${getTaskStatusBadge(task.status).classes}`}>
                                {getTaskStatusBadge(task.status).text}
                              </span>
                            </div>
                            <p className="text-slate-500 text-[10px] pl-3">Tiến độ: {task.progress}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {selectedReport.feedback && (
                      <div className="bg-blue-50/50 p-3 rounded-lg text-xs">
                        <p className="font-bold text-primary">Ý kiến phản hồi trước:</p>
                        <p className="text-slate-700 mt-1 italic">"{selectedReport.feedback}"</p>
                      </div>
                    )}

                    <div className="bg-slate-50 p-3.5 rounded-lg space-y-3">
                      <p className="text-xs font-bold text-slate-700">Duyệt & Nhận xét</p>

                      <div className="flex gap-2">
                        {selectedReport.status === "submitted" && (
                          <button
                            onClick={() => handleApproval(selectedReport.id, true)}
                            disabled={approvalLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors cursor-pointer flex-grow text-center"
                          >
                            {approvalLoading ? "Đang xử lý..." : "Duyệt báo cáo"}
                          </button>
                        )}
                        {selectedReport.status === "approved" && (
                          <button
                            onClick={() => handleApproval(selectedReport.id, false)}
                            disabled={approvalLoading}
                            className="bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:bg-slate-200 font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer w-full text-center"
                          >
                            {approvalLoading ? "Đang xử lý..." : "Hủy phê duyệt"}
                          </button>
                        )}
                      </div>

                      <div className="space-y-2 pt-1 border-t border-slate-200/50">
                        <textarea
                          rows={2}
                          placeholder="Nhập nhận xét / phản chỉ đạo..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          className="w-full bg-white text-slate-800 p-2.5 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary/10 transition-all text-xs resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleFeedback(selectedReport.id, false)}
                            disabled={feedbackLoading}
                            className="bg-primary hover:bg-primary-hover disabled:bg-slate-200 text-white font-bold text-[11px] px-3 py-2 rounded-lg transition-colors cursor-pointer flex-grow text-center"
                          >
                            {feedbackLoading ? "Đang gửi..." : "Gửi ý kiến"}
                          </button>
                          {selectedReport.status !== "approved" && (
                            <button
                              onClick={() => handleFeedback(selectedReport.id, true)}
                              disabled={feedbackLoading}
                              className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white font-bold text-[11px] px-3 py-2 rounded-lg transition-colors cursor-pointer flex-grow text-center"
                            >
                              {feedbackLoading ? "Đang xử lý..." : "Yêu cầu sửa lại"}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white p-8 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.01)] flex flex-col items-center justify-center text-center py-12 max-w-2xl w-full mx-auto">
                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-lg mb-3">
                      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-bold text-sm">Chưa chọn báo cáo để kiểm tra</p>
                    <p className="text-slate-400 text-xs mt-1">Chọn một nhân sự ở danh sách bên trái để kiểm tra chi tiết.</p>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

      </div>

      {/* ==================== C. PRINT DOCUMENT AREA ==================== */}
      <div className="print-area hidden p-6 space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase font-bold tracking-wide">CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO</p>
          <h1 className="text-xl font-bold tracking-tight">TỔNG HỢP BÁO CÁO CÔNG VIỆC HÀNG NGÀY</h1>
          <p className="text-xs text-slate-500">Ngày báo cáo: {formatDateDisplay(selectedDate)}</p>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-bold border-b border-black pb-1 uppercase">I. Danh sách nộp báo cáo</h2>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-300 font-semibold bg-slate-50">
                <th className="py-2 px-3">Họ và tên</th>
                <th className="py-2 px-3">Bộ phận</th>
                <th className="py-2 px-3">Trạng thái</th>
                <th className="py-2 px-3">Số lượng việc</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const report = initialReports.find(r => r.user_id === emp.id);
                return (
                  <tr key={emp.id} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-semibold">{emp.full_name}</td>
                    <td className="py-2 px-3">{emp.department?.name}</td>
                    <td className="py-2 px-3">{report ? (report.status === "approved" ? "Đã duyệt" : "Chờ duyệt") : "Chưa nộp"}</td>
                    <td className="py-2 px-3">{report ? `${report.tasks_data?.length || 0} việc` : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold border-b border-black pb-1 uppercase">II. Chi tiết nội dung công việc</h2>
          
          {employees.map((emp) => {
            const report = initialReports.find(r => r.user_id === emp.id);
            if (!report) return null;
            return (
              <div key={emp.id} className="print-card space-y-2">
                <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                  <span className="font-bold text-xs">{emp.full_name} ({emp.department?.name})</span>
                  <span className="text-[10px] italic">Trạng thái: {report.status === "approved" ? "Đã duyệt" : "Chờ duyệt"}</span>
                </div>
                
                <div className="pl-4 space-y-2">
                  {report.tasks_data.map((task, idx) => (
                    <div key={idx} className="text-xs space-y-0.5">
                      <p className="font-semibold">{idx + 1}. {task.title}</p>
                      <p className="text-slate-500 text-[10px]">Kết quả/Tiến độ: {task.progress} | Trạng thái: {task.status === "completed" ? "Hoàn thành" : task.status === "in_progress" ? "Đang tiến hành" : "Chưa hoàn thành"}</p>
                    </div>
                  ))}
                </div>

                {report.feedback && (
                  <div className="pl-4 pt-1 text-[10px] text-slate-500 italic">
                    * Nhận xét của quản lý: "{report.feedback}"
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-12 grid grid-cols-2 text-center text-xs">
          <div className="space-y-16">
            <p className="font-bold">Người tổng hợp</p>
            <p className="text-slate-400">(Ký và ghi rõ họ tên)</p>
          </div>
          <div className="space-y-16">
            <p className="font-bold">Ban Giám Đốc duyệt</p>
            <p className="text-slate-400">(Ký tên và đóng dấu)</p>
          </div>
        </div>
      </div>

      {/* ==================== D. CUSTOM REUSABLE ALERT MODAL ==================== */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs flex items-center justify-center z-50 p-3 no-print">
          <div className="bg-white p-4 rounded-lg shadow-xl max-w-xs w-full space-y-3 animate-slide-in">
            <h3 className="font-bold text-slate-800 text-sm">{alertModal.title}</h3>
            <p className="text-slate-500 text-xs leading-relaxed">{alertModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setAlertModal({ show: false, title: "", message: "" })}
                className="bg-primary hover:bg-primary-hover text-white font-bold text-xs px-3.5 py-1.5 rounded-lg cursor-pointer transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
