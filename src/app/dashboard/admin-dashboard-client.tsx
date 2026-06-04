"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { logoutUser, AdminDashboardData, AdminStaffRow } from "../actions";
import DatePickerModal, { formatDateButtonLabel } from "./date-picker-modal";
import LiveClock from "./live-clock";
import { ReportStatusIndicator } from "./report-status-indicator";

const CHART_COLORS = {
  reported: "#10b981",
  missing: "#cbd5e1",
  barReported: "#0f2d59",
  barMissing: "#e2e8f0",
};

interface AdminDashboardClientProps {
  initialData: AdminDashboardData;
}

export default function AdminDashboardClient({ initialData }: AdminDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { profile, date: initialDate, staff: initialStaff, branchStats, totalStaff, reportedCount, missingCount } =
    initialData;

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [selectedStaff, setSelectedStaff] = useState<AdminStaffRow | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const handleLogout = async () => {
    await logoutUser();
    localStorage.removeItem("hatico_user_session");
    router.push("/login");
    router.refresh();
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setSelectedStaff(null);
    startTransition(() => {
      router.push(`/dashboard/admin?date=${newDate}`);
    });
  };

  const handleReload = () => {
    startTransition(() => router.refresh());
  };

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

  const handleExportExcel = () => {
    const headers = ["Họ và tên", "Chi nhánh", "Bộ phận", "Chức danh", "Việc làm"];
    const rows: string[][] = [];
    for (const s of initialStaff) {
      if (s.tasks.length > 0) {
        for (const title of s.tasks) {
          rows.push([s.full_name, s.branch_name, s.department || "", s.position || "", title]);
        }
      } else {
        rows.push([s.full_name, s.branch_name, s.department || "", s.position || "", "-"]);
      }
    }
    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join(
        "\n"
      );
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_cao_Hatico_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans relative print:h-auto print:overflow-visible print:bg-white">
      <header className="bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] px-4 py-1.5 flex items-center justify-between h-20 shrink-0 z-10 no-print">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo/hatico_logo.png" alt="Hatico" className="w-16 h-16 object-contain shrink-0" />
          <LiveClock />
          <span className="hidden sm:inline-flex text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-bold uppercase">
            Admin
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right text-[11px] hidden sm:block">
            <p className="font-bold text-slate-800">{profile.full_name}</p>
            <p className="text-slate-400">Quản trị hệ thống</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-primary hover:text-primary-hover text-xs font-bold cursor-pointer bg-primary/10 px-2.5 py-1.5 rounded-lg shrink-0"
          >
            Báo cáo của tôi
          </button>
          <button
            onClick={handleReload}
            disabled={isPending}
            title="Tải lại"
            className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer flex items-center justify-center"
          >
            <svg className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button onClick={handleLogout} className="text-slate-500 hover:text-rose-600 text-xs font-bold cursor-pointer">
            Thoát
          </button>
        </div>
      </header>

      <div className="flex-grow h-[calc(100vh-5rem)] overflow-hidden flex flex-col no-print">
        <div className="bg-white border-b border-slate-100 px-4 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowDatePicker(true)}
              className="bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDateButtonLabel(selectedDate)}
            </button>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-slate-50 text-xs font-semibold px-3 py-2 rounded-lg border-0 cursor-pointer"
            >
              <option value="all">Tất cả chi nhánh</option>
              {branchStats.map((b) => (
                <option key={b.branchId} value={b.branchId}>
                  {b.branchName}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              {[
                { key: "all", label: "Tất cả" },
                { key: "reported", label: "Đã BC" },
                { key: "missing", label: "Chưa BC" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                    statusFilter === key ? "bg-primary text-white" : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer"
            >
              Excel
            </button>
            <button
              onClick={() => window.print()}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-3 py-2 rounded-lg cursor-pointer"
            >
              PDF
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Tổng nhân sự", value: totalStaff, sub: "Toàn hệ thống", color: "text-slate-800" },
              { label: "Đã báo cáo", value: reportedCount, sub: formatDateDisplay(selectedDate), color: "text-emerald-600" },
              { label: "Chưa báo cáo", value: missingCount, sub: "Cần nhắc", color: "text-rose-500" },
              { label: "Tỷ lệ hoàn thành", value: `${reportRate}%`, sub: `${reportedCount}/${totalStaff}`, color: "text-primary" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white p-4 rounded-lg shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{kpi.label}</p>
                <p className={`text-2xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">Tỷ lệ báo cáo trong ngày</h3>
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
                  <p className="text-slate-400 text-xs text-center py-16">Chưa có dữ liệu</p>
                )}
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-xs font-bold text-slate-600 uppercase mb-3">Báo cáo theo chi nhánh</h3>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="reported" name="Đã BC" stackId="a" fill={CHART_COLORS.barReported} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="missing" name="Chưa BC" stackId="a" fill={CHART_COLORS.barMissing} radius={[4, 4, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[320px]">
            <div className="lg:col-span-1 bg-white rounded-lg shadow-sm flex flex-col overflow-hidden max-h-[420px]">
              <div className="p-3 border-b border-slate-100 shrink-0">
                <h3 className="text-xs font-bold text-slate-700 uppercase">
                  Nhân sự ({filteredStaff.length}/{totalStaff})
                </h3>
              </div>
              <div className="overflow-y-auto flex-grow p-2 space-y-1.5 no-scrollbar">
                {filteredStaff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStaff(s)}
                    className={`w-full p-2.5 rounded-lg text-left flex items-center gap-2 cursor-pointer transition-colors ${
                      selectedStaff?.id === s.id ? "bg-slate-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <ReportStatusIndicator hasReport={s.hasReport} size="xs" />
                    <div className="min-w-0 flex-grow">
                      <p className="text-xs font-bold text-slate-800 truncate">{s.full_name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{s.branch_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-4 min-h-[280px]">
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
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <p className="text-slate-500 font-bold text-sm">Chọn nhân sự để xem báo cáo</p>
                  <p className="text-slate-400 text-xs mt-1">Danh sách bên trái — {totalStaff} người trong hệ thống</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="print-area hidden print:block p-6">
        <div className="print-header flex items-center justify-between gap-6 pb-4 border-b border-slate-200 mb-4">
          <div>
            <p className="text-xs font-bold uppercase">CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO</p>
            <h1 className="text-xl font-bold">TỔNG HỢP BÁO CÁO — {formatDateDisplay(selectedDate)}</h1>
          </div>
          <img src="/logo/hatico_logo.png" alt="" className="print-logo w-28 h-28 object-contain" />
        </div>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b font-semibold bg-slate-50">
              <th className="py-2 px-2 text-left">Họ tên</th>
              <th className="py-2 px-2 text-left">Chi nhánh</th>
              <th className="py-2 px-2 text-left">Việc làm</th>
            </tr>
          </thead>
          <tbody>
            {initialStaff.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-2 px-2 font-semibold">{s.full_name}</td>
                <td className="py-2 px-2">{s.branch_name}</td>
                <td className="py-2 px-2">{s.tasks.length ? s.tasks.join("; ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DatePickerModal
        open={showDatePicker}
        value={selectedDate}
        onClose={() => setShowDatePicker(false)}
        onSelect={handleDateChange}
        title="Chọn ngày xem báo cáo"
      />
    </div>
  );
}
