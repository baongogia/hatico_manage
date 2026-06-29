"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  getAdminDashboardData,
  getAdminMonthlyAttendance,
  AdminDashboardData,
  AdminMonthlyAttendanceData,
  AdminStaffRow,
  MonthlyAttendanceStaffRow,
  markStaffPresent,
  markStaffAbsent,
  StaffAttendanceUpdate,
} from "../actions";
import {
  applyMonthlyAttendanceUpdate,
  applyStaffAttendanceUpdate,
  attendanceCellKey,
} from "@/lib/admin-dashboard-utils";
import { downloadAdminAttendanceExcel, downloadDailyAttendanceExcel } from "@/lib/attendance-export";
import DatePickerModal, { formatDateButtonLabel } from "./date-picker-modal";
import AdminSelect, { adminControlClass } from "./admin-select";
import { DailyAttendancePreviewModal, MonthlyAttendancePreviewModal } from "./attendance-preview-modal";

type AdminAttendancePanelProps = {
  initialData: AdminDashboardData;
  onDataUpdate?: (data: AdminDashboardData) => void;
};

export function AdminAttendancePanel({
  initialData,
  onDataUpdate,
}: AdminAttendancePanelProps) {
  const [isPending, startTransition] = useTransition();
  const [dailyData, setDailyData] = useState(initialData);
  const [selectedDate, setSelectedDate] = useState(initialData.date);

  const [subTab, setSubTab] = useState<"daily" | "monthly">("daily");

  // Monthly Attendance State
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [monthlyData, setMonthlyData] = useState<AdminMonthlyAttendanceData | null>(null);
  const [loadingMonthly, startLoadingMonthly] = useTransition();
  const [errorMonthly, setErrorMonthly] = useState("");

  // Toggling state (supports parallel updates)
  const [togglingCells, setTogglingCells] = useState<Set<string>>(() => new Set());

  const addToggling = useCallback((staffId: number, dateStr: string) => {
    const key = attendanceCellKey(staffId, dateStr);
    setTogglingCells((prev) => new Set(prev).add(key));
  }, []);

  const removeToggling = useCallback((staffId: number, dateStr: string) => {
    const key = attendanceCellKey(staffId, dateStr);
    setTogglingCells((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isCellToggling = useCallback(
    (staffId: number, dateStr: string) => togglingCells.has(attendanceCellKey(staffId, dateStr)),
    [togglingCells],
  );

  const commitStaffUpdate = useCallback(
    (update: StaffAttendanceUpdate, dateStr: string) => {
      if (dateStr === selectedDate) {
        setDailyData((prev) => {
          const next = applyStaffAttendanceUpdate(prev, update);
          onDataUpdate?.(next);
          return next;
        });
      }
      setMonthlyData((prev) =>
        prev ? applyMonthlyAttendanceUpdate(prev, update, dateStr) : prev,
      );
    },
    [selectedDate, onDataUpdate],
  );

  // Inline editing of reasons
  const [editingStaffId, setEditingStaffId] = useState<number | null>(null);
  const [editingReasonText, setEditingReasonText] = useState("");

  // Reason Modal State
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [reasonModalData, setReasonModalData] = useState<{
    staffId: number;
    staffName: string;
    dateStr: string;
    currentHasReport: boolean;
    currentReason?: string;
  } | null>(null);
  const [absenceReasonInput, setAbsenceReasonInput] = useState("");

  // Excel Preview Modals State
  const [showDailyPreview, setShowDailyPreview] = useState(false);
  const [showMonthlyPreview, setShowMonthlyPreview] = useState(false);

  // Filters and Search
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all, present, absent
  const [searchQuery, setSearchQuery] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Fetch monthly data
  const fetchMonthlyData = (monthStr: string) => {
    setErrorMonthly("");
    startLoadingMonthly(async () => {
      try {
        const result = await getAdminMonthlyAttendance(monthStr);
        if ("error" in result) {
          setErrorMonthly(result.error || "Không thể tải dữ liệu điểm danh tháng");
        } else {
          setMonthlyData(result);
        }
      } catch {
        setErrorMonthly("Có lỗi xảy ra khi tải dữ liệu");
      }
    });
  };

  useEffect(() => {
    if (subTab === "monthly") {
      fetchMonthlyData(selectedMonth);
    }
  }, [selectedMonth, subTab]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    startTransition(async () => {
      const result = await getAdminDashboardData(newDate);
      if (!("error" in result)) {
        setDailyData(result);
        onDataUpdate?.(result);
      }
    });
  };

  // Toggle present/absent click handlers
  const handleDailyToggleClick = async (row: AdminStaffRow, markAbsent: boolean) => {
    if (markAbsent) {
      setAbsenceReasonInput(row.absence_reason || "");
      setReasonModalData({
        staffId: row.id,
        staffName: row.full_name,
        dateStr: selectedDate,
        currentHasReport: false,
        currentReason: row.absence_reason,
      });
      setReasonModalOpen(true);
    } else {
      addToggling(row.id, selectedDate);

      const originalDailyData = dailyData;
      const now = new Date();
      const checkInTimeStr = now.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      });

      setDailyData((prev) => ({
        ...prev,
        staff: prev.staff.map((s) =>
          s.id === row.id
            ? { ...s, hasReport: true, absence_reason: undefined, check_in_time: checkInTimeStr }
            : s
        ),
      }));

      try {
        const res = await markStaffPresent(row.id, selectedDate, row.profile_id);
        if ("error" in res) {
          setDailyData(originalDailyData);
          window.alert(res.error);
        } else if (res.staffUpdate) {
          commitStaffUpdate(res.staffUpdate, selectedDate);
        }
      } catch {
        setDailyData(originalDailyData);
        window.alert("Có lỗi xảy ra, vui lòng thử lại.");
      } finally {
        removeToggling(row.id, selectedDate);
      }
    }
  };

  // Inline reason editing handlers
  const startEditingReason = (row: AdminStaffRow) => {
    if (row.hasReport) return;
    setEditingStaffId(row.id);
    setEditingReasonText(row.absence_reason || "");
  };

  const handleSaveInlineReason = async (staffId: number) => {
    setEditingStaffId(null);
    addToggling(staffId, selectedDate);

    const originalDailyData = dailyData;
    const row = dailyData.staff.find((s) => s.id === staffId);
    const trimmedReason = editingReasonText.trim();

    setDailyData((prev) => ({
      ...prev,
      staff: prev.staff.map((s) =>
        s.id === staffId
          ? {
              ...s,
              hasReport: false,
              absence_reason: trimmedReason || undefined,
              check_in_time: undefined,
            }
          : s
      ),
    }));

    try {
      const res = await markStaffAbsent(staffId, selectedDate, editingReasonText, row?.profile_id);
      if ("error" in res) {
        setDailyData(originalDailyData);
        window.alert(res.error);
      } else if (res.staffUpdate) {
        commitStaffUpdate(res.staffUpdate, selectedDate);
      }
    } catch {
      setDailyData(originalDailyData);
      window.alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      removeToggling(staffId, selectedDate);
    }
  };

  const handleCancelInlineReason = () => {
    setEditingStaffId(null);
  };

  const handleMonthlyCellClick = (row: MonthlyAttendanceStaffRow, dateStr: string, att: any) => {
    const isPresent = !!att?.hasReport;
    setAbsenceReasonInput(att?.absenceReason || "");
    setReasonModalData({
      staffId: row.id,
      staffName: row.full_name,
      dateStr,
      currentHasReport: isPresent,
      currentReason: att?.absenceReason,
    });
    setReasonModalOpen(true);
  };

  const handleSaveAttendanceModal = async () => {
    if (!reasonModalData) return;
    const { staffId, dateStr, currentHasReport } = reasonModalData;
    const staffRow = dailyData.staff.find((s) => s.id === staffId);
    setReasonModalOpen(false);
    addToggling(staffId, dateStr);

    const originalDailyData = dailyData;
    const originalMonthlyData = monthlyData;

    const now = new Date();
    const checkInTimeStr = now.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

    const optimisticUpdate: StaffAttendanceUpdate = currentHasReport
      ? {
          staffId,
          hasReport: true,
          tasks: [],
          check_in_time: checkInTimeStr,
          absence_reason: undefined,
          profile_id: staffRow?.profile_id,
        }
      : {
          staffId,
          hasReport: false,
          tasks: [],
          check_in_time: undefined,
          absence_reason: absenceReasonInput.trim() || undefined,
          profile_id: staffRow?.profile_id,
        };

    if (dateStr === selectedDate) {
      setDailyData((prev) => applyStaffAttendanceUpdate(prev, optimisticUpdate));
    }
    if (monthlyData) {
      setMonthlyData((prev) =>
        prev ? applyMonthlyAttendanceUpdate(prev, optimisticUpdate, dateStr) : prev,
      );
    }

    try {
      const res = currentHasReport
        ? await markStaffPresent(staffId, dateStr, staffRow?.profile_id)
        : await markStaffAbsent(staffId, dateStr, absenceReasonInput, staffRow?.profile_id);

      if ("error" in res) {
        setDailyData(originalDailyData);
        setMonthlyData(originalMonthlyData);
        window.alert(res.error);
        return;
      }

      if (res.staffUpdate) {
        commitStaffUpdate(res.staffUpdate, dateStr);
      }
    } catch {
      setDailyData(originalDailyData);
      setMonthlyData(originalMonthlyData);
      window.alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      removeToggling(staffId, dateStr);
    }
  };

  // Filter daily staff list
  const filteredDailyStaff = useMemo(() => {
    return dailyData.staff.filter((s) => {
      if (branchFilter !== "all" && s.branch_id !== branchFilter) return false;
      if (statusFilter === "present" && !s.hasReport) return false;
      if (statusFilter === "absent" && s.hasReport) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [s.full_name, s.branch_name, s.position, s.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [dailyData.staff, branchFilter, statusFilter, searchQuery]);

  // Filter monthly staff list
  const filteredMonthlyStaff = useMemo(() => {
    if (!monthlyData) return [];
    return monthlyData.staff.filter((s) => {
      if (branchFilter !== "all" && s.branch_id !== branchFilter) return false;
      
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const haystack = [s.full_name, s.branch_name, s.position, s.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      }
      return true;
    });
  }, [monthlyData, branchFilter, searchQuery]);

  // Present/Absent counts for current daily data
  const { dailyPresentCount, dailyAbsentCount } = useMemo(() => {
    const present = dailyData.staff.filter(s => s.hasReport).length;
    return {
      dailyPresentCount: present,
      dailyAbsentCount: dailyData.staff.length - present
    };
  }, [dailyData.staff]);

  // Excel Downloads after preview confirm
  const handleConfirmExportMonthlyExcel = async () => {
    if (!monthlyData) return;
    setShowMonthlyPreview(false);
    try {
      const filename = `Bang_cong_diem_danh_${selectedMonth}.xlsx`;
      await downloadAdminAttendanceExcel(filename, {
        month: selectedMonth,
        staff: monthlyData.staff,
        branchFilter,
      });
    } catch {
      window.alert("Không xuất được Excel. Vui lòng thử lại.");
    }
  };

  const handleConfirmExportDailyExcel = async () => {
    setShowDailyPreview(false);
    try {
      const filename = `Diem_danh_ngay_${selectedDate}.xlsx`;
      await downloadDailyAttendanceExcel(filename, {
        date: selectedDate,
        staff: dailyData.staff,
        branchFilter,
      });
    } catch {
      window.alert("Không xuất được Excel. Vui lòng thử lại.");
    }
  };

  const getDaysInMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-").map(Number);
    return new Date(year, month, 0).getDate();
  };

  const daysInSelectedMonth = useMemo(() => {
    return getDaysInMonth(selectedMonth);
  }, [selectedMonth]);

  const getDayOfWeekLabel = (day: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return {
      label: dayNames[date.getDay()],
      isWeekend: date.getDay() === 0 || date.getDay() === 6
    };
  };

  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `Tháng ${month}/${year}`;
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_8px_32px_rgba(15,45,89,0.08)]">
      {/* Tab bar and header controls */}
      <div className="border-b border-slate-100 px-4 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/40">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl self-start">
          <button
            onClick={() => setSubTab("daily")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "daily"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Điểm danh ngày
          </button>
          <button
            onClick={() => setSubTab("monthly")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subTab === "monthly"
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Bảng công tháng
          </button>
        </div>

        {/* Global / Shared Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {subTab === "daily" ? (
            <>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className={`${adminControlClass} flex items-center justify-center gap-2 cursor-pointer h-10`}
              >
                <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="truncate">{formatDateButtonLabel(selectedDate)}</span>
              </button>

              <button
                onClick={() => setShowDailyPreview(true)}
                className="h-10 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-sm cursor-pointer px-4 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Xuất Excel</span>
              </button>
              
              <AdminSelect
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-36"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "present", label: "Đi làm" },
                  { value: "absent", label: "Vắng" },
                ]}
              />
            </>
          ) : (
            <>
              {/* Month Picker */}
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                  className={`${adminControlClass} h-10 px-3 pr-8 w-44 font-semibold focus:ring-primary/25 cursor-pointer`}
                />
              </div>

              {monthlyData && (
                <button
                  onClick={() => setShowMonthlyPreview(true)}
                  className="h-10 flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 shadow-sm cursor-pointer px-4 transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Xuất bảng công</span>
                </button>
              )}
            </>
          )}

          <AdminSelect
            value={branchFilter}
            onChange={setBranchFilter}
            className="w-44"
            options={[
              { value: "all", label: "Tất cả chi nhánh" },
              ...dailyData.branchStats.map((b) => ({
                value: b.branchId,
                label: b.branchName,
              })),
            ]}
          />

          {/* Search bar */}
          <div className="relative w-48 sm:w-56">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              placeholder="Tìm tên nhân viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200/80 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/25 transition-all text-xs font-semibold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50">
        {subTab === "daily" ? (
          <div className="p-4 space-y-4">
            {/* Daily Stat Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng nhân sự</p>
                  <p className="text-xl font-black text-slate-800 mt-0.5">{dailyData.staff.length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đi làm</p>
                  <p className="text-xl font-black text-emerald-600 mt-0.5">{dailyPresentCount}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vắng</p>
                  <p className="text-xl font-black text-rose-500 mt-0.5">{dailyAbsentCount}</p>
                </div>
              </div>
            </div>

            {/* Daily Table list */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      <th className="px-4 py-3">Nhân viên</th>
                      <th className="px-4 py-3">Chi nhánh</th>
                      <th className="px-4 py-3">Bộ phận / Chức vụ</th>
                      <th className="px-4 py-3 text-center">Giờ điểm danh</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                      <th className="px-4 py-3">Lý do vắng</th>
                      <th className="px-4 py-3 text-center w-28">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isPending ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-slate-400 font-medium">Đang tải danh sách...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredDailyStaff.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 italic font-medium">
                          Không tìm thấy nhân sự phù hợp
                        </td>
                      </tr>
                    ) : (
                      filteredDailyStaff.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold text-[11px] uppercase border border-slate-200">
                              {row.full_name.split(" ").pop()?.substring(0, 2)}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">{row.full_name}</p>
                              <p className="text-[10px] text-slate-400">ID: {row.id}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-semibold">{row.branch_name}</td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800">{row.department || "—"}</p>
                            <p className="text-[10px] text-slate-400 font-medium">{row.position || "—"}</p>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600 font-bold">
                            {row.check_in_time ? (
                              <span className="bg-slate-100 border border-slate-200 px-2 py-1 rounded text-[11px]">
                                {row.check_in_time}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {row.hasReport ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Đi làm
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-50 text-slate-400 border border-slate-100">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                Vắng
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {row.hasReport ? (
                              <span className="text-slate-300">—</span>
                            ) : editingStaffId === row.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={editingReasonText}
                                onChange={(e) => setEditingReasonText(e.target.value)}
                                onBlur={() => handleSaveInlineReason(row.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleSaveInlineReason(row.id);
                                  } else if (e.key === "Escape") {
                                    handleCancelInlineReason();
                                  }
                                }}
                                placeholder="Nhập lý do..."
                                className="w-full bg-transparent border-0 border-b-0 outline-none p-0 focus:ring-0 text-[11px] font-bold text-amber-600 focus:outline-none focus:border-0 placeholder:italic placeholder:font-normal placeholder:text-slate-400"
                              />
                            ) : row.absence_reason ? (
                              <button
                                onClick={() => startEditingReason(row)}
                                className="text-amber-600 bg-amber-50 px-2 py-1 rounded text-[11px] border border-amber-100 font-bold hover:bg-amber-100/60 transition-colors cursor-pointer text-left w-full block"
                              >
                                {row.absence_reason}
                              </button>
                            ) : (
                              <button
                                onClick={() => startEditingReason(row)}
                                className="text-slate-400 italic font-medium hover:text-slate-600 transition-colors cursor-pointer text-left w-full block"
                              >
                                Không phép / Chưa báo cáo
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {isCellToggling(row.id, selectedDate) ? (
                              <span className="inline-flex items-center justify-center">
                                <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              </span>
                            ) : row.hasReport ? (
                              <button
                                onClick={() => handleDailyToggleClick(row, true)}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 transition-colors cursor-pointer"
                              >
                                Vắng
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDailyToggleClick(row, false)}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors cursor-pointer"
                              >
                                Đi làm
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4 flex flex-col h-full min-h-0">
            {errorMonthly && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-semibold">
                {errorMonthly}
              </div>
            )}

            {loadingMonthly && !monthlyData ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-3">
                <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-xs text-slate-500 font-medium">Đang kết xuất dữ liệu bảng công...</span>
              </div>
            ) : monthlyData ? (
              <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm flex flex-col min-h-0 flex-1">
                {/* Stats Summary inside the table wrapper */}
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Bảng công tháng {formatMonthLabel(selectedMonth)} (Tổng số: {filteredMonthlyStaff.length} người)
                  </span>
                  <span className="text-[10px] text-slate-400 italic">
                    Ký hiệu: <strong className="text-emerald-600 bg-emerald-50 px-1 border border-emerald-200 rounded">x</strong> = Đi làm · <strong className="text-amber-600 bg-amber-50 px-1 border border-amber-200 rounded">P</strong> = Nghỉ phép · <strong className="text-slate-400 bg-slate-100 px-1 border border-slate-200 rounded">•</strong> = Vắng (Bấm ô để chỉnh sửa)
                  </span>
                </div>

                {/* Timesheet Grid */}
                <div className="overflow-auto flex-1 no-scrollbar">
                  <table className="w-full border-collapse text-left text-xs whitespace-nowrap table-fixed">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                        <th className="px-3 py-3 w-48 sticky left-0 bg-slate-50 z-20 border-r border-slate-100">Nhân viên</th>
                        <th className="px-3 py-3 w-28 text-center">Chi nhánh</th>
                        <th className="px-3 py-3 w-28 text-center">Bộ phận</th>
                        {/* Day headers */}
                        {Array.from({ length: daysInSelectedMonth }).map((_, i) => {
                          const day = i + 1;
                          const { label, isWeekend } = getDayOfWeekLabel(day);
                          return (
                            <th
                              key={day}
                              className={`px-1 py-1 text-center w-8 border-r border-slate-100 leading-tight ${
                                isWeekend ? "bg-amber-50/70 text-amber-700" : ""
                              }`}
                            >
                              <div>{day}</div>
                              <div className="text-[8px] font-medium opacity-75">{label}</div>
                            </th>
                          );
                        })}
                        <th className="px-3 py-3 w-20 text-center sticky right-0 bg-slate-50 z-20 border-l border-slate-100">Số công</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMonthlyStaff.length === 0 ? (
                        <tr>
                          <td colSpan={4 + daysInSelectedMonth} className="text-center py-10 text-slate-400 italic">
                            Không tìm thấy nhân sự phù hợp
                          </td>
                        </tr>
                      ) : (
                        filteredMonthlyStaff.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-50/30 transition-colors">
                            {/* Staff info sticky column */}
                            <td className="px-3 py-2.5 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-100 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold text-[9px] uppercase border border-slate-200/50 shrink-0">
                                {row.full_name.split(" ").pop()?.substring(0, 2)}
                              </span>
                              <div className="truncate">
                                <p className="font-semibold text-slate-800 text-[11px] truncate">{row.full_name}</p>
                                <p className="text-[9px] text-slate-400 font-medium truncate">{row.position || "—"}</p>
                              </div>
                            </td>

                            <td className="px-3 py-2.5 text-center text-slate-500 font-medium truncate">{row.branch_name}</td>
                            <td className="px-3 py-2.5 text-center text-slate-500 font-medium truncate">{row.department || "—"}</td>

                            {/* Calendar columns */}
                            {Array.from({ length: daysInSelectedMonth }).map((_, i) => {
                              const day = i + 1;
                              const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                              const att = row.attendanceMap[dateStr];
                              const { isWeekend } = getDayOfWeekLabel(day);
                              const isCellTogglingMonthly = isCellToggling(row.id, dateStr);

                              return (
                                <td
                                  key={day}
                                  onClick={() => !isCellTogglingMonthly && handleMonthlyCellClick(row, dateStr, att)}
                                  title={
                                    att?.hasReport
                                      ? `${row.full_name} đi làm lúc ${att.checkInTime || "—"}. Click để chỉnh sửa.`
                                      : att?.absenceReason
                                        ? `${row.full_name} vắng (Nghỉ phép): ${att.absenceReason}. Click để chỉnh sửa.`
                                        : `${row.full_name} vắng không phép. Click để chỉnh sửa.`
                                  }
                                  className={`px-1 py-1 text-center border-r border-slate-100 text-[10px] font-bold cursor-pointer transition-all hover:bg-primary/5 select-none ${
                                    isWeekend ? "bg-amber-50/20" : ""
                                  } ${att?.hasReport ? "bg-emerald-50/50 hover:bg-emerald-100/60" : ""} ${
                                    !att?.hasReport && att?.absenceReason ? "bg-amber-50/70 hover:bg-amber-100/80" : ""
                                  }`}
                                >
                                  {isCellTogglingMonthly ? (
                                    <span className="flex items-center justify-center w-full">
                                      <svg className="animate-spin h-3.5 w-3.5 text-primary" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    </span>
                                  ) : att?.hasReport ? (
                                    <span className="text-emerald-600 block w-full text-center">x</span>
                                  ) : att?.absenceReason ? (
                                    <span className="text-amber-600 block w-full text-center">P</span>
                                  ) : (
                                    <span className="text-slate-200 block w-full text-center hover:text-slate-400">•</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Total days present sticky column */}
                            <td className="px-3 py-2.5 text-center font-black text-primary sticky right-0 bg-white z-10 border-l border-slate-100 text-[11px]">
                              {row.presentCount}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400 italic">
                Chưa có dữ liệu cho tháng này. Vui lòng thử chọn tháng khác.
              </div>
            )}
          </div>
        )}
      </div>

      <DatePickerModal
        open={showDatePicker}
        value={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateChange}
        title="Chọn ngày xem điểm danh"
      />

      {/* Manual Status Toggling Modal */}
      {reasonModalOpen && reasonModalData && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print animate-fade-in">
          <div className="bg-white border border-slate-100 shadow-2xl rounded-2xl p-5 max-w-sm w-full flex flex-col animate-slide-in space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Cập nhật điểm danh</h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  {reasonModalData.staffName} · Ngày {reasonModalData.dateStr.split("-").reverse().join("/")}
                </p>
              </div>
              <button
                onClick={() => setReasonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Status selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReasonModalData(prev => prev ? { ...prev, currentHasReport: true } : null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    reasonModalData.currentHasReport
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Đi làm
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReasonModalData(prev => prev ? { ...prev, currentHasReport: false } : null);
                  }}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    !reasonModalData.currentHasReport
                      ? "bg-amber-50 text-amber-600 border-amber-200"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Vắng
                </button>
              </div>
            </div>

            {/* Absence reason selection if marked absent */}
            {!reasonModalData.currentHasReport && (
              <div className="space-y-2.5 animate-fade-in">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lý do vắng</label>
                <input
                  type="text"
                  placeholder="Nhập lý do vắng (vd: Ốm, Việc riêng, Có phép...)"
                  value={absenceReasonInput}
                  onChange={(e) => setAbsenceReasonInput(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/25 text-xs font-semibold text-slate-800"
                />
                {/* Quick Suggestions */}
                <div className="flex flex-wrap gap-1.5">
                  {["Nghỉ phép", "Ốm", "Việc riêng", "Không lý do"].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setAbsenceReasonInput(sug === "Không lý do" ? "" : sug)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-[10px] font-bold text-slate-600 rounded-md transition-colors cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReasonModalOpen(false)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAttendanceModal}
                className="bg-primary text-white hover:bg-primary-hover font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer shadow-sm"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spreadsheet Excel Previews */}
      {showDailyPreview && (
        <DailyAttendancePreviewModal
          open={showDailyPreview}
          onClose={() => setShowDailyPreview(false)}
          onConfirm={handleConfirmExportDailyExcel}
          selectedDate={selectedDate}
          staff={dailyData.staff}
          branchFilter={branchFilter}
        />
      )}

      {showMonthlyPreview && monthlyData && (
        <MonthlyAttendancePreviewModal
          open={showMonthlyPreview}
          onClose={() => setShowMonthlyPreview(false)}
          onConfirm={handleConfirmExportMonthlyExcel}
          selectedMonth={selectedMonth}
          staff={monthlyData.staff}
          branchFilter={branchFilter}
        />
      )}
    </div>
  );
}
