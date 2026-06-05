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
import { getAdminDashboardData, AdminDashboardData, AdminStaffRow } from "../actions";
import { downloadAdminReportExcel } from "@/lib/admin-report-export";
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

export function AdminSummaryPanel({ initialData, onDataUpdate }: AdminSummaryPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const { staff: initialStaff, branchStats, totalStaff, reportedCount, missingCount } = data;

  const [selectedDate, setSelectedDate] = useState(data.date);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [selectedStaff, setSelectedStaff] = useState<AdminStaffRow | null>(null);
  const [staffSearch, setStaffSearch] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [printMounted, setPrintMounted] = useState(false);

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

  const reportRate = totalStaff > 0 ? Math.round((reportedCount / totalStaff) * 100) : 0;

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

  const handleExportExcel = async () => {
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
            <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate">{formatDateButtonLabel(selectedDate)}</span>
          </button>

          <AdminSelect
            value={branchFilter}
            onChange={setBranchFilter}
            options={[
              { value: "all", label: "Tất cả chi nhánh" },
              ...branchStats.map((b) => ({ value: b.branchId, label: b.branchName })),
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
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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
            <h3 className="text-xs font-bold text-slate-600 uppercase">Tỷ lệ báo cáo trong ngày</h3>
            <p className="text-[10px] text-slate-500 mt-1 mb-2 leading-relaxed">
              <span className="inline-block mr-2">
                Tổng nhân sự: <strong className="text-slate-800">{totalStaff}</strong>
              </span>
              <span className="inline-block mr-2">
                Đã báo cáo: <strong className="text-emerald-600">{reportedCount}</strong>
              </span>
              <span className="inline-block mr-2">
                Chưa báo cáo: <strong className="text-rose-500">{missingCount}</strong>
              </span>
              <span className="inline-block">
                Tỷ lệ hoàn thành: <strong className="text-primary">{reportRate}%</strong> ({reportedCount}/{totalStaff}) · {formatDateDisplay(selectedDate)}
              </span>
            </p>
            <div className="h-52">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v} người`, ""]} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-slate-400 text-xs text-center py-16">Chưa có dữ liệu</p>
              )}
            </div>
          </div>

          <div className="bg-slate-50/80 p-4 rounded-lg border border-slate-100">
            <h3 className="text-xs font-bold text-slate-600 uppercase">Báo cáo theo chi nhánh</h3>
            <p className="text-[10px] text-slate-500 mt-1 mb-2 leading-relaxed">
              Cột xếp chồng theo chi nhánh —{" "}
              <span className="inline-flex items-center gap-1 mr-2">
                <span className="w-2 h-2 rounded-sm bg-[#0f2d59]" aria-hidden />
                <strong className="text-slate-700">Đã báo cáo</strong>
              </span>
              <span className="inline-flex items-center gap-1 mr-2">
                <span className="w-2 h-2 rounded-sm bg-[#e2e8f0] border border-slate-300" aria-hidden />
                <strong className="text-slate-700">Chưa báo cáo</strong>
              </span>
              · Tổng <strong className="text-slate-800">{totalStaff}</strong> người, đã nộp{" "}
              <strong className="text-emerald-600">{reportedCount}</strong>, còn thiếu{" "}
              <strong className="text-rose-500">{missingCount}</strong> ({reportRate}%)
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="reported" name="Đã BC" stackId="a" fill={CHART_COLORS.barReported} />
                  <Bar dataKey="missing" name="Chưa BC" stackId="a" fill={CHART_COLORS.barMissing} radius={[4, 4, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-100 bg-white flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100 shrink-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0">
                Nhân sự <span className="text-slate-700">{displayedStaff.length}/{totalStaff}</span>
              </h3>
              <label className="flex flex-1 min-w-0 items-center gap-2 h-10 sm:h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 cursor-text touch-manipulation transition-colors has-[:focus-within]:ring-1 has-[:focus-within]:ring-primary/25">
                <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  placeholder="Tìm tên, chi nhánh..."
                  className="flex-1 min-w-0 p-0 border-0 bg-transparent text-[11px] sm:text-[11px] font-medium text-slate-800 placeholder:text-slate-400 placeholder:text-[10px] leading-none focus:outline-none"
                />
              </label>
            </div>
              <div className="overflow-x-auto overflow-y-hidden px-2 py-2 flex flex-nowrap gap-1.5 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]">
              {displayedStaff.length === 0 ? (
                <p className="text-slate-400 text-[11px] italic py-3 px-2 shrink-0">
                  {staffSearch.trim() ? "Không tìm thấy nhân sự" : "Không có nhân sự phù hợp"}
                </p>
              ) : (
                displayedStaff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStaff(s)}
                    className={`shrink-0 snap-start w-[8.25rem] sm:w-36 px-2 py-1.5 rounded-xl text-left flex items-center gap-1.5 cursor-pointer transition-all border touch-manipulation ${
                      selectedStaff?.id === s.id
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
                    }`}
                  >
                    <ReportStatusIndicator hasReport={s.hasReport} size="xs" />
                    <div className="min-w-0 flex-1 leading-tight">
                      <p className={`text-[11px] font-semibold truncate ${selectedStaff?.id === s.id ? "text-white" : "text-slate-800"}`}>
                        {s.full_name}
                      </p>
                      <p className={`text-[9px] truncate mt-px ${selectedStaff?.id === s.id ? "text-white/75" : "text-slate-400"}`}>
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
                    <p className="text-[10px] font-bold text-primary uppercase">Chi tiết báo cáo</p>
                    <h3 className="text-base font-bold text-slate-800 mt-1">{selectedStaff.full_name}</h3>
                    <p className="text-xs text-slate-500">
                      {selectedStaff.branch_name} · {selectedStaff.position || "—"} · {formatDateDisplay(selectedDate)}
                    </p>
                  </div>
                  <ReportStatusIndicator hasReport={selectedStaff.hasReport} size="md" />
                </div>
                {selectedStaff.hasReport ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedStaff.tasks.map((t, i) => (
                      <span key={i} className="bg-slate-50 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-lg">
                        {t}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm italic py-8 text-center">Chưa nộp báo cáo ngày này</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-slate-500 font-bold text-sm">Chọn nhân sự để xem báo cáo</p>
                <p className="text-slate-400 text-xs mt-1">Chọn thẻ nhân sự phía trên — {totalStaff} người trong hệ thống</p>
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
          document.body
        )}
    </>
  );
}
