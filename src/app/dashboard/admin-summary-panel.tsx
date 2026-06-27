"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AdminSummaryPrintDocument } from "./admin-summary-print-document";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  getAdminDashboardData,
  AdminDashboardData,
  AdminStaffRow,
  getReportDetail,
  saveDailyReport,
  getOrCreateProfileForStaff,
  DailyReport,
} from "../actions";
import { splitReportItems, TaskItem } from "@/lib/report-data";
import { downloadAdminReportExcel } from "@/lib/admin-report-export";
import { AdminExcelPreviewModal } from "./admin-excel-preview-modal";
import AdminSelect, { adminControlClass } from "./admin-select";
import DatePickerModal, { formatDateButtonLabel } from "./date-picker-modal";
import { ReportStatusIndicator } from "./report-status-indicator";
import { NavTabs } from "./nav-tabs";

const STATUS_TABS = [
  { value: "all", label: "Tất cả" },
  { value: "reported", label: "Đã BC" },
  { value: "missing", label: "Chưa BC" },
] as const;

const CHART_COLORS = {
  reported: "#10b981",
  missing: "#cbd5e1",
  barReported: "#0f2d59",
  barMissing: "#e2e8f0",
};

type AdminSummaryPanelProps = {
  initialData: AdminDashboardData;
  onDataUpdate?: (data: AdminDashboardData) => void;
};

export function AdminSummaryPanel({
  initialData,
  onDataUpdate,
}: AdminSummaryPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const {
    staff: initialStaff,
    branchStats,
    totalStaff,
    reportedCount,
    missingCount,
  } = data;

  const [selectedDate, setSelectedDate] = useState(data.date);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<AdminStaffRow | null>(
    null,
  );
  const [staffSearch, setStaffSearch] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [printMounted, setPrintMounted] = useState(false);
  const [showExcelPreview, setShowExcelPreview] = useState(false);

  // Report Form Modal states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [modalTargetStaff, setModalTargetStaff] = useState<AdminStaffRow | null>(null);
  const [modalInitialReport, setModalInitialReport] = useState<DailyReport | null>(null);
  const [modalTasks, setModalTasks] = useState<TaskItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [modalError, setModalError] = useState("");

  const handleAddReportClick = (staff: AdminStaffRow) => {
    setModalTargetStaff(staff);
    setModalInitialReport(null);
    setModalTasks([{ title: "", progress: "", status: "in_progress" }]);
    setModalError("");
    setReportModalOpen(true);
  };

  const handleEditReportClick = async (staff: AdminStaffRow) => {
    if (!staff.report_id) return;
    setModalTargetStaff(staff);
    setModalInitialReport(null);
    setModalTasks([]);
    setModalError("");
    setModalLoading(true);
    setReportModalOpen(true);

    try {
      const report = await getReportDetail(staff.report_id);
      if (!report) {
        throw new Error("Không thể tải chi tiết báo cáo");
      }
      setModalInitialReport(report);
      const extractedTasks = splitReportItems(report.tasks_data).tasks;
      setModalTasks(
        extractedTasks.length > 0
          ? extractedTasks
          : [{ title: "", progress: "", status: "in_progress" }]
      );
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Không thể tải báo cáo");
    } finally {
      setModalLoading(false);
    }
  };

  const handleSaveReportModal = async () => {
    if (!modalTargetStaff) return;
    const validTasks = modalTasks
      .filter((t) => t.title.trim())
      .map((t) => ({
        title: t.title.trim(),
        progress: "",
        status: "in_progress" as const,
      }));

    if (validTasks.length === 0) {
      setModalError("Vui lòng thêm ít nhất một đầu việc.");
      return;
    }

    setSubmittingReport(true);
    setModalError("");

    try {
      // 1. Get or create profile for target staff
      let targetUserId = "";
      if (modalInitialReport) {
        targetUserId = modalInitialReport.user_id;
      } else {
        const provisionResult = await getOrCreateProfileForStaff(modalTargetStaff.id);
        if ("error" in provisionResult || !provisionResult.profileId) {
          throw new Error(provisionResult.error || "Không thể khởi tạo hồ sơ cho nhân viên");
        }
        targetUserId = provisionResult.profileId;
      }

      // 2. Save report
      const res = await saveDailyReport({
        id: modalInitialReport?.id,
        date: selectedDate,
        tasksData: validTasks,
        status: "submitted",
        userId: targetUserId,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      // 3. Reload admin dashboard data for selectedDate so it refreshes the UI!
      const updatedData = await getAdminDashboardData(selectedDate);
      if (!("error" in updatedData)) {
        setData(updatedData);
        onDataUpdate?.(updatedData);

        const newSelectedStaff = updatedData.staff.find((s) => s.id === modalTargetStaff.id);
        if (newSelectedStaff) {
          setSelectedStaff(newSelectedStaff);
        }
      }

      setReportModalOpen(false);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setSubmittingReport(false);
    }
  };

  useEffect(() => {
    setPrintMounted(true);
  }, []);

  useEffect(() => {
    setData(initialData);
    setSelectedDate(initialData.date);
  }, [initialData]);

  const formatDateDisplay = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const reportRate =
    totalStaff > 0 ? Math.round((reportedCount / totalStaff) * 100) : 0;

  const pieData = [
    { name: "Đã báo cáo", value: reportedCount, color: CHART_COLORS.reported },
    { name: "Chưa báo cáo", value: missingCount, color: CHART_COLORS.missing },
  ].filter((d) => d.value > 0);

  const barData = branchStats.map((b) => ({
    name: b.branchName.replace("Chi nhánh ", "").replace("CN ", ""),
    reported: b.reported,
    missing: b.total - b.reported,
    total: b.total,
  }));

  const filteredStaff = useMemo(() => {
    return initialStaff.filter((s) => {
      if (branchFilter !== "all" && s.branch_id !== branchFilter) return false;
      if (statusFilter === "reported") return s.hasReport;
      if (statusFilter === "missing") return !s.hasReport;
      return true;
    });
  }, [initialStaff, branchFilter, statusFilter]);

  const displayedStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    if (!q) return filteredStaff;
    return filteredStaff.filter((s) => {
      const haystack = [s.full_name, s.branch_name, s.position, s.department]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filteredStaff, staffSearch]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedStaff(null);
    startTransition(async () => {
      const result = await getAdminDashboardData(newDate);
      if (!("error" in result)) {
        setData(result);
        onDataUpdate?.(result);
      }
    });
  };

  const handleExportExcel = () => {
    setShowExcelPreview(true);
  };

  const handleConfirmExportExcel = async () => {
    setShowExcelPreview(false);
    try {
      await downloadAdminReportExcel(`Bao_cao_Hatico_${selectedDate}.xlsx`, {
        selectedDate,
        totalStaff,
        reportedCount,
        missingCount,
        reportRate,
        staff: initialStaff,
        branchFilter,
      });
    } catch {
      window.alert("Không xuất được Excel. Vui lòng thử lại.");
    }
  };

  return (
    <>
      <div
        className={`no-print flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_8px_32px_rgba(15,45,89,0.08)] transition-opacity duration-200 ${
          isPending ? "opacity-70 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="border-b border-slate-100 px-3 py-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className={`${adminControlClass} flex items-center justify-center gap-2 cursor-pointer`}
            >
              <svg
                className="w-4 h-4 text-primary shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="truncate">
                {formatDateButtonLabel(selectedDate)}
              </span>
            </button>

            <AdminSelect
              value={branchFilter}
              onChange={setBranchFilter}
              options={[
                { value: "all", label: "Tất cả chi nhánh" },
                ...branchStats.map((b) => ({
                  value: b.branchId,
                  label: b.branchName,
                })),
              ]}
            />

            <NavTabs
              className="sm:col-span-2"
              ariaLabel="Lọc trạng thái báo cáo"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_TABS}
            />

            <div className="sm:col-span-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isPending}
                className="h-10 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-sm cursor-pointer touch-manipulation transition-colors disabled:opacity-60"
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
                <span>Xuất Excel</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="h-10 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary-hover border border-primary shadow-sm cursor-pointer touch-manipulation transition-colors"
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
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>In PDF</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase">
                Tỷ lệ báo cáo trong ngày
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 mb-2 leading-relaxed">
                <span className="inline-block mr-2">
                  Tổng nhân sự:{" "}
                  <strong className="text-slate-800">{totalStaff}</strong>
                </span>
                <span className="inline-block mr-2">
                  Đã báo cáo:{" "}
                  <strong className="text-emerald-600">{reportedCount}</strong>
                </span>
                <span className="inline-block mr-2">
                  Chưa báo cáo:{" "}
                  <strong className="text-rose-500">{missingCount}</strong>
                </span>
                <span className="inline-block">
                  Tỷ lệ hoàn thành:{" "}
                  <strong className="text-primary">{reportRate}%</strong> (
                  {reportedCount}/{totalStaff}) ·{" "}
                  {formatDateDisplay(selectedDate)}
                </span>
              </p>
              <div className="h-52">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} người`, ""]} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-slate-400 text-xs text-center py-16">
                    Chưa có dữ liệu
                  </p>
                )}
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-100">
              <h3 className="text-xs font-bold text-slate-600 uppercase">
                Báo cáo theo chi nhánh
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 mb-2 leading-relaxed">
                Cột xếp chồng theo chi nhánh —{" "}
                <span className="inline-flex items-center gap-1 mr-2">
                  <span
                    className="w-2 h-2 rounded-sm bg-[#0f2d59]"
                    aria-hidden
                  />
                  <strong className="text-slate-700">Đã báo cáo</strong>
                </span>
                <span className="inline-flex items-center gap-1 mr-2">
                  <span
                    className="w-2 h-2 rounded-sm bg-[#e2e8f0] border border-slate-300"
                    aria-hidden
                  />
                  <strong className="text-slate-700">Chưa báo cáo</strong>
                </span>
                · Tổng <strong className="text-slate-800">{totalStaff}</strong>{" "}
                người, đã nộp{" "}
                <strong className="text-emerald-600">{reportedCount}</strong>,
                còn thiếu{" "}
                <strong className="text-rose-500">{missingCount}</strong> (
                {reportRate}%)
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar
                      dataKey="reported"
                      name="Đã BC"
                      stackId="a"
                      fill={CHART_COLORS.barReported}
                    />
                    <Bar
                      dataKey="missing"
                      name="Chưa BC"
                      stackId="a"
                      fill={CHART_COLORS.barMissing}
                      radius={[4, 4, 0, 0]}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:grid md:grid-cols-[280px_1fr] gap-4 md:items-start">
            <div className="rounded-lg border border-slate-100 bg-white flex flex-col overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 shrink-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 md:flex-col md:items-stretch md:gap-1.5">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
                  Nhân sự{" "}
                  <span className="text-slate-700">
                    {displayedStaff.length}/{totalStaff}
                  </span>
                </h3>
                <label className="flex flex-1 min-w-0 items-center gap-2 h-11 px-3 rounded-[8px] bg-slate-50 hover:bg-slate-100 border border-slate-200/80 cursor-text touch-manipulation transition-colors has-[:focus-within]:ring-1 has-[:focus-within]:ring-primary/25">
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="search"
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    placeholder="Tìm tên, chi nhánh..."
                    className="flex-1 min-w-0 h-8 p-0 border-0 bg-transparent text-[11px] sm:text-[11px] font-medium text-slate-800 placeholder:text-slate-400 placeholder:text-[10px] leading-none focus:outline-none"
                  />
                </label>
              </div>
              <div className="overflow-x-auto overflow-y-hidden px-2 py-2 flex flex-nowrap gap-1.5 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch] md:overflow-x-hidden md:overflow-y-auto md:flex-col md:max-h-[380px] md:snap-none">
                {displayedStaff.length === 0 ? (
                  <p className="text-slate-400 text-[11px] italic py-3 px-2 shrink-0">
                    {staffSearch.trim()
                      ? "Không tìm thấy nhân sự"
                      : "Không có nhân sự phù hợp"}
                  </p>
                ) : (
                  displayedStaff.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStaff(s)}
                      className={`shrink-0 snap-start w-[8.25rem] sm:w-36 md:w-full px-2 py-1.5 rounded-xl text-left flex items-center gap-1.5 cursor-pointer transition-all border touch-manipulation ${
                        selectedStaff?.id === s.id
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
                      }`}
                    >
                      <ReportStatusIndicator
                        hasReport={s.hasReport}
                        size="xs"
                      />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p
                          className={`text-[11px] font-semibold truncate ${selectedStaff?.id === s.id ? "text-white" : "text-slate-800"}`}
                        >
                          {s.full_name}
                        </p>
                        <p
                          className={`text-[9px] truncate mt-px ${selectedStaff?.id === s.id ? "text-white/75" : "text-slate-400"}`}
                        >
                          {s.branch_name}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 bg-white p-4 min-h-[200px]">
              {selectedStaff ? (
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b border-slate-50 pb-3">
                    <div>
                      <p className="text-[10px] font-bold text-primary uppercase">
                        Chi tiết báo cáo
                      </p>
                      <h3 className="text-base font-bold text-slate-800 mt-1">
                        {selectedStaff.full_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {selectedStaff.branch_name} ·{" "}
                        {selectedStaff.position || "—"} ·{" "}
                        {formatDateDisplay(selectedDate)}
                      </p>
                    </div>
                    <ReportStatusIndicator
                      hasReport={selectedStaff.hasReport}
                      size="md"
                    />
                  </div>
                  {selectedStaff.hasReport ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1.5">
                        {selectedStaff.tasks && selectedStaff.tasks.length > 0 ? (
                          selectedStaff.tasks.map((t, i) => (
                            <span
                              key={i}
                              className="bg-slate-50 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg"
                            >
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-xs italic px-1">
                            (Chưa có nội dung báo cáo)
                          </span>
                        )}
                      </div>
                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => handleEditReportClick(selectedStaff)}
                          className="bg-primary text-white hover:bg-primary-hover font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                        >
                          Cập nhật báo cáo
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-slate-500 text-sm font-semibold py-4 text-center">
                        {selectedStaff.absence_reason
                          ? `Nghỉ phép: ${selectedStaff.absence_reason}`
                          : "Chưa nộp báo cáo ngày này"}
                      </p>
                      <div className="pt-3 border-t border-slate-100 flex justify-center">
                        <button
                          onClick={() => handleAddReportClick(selectedStaff)}
                          className="bg-primary text-white hover:bg-primary-hover font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
                        >
                          Thêm báo cáo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-slate-500 font-bold text-sm">
                    Chọn nhân sự để xem báo cáo
                  </p>
                  <p className="text-slate-400 text-xs mt-1">
                    Chọn thẻ nhân sự phía trên — {totalStaff} người trong hệ
                    thống
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DatePickerModal
          open={showDatePicker}
          value={selectedDate}
          onClose={() => setShowDatePicker(false)}
          onSelect={handleDateChange}
          title="Chọn ngày xem báo cáo"
        />

        <AdminExcelPreviewModal
          open={showExcelPreview}
          onClose={() => setShowExcelPreview(false)}
          onConfirm={handleConfirmExportExcel}
          selectedDate={selectedDate}
          totalStaff={totalStaff}
          reportedCount={reportedCount}
          missingCount={missingCount}
          reportRate={reportRate}
          staff={initialStaff}
          branchFilter={branchFilter}
        />

        {reportModalOpen && modalTargetStaff && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print animate-fade-in">
            <div className="bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl rounded-2xl p-5 max-w-lg w-full flex flex-col max-h-[85vh] animate-slide-in">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {modalInitialReport ? "Cập nhật báo cáo" : "Thêm báo cáo mới"}
                  </h3>
                  <p className="text-slate-500 text-[10px] mt-0.5 font-medium">
                    Nhân sự: <strong className="text-slate-800">{modalTargetStaff.full_name}</strong> · {modalTargetStaff.branch_name} · {formatDateDisplay(selectedDate)}
                  </p>
                </div>
                <button
                  onClick={() => setReportModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Body */}
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3 flex-1">
                  <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-xs text-slate-500 font-medium">Đang tải chi tiết báo cáo...</span>
                </div>
              ) : (
                <div className="flex-grow overflow-y-auto py-4 space-y-4 min-h-0 pr-0.5 no-scrollbar">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Danh sách đầu việc</label>
                      <p className="text-[9px] text-slate-400">Nhấn Enter tại dòng cuối để thêm dòng mới</p>
                    </div>
                    
                    <div className="space-y-2">
                      {modalTasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-lg"
                        >
                          <span className="text-[10px] text-slate-500 font-bold w-4 shrink-0 text-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="Nhập đầu việc..."
                            value={task.title}
                            onChange={(e) => {
                              const updated = [...modalTasks];
                              updated[idx] = { ...updated[idx], title: e.target.value };
                              setModalTasks(updated);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const trimmed = task.title.trim();
                                if (!trimmed) return;
                                if (idx === modalTasks.length - 1) {
                                  setModalTasks([...modalTasks, { title: "", progress: "", status: "in_progress" }]);
                                }
                              }
                            }}
                            className="flex-1 bg-transparent text-slate-900 text-xs sm:text-xs focus:outline-none placeholder:text-slate-400 min-w-0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (modalTasks.length === 1) {
                                setModalTasks([{ title: "", progress: "", status: "in_progress" }]);
                                return;
                              }
                              setModalTasks(modalTasks.filter((_, i) => i !== idx));
                            }}
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
                      onClick={() => setModalTasks([...modalTasks, { title: "", progress: "", status: "in_progress" }])}
                      className="text-primary hover:text-primary-hover font-bold transition-colors flex items-center gap-1.5 cursor-pointer py-1.5 text-xs"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Thêm đầu việc
                    </button>
                  </div>
                  
                  {modalError && (
                    <div className="bg-red-50 text-red-700 p-2.5 rounded-lg text-xs font-semibold border border-red-200">
                      {modalError}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              {!modalLoading && (
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReportModal}
                    disabled={submittingReport}
                    className="bg-primary text-white hover:bg-primary-hover disabled:bg-slate-200 disabled:text-slate-400 font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                  >
                    {submittingReport ? "Đang lưu..." : "Lưu báo cáo"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {printMounted &&
        createPortal(
          <AdminSummaryPrintDocument
            selectedDate={selectedDate}
            totalStaff={totalStaff}
            reportedCount={reportedCount}
            missingCount={missingCount}
            reportRate={reportRate}
            staff={initialStaff}
            branchFilter={branchFilter}
          />,
          document.body,
        )}
    </>
  );
}
