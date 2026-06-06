"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getCallReports,
  saveCallReportsBatch,
  type CallReportRow,
  type Profile,
} from "../actions";
import type { CallReportEntry, CallReportPeriod } from "@/lib/report-data";
import { downloadCallReportExcel } from "@/lib/call-report-export";
import { CallExcelPreviewModal } from "./call-excel-preview-modal";
import { layoutGap, layoutPad } from "@/lib/glass-styles";
import { DEFAULT_BG_URL } from "./page-background";
import AdminSelect from "./admin-select";

const PERIOD_TABS = [
  { value: "week" as const, label: "1 tuần" },
  { value: "month" as const, label: "1 tháng" },
  { value: "all" as const, label: "Tất cả" },
];

const TRAILER_TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "Ben", label: "Ben" },
  { value: "Lồng", label: "Lồng" },
  { value: "Sàn", label: "Sàn" },
  { value: "Téc", label: "Téc" },
  { value: "Siêu trường", label: "Siêu trường" },
  { value: "Lửng", label: "Lửng" },
];

const cellInput =
  "w-full min-w-[4.5rem] min-h-[2rem] px-2 py-1.5 text-xs text-slate-900 bg-white border border-slate-200/80 rounded focus:outline-none focus:ring-2 focus:ring-primary/35 focus:border-primary/50";

const mobileFormInput =
  "input-compact w-full h-7 px-2 text-slate-900 bg-white border border-slate-200/70 rounded-md focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-slate-400";

const toolbarBtn =
  "inline-flex items-center justify-center shrink-0 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg text-[10px] sm:text-xs font-bold touch-manipulation transition-colors cursor-pointer";

type MobileFormState = Omit<CallReportEntry, "type">;

type EditableCallRow = CallReportRow & { rowId: string };

type CallReportPanelProps = {
  profile: Profile;
  initialCalls: CallReportRow[];
};

function toEditableRows(calls: CallReportRow[]): EditableCallRow[] {
  return calls.map((call, i) => ({
    ...call,
    rowId: `${call.report_id}-${call.report_date}-${i}`,
  }));
}

function emptyMobileForm(): MobileFormState {
  return {
    customer_name: "",
    phone: "",
    province: "",
    trailer_type: "",
    price_quote: "",
    post_call_notes: "",
  };
}

function newEmptyRow(todayStr: string): EditableCallRow {
  return {
    type: "call",
    rowId: `new-${crypto.randomUUID()}`,
    report_id: "",
    report_date: todayStr,
    customer_name: "",
    phone: "",
    province: "",
    trailer_type: "",
    price_quote: "",
    post_call_notes: "",
  };
}

export function CallReportPanel({ profile, initialCalls }: CallReportPanelProps) {
  const todayStr = new Date().toISOString().split("T")[0];
  const [period, setPeriod] = useState<CallReportPeriod>("week");
  const [rows, setRows] = useState<EditableCallRow[]>(() => toEditableRows(initialCalls));
  const [loadedDates, setLoadedDates] = useState<Set<string>>(
    () => new Set(initialCalls.map((c) => c.report_date))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState("");
  const [mobileForm, setMobileForm] = useState<MobileFormState>(emptyMobileForm);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [showExcelPreview, setShowExcelPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSave] = useTransition();
  const focusRowIdRef = useRef<string | null>(null);
  const nameInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const branchLabel = profile.department?.branch
    ? `${profile.department.name} - ${profile.department.branch.name}`
    : profile.department?.name;

  const filteredRows = useMemo(() => {
    const now = new Date();
    if (period === "all") return rows;
    const start = new Date(now);
    if (period === "week") start.setDate(start.getDate() - 7);
    if (period === "month") start.setDate(start.getDate() - 30);
    const startStr = start.toISOString().split("T")[0];
    return rows.filter((r) => r.report_date >= startStr);
  }, [rows, period]);

  useEffect(() => {
    const id = focusRowIdRef.current;
    if (!id) return;
    focusRowIdRef.current = null;
    requestAnimationFrame(() => {
      nameInputRefs.current.get(id)?.focus();
    });
  }, [rows]);

  const formatDateDisplay = (dateString: string) => {
    const [year, month, day] = dateString.split("-");
    return `${day}/${month}/${year}`;
  };

  const applyFetched = (calls: CallReportRow[]) => {
    setRows(toEditableRows(calls));
    setLoadedDates(new Set(calls.map((c) => c.report_date)));
    setSelected(new Set());
    setErrorMsg("");
  };

  const handlePeriodChange = (value: CallReportPeriod) => {
    setPeriod(value);
    startTransition(async () => {
      const result = await getCallReports(value);
      if (!("error" in result)) applyFetched(result.calls);
    });
  };

  const handleExportExcel = () => {
    setShowExcelPreview(true);
  };

  const handleConfirmExportExcel = async () => {
    setShowExcelPreview(false);
    try {
      const label = PERIOD_TABS.find((t) => t.value === period)?.label || period;
      const exportRows = filteredRows.filter((r) => r.customer_name.trim());
      await downloadCallReportExcel(
        `Bao_cao_cuoc_goi_${profile.full_name.replace(/\s+/g, "_")}_${label}.xlsx`,
        {
          period,
          staffName: profile.full_name,
          branchName: branchLabel,
          calls: exportRows,
        }
      );
    } catch {
      window.alert("Không xuất được Excel. Vui lòng thử lại.");
    }
  };

  const updateRow = (rowId: string, field: keyof Omit<CallReportEntry, "type">, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.rowId === rowId ? { ...r, [field]: value } : r))
    );
  };

  const toggleSelect = (rowId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filteredRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map((r) => r.rowId)));
    }
  };

  const handleAddRow = () => {
    const row = newEmptyRow(todayStr);
    focusRowIdRef.current = row.rowId;
    setRows((prev) => [...prev, row]);
    setLoadedDates((prev) => new Set([...prev, todayStr]));
  };

  const clearMobileForm = () => {
    setMobileForm(emptyMobileForm());
    setEditingRowId(null);
  };

  const loadRowToForm = (row: EditableCallRow) => {
    setMobileForm({
      customer_name: row.customer_name,
      phone: row.phone,
      province: row.province,
      trailer_type: row.trailer_type,
      price_quote: row.price_quote,
      post_call_notes: row.post_call_notes,
    });
    setEditingRowId(row.rowId);
    setErrorMsg("");
  };

  const handleMobileFormSubmit = () => {
    if (!mobileForm.customer_name.trim()) {
      setErrorMsg("Vui lòng nhập tên khách hàng.");
      return;
    }
    setErrorMsg("");

    if (editingRowId) {
      setRows((prev) =>
        prev.map((r) =>
          r.rowId === editingRowId ? { ...r, ...mobileForm } : r
        )
      );
      clearMobileForm();
      return;
    }

    const row: EditableCallRow = {
      ...newEmptyRow(todayStr),
      ...mobileForm,
    };
    setRows((prev) => [...prev, row]);
    setLoadedDates((prev) => new Set([...prev, todayStr]));
    clearMobileForm();
  };

  const updateMobileForm = (field: keyof MobileFormState, value: string) => {
    setMobileForm((prev) => ({ ...prev, [field]: value }));
  };

  const persistRows = async (
    currentRows: EditableCallRow[],
    extraDates: Iterable<string> = []
  ) => {
    const datesToSave = new Set([...loadedDates, ...extraDates]);
    if (datesToSave.size === 0) return;

    const byDate = new Map<string, Omit<CallReportEntry, "type">[]>();
    for (const row of currentRows) {
      if (!row.customer_name.trim()) continue;
      const list = byDate.get(row.report_date) ?? [];
      list.push({
        customer_name: row.customer_name,
        phone: row.phone,
        province: row.province,
        trailer_type: row.trailer_type,
        price_quote: row.price_quote,
        post_call_notes: row.post_call_notes,
      });
      byDate.set(row.report_date, list);
    }

    const entries = [...datesToSave].map((date) => ({
      date,
      calls: byDate.get(date) ?? [],
    }));

    const result = await saveCallReportsBatch(entries);
    if ("error" in result) {
      setErrorMsg(result.error || "Không thể lưu.");
      return;
    }
    const refresh = await getCallReports(period);
    if (!("error" in refresh)) applyFetched(refresh.calls);
  };

  const handleDeleteSelected = () => {
    if (selected.size === 0) return;

    const deletedDates = rows
      .filter((r) => selected.has(r.rowId))
      .map((r) => r.report_date);
    const nextRows = rows.filter((r) => !selected.has(r.rowId));

    if ([...selected].some((id) => id === editingRowId)) clearMobileForm();

    setRows(nextRows);
    setSelected(new Set());
    setErrorMsg("");

    startSave(async () => {
      await persistRows(nextRows, deletedDates);
    });
  };

  const handleSave = () => {
    const hasValidRow = rows.some((r) => r.customer_name.trim());
    if (!hasValidRow && loadedDates.size === 0) {
      setErrorMsg("Vui lòng nhập tên khách hàng.");
      return;
    }

    setErrorMsg("");
    startSave(async () => {
      await persistRows(rows);
    });
  };

  const allSelected = filteredRows.length > 0 && selected.size === filteredRows.length;

  return (
    <div
      className={`no-print flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/92 shadow-[0_8px_32px_rgba(15,45,89,0.08)] transition-opacity duration-200 ${
        isPending ? "opacity-70 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="relative shrink-0 overflow-hidden border-b border-primary/30">
        <Image src={DEFAULT_BG_URL} alt="" fill className="object-cover opacity-30" aria-hidden />
        <div
          className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary-hover opacity-95"
          aria-hidden
        />
        <div className={`relative ${layoutPad} flex flex-col ${layoutGap}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Báo cáo cuộc gọi
              </h2>
              <p className="text-[10px] text-white/70 mt-0.5 truncate">
                {profile.full_name}
                {branchLabel ? ` · ${branchLabel}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isPending}
              className="shrink-0 h-9 flex items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold text-primary bg-white hover:bg-white/90 border border-white/30 shadow-sm cursor-pointer touch-manipulation transition-colors disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
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

      <div className={`shrink-0 ${layoutPad} flex flex-col ${layoutGap}`}>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className={`${toolbarBtn} hidden sm:inline-flex text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20`}
          >
            + Thêm dòng
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={isSaving}
              className={`${toolbarBtn} text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60`}
            >
              Xóa ({selected.size})
            </button>
          )}
          <button
            type="button"
            disabled={isSaving || isPending}
            onClick={handleSave}
            className={`${toolbarBtn} text-white bg-primary hover:bg-primary-hover disabled:opacity-60 shadow-sm`}
          >
            {isSaving ? "Đang lưu..." : "Lưu"}
          </button>

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
            {filteredRows.length} dòng
          </span>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-[10px] sm:text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="sm:hidden rounded-xl border border-slate-200/70 bg-gradient-to-b from-slate-50/90 to-white p-2.5 space-y-2 shadow-sm">
          <p className="text-[9px] font-bold text-primary uppercase tracking-wider">
            {editingRowId ? "Chỉnh sửa cuộc gọi" : "Thêm cuộc gọi mới"}
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="space-y-0.5">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Tên *</span>
              <input
                type="text"
                placeholder="Tên KH"
                value={mobileForm.customer_name}
                onChange={(e) => updateMobileForm("customer_name", e.target.value)}
                className={mobileFormInput}
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Điện thoại</span>
              <input
                type="tel"
                placeholder="SĐT"
                value={mobileForm.phone}
                onChange={(e) => updateMobileForm("phone", e.target.value)}
                className={mobileFormInput}
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Tỉnh</span>
              <input
                type="text"
                placeholder="Tỉnh"
                value={mobileForm.province}
                onChange={(e) => updateMobileForm("province", e.target.value)}
                className={mobileFormInput}
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Loại mooc</span>
              <AdminSelect
                micro
                portal
                value={mobileForm.trailer_type}
                onChange={(v) => updateMobileForm("trailer_type", v)}
                options={TRAILER_TYPE_OPTIONS}
                placeholder="—"
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Báo giá</span>
              <input
                type="text"
                placeholder="Giá"
                value={mobileForm.price_quote}
                onChange={(e) => updateMobileForm("price_quote", e.target.value)}
                className={mobileFormInput}
              />
            </label>
            <label className="space-y-0.5">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Ngày</span>
              <input
                type="text"
                readOnly
                value={formatDateDisplay(todayStr)}
                className={`${mobileFormInput} bg-slate-100/80 text-slate-500`}
              />
            </label>
            <label className="space-y-0.5 col-span-2">
              <span className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Báo cáo sau gọi</span>
              <input
                type="text"
                placeholder="Ghi chú sau cuộc gọi"
                value={mobileForm.post_call_notes}
                onChange={(e) => updateMobileForm("post_call_notes", e.target.value)}
                className={mobileFormInput}
              />
            </label>
          </div>
          <div className="flex gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={handleMobileFormSubmit}
              className="flex-1 h-7 rounded-md text-[10px] font-bold text-white bg-primary hover:bg-primary-hover cursor-pointer touch-manipulation transition-colors shadow-sm"
            >
              {editingRowId ? "Cập nhật" : "Thêm dòng"}
            </button>
            {editingRowId && (
              <button
                type="button"
                onClick={clearMobileForm}
                className="h-7 px-2.5 rounded-md text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 cursor-pointer touch-manipulation transition-colors"
              >
                Hủy
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`flex-1 min-h-0 overflow-auto ${layoutPad} pt-0`}>
        <div className="sm:hidden rounded-lg border border-slate-100 bg-white min-w-0">
          <table className="w-full text-left text-[9px] leading-tight">
            <thead>
              <tr className="bg-primary text-white">
                <th className="w-7 px-1 py-1.5 border border-white/15">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-3 h-3 accent-white cursor-pointer"
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="px-1 py-1.5 font-bold border border-white/15">Tên</th>
                <th className="px-1 py-1.5 font-bold border border-white/15">SĐT</th>
                <th className="px-1 py-1.5 font-bold border border-white/15">Tỉnh</th>
                <th className="px-1 py-1.5 font-bold border border-white/15">Mooc</th>
                <th className="px-1 py-1.5 font-bold border border-white/15">Giá</th>
                <th className="px-1 py-1.5 font-bold border border-white/15 w-11">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-slate-400 italic border border-slate-200/80">
                    Chưa có dòng — điền form phía trên
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr
                    key={row.rowId}
                    onClick={() => loadRowToForm(row)}
                    className={`cursor-pointer ${
                      i % 2 === 1 ? "bg-slate-50/60" : "bg-white"
                    } ${editingRowId === row.rowId ? "ring-1 ring-inset ring-primary/30" : ""} ${
                      selected.has(row.rowId) ? "bg-primary/5" : ""
                    }`}
                  >
                    <td
                      className="px-1 py-1 border border-slate-200/80 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(row.rowId)}
                        onChange={() => toggleSelect(row.rowId)}
                        className="w-3 h-3 accent-primary cursor-pointer"
                        aria-label={`Chọn ${row.customer_name || "dòng"}`}
                      />
                    </td>
                    <td className="px-1 py-1 border border-slate-200/80 font-semibold text-slate-900 max-w-[3.5rem] truncate">
                      {row.customer_name || "—"}
                    </td>
                    <td className="px-1 py-1 border border-slate-200/80 text-slate-700 max-w-[3.5rem] truncate">
                      {row.phone || "—"}
                    </td>
                    <td className="px-1 py-1 border border-slate-200/80 text-slate-600 max-w-[2.5rem] truncate">
                      {row.province || "—"}
                    </td>
                    <td className="px-1 py-1 border border-slate-200/80 text-slate-600 max-w-[2.5rem] truncate">
                      {row.trailer_type || "—"}
                    </td>
                    <td className="px-1 py-1 border border-slate-200/80 text-slate-600 max-w-[2.5rem] truncate">
                      {row.price_quote || "—"}
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

        <div className="hidden sm:block rounded-lg border border-slate-100 bg-white min-w-0">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="w-9 px-2 py-2 border border-white/15">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 accent-white cursor-pointer"
                      aria-label="Chọn tất cả"
                    />
                  </th>
                  <th className="px-2 py-2 font-bold text-center border border-white/15">Tên</th>
                  <th className="px-2 py-2 font-bold text-center border border-white/15">Điện thoại</th>
                  <th className="px-2 py-2 font-bold text-center border border-white/15">Tỉnh</th>
                  <th className="px-2 py-2 font-bold text-center border border-white/15 min-w-[5.5rem]">Loại mooc</th>
                  <th className="px-2 py-2 font-bold text-center border border-white/15">Báo giá</th>
                  <th className="px-2 py-2 font-bold text-center border border-white/15 min-w-[7rem]">Báo cáo sau gọi</th>
                  <th className="px-2 py-2 font-bold text-center border border-white/15 w-20">Ngày</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-10 text-center text-slate-400 italic border border-slate-200/80">
                      Chưa có dòng nào — bấm &quot;Thêm dòng&quot; để bắt đầu
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, i) => (
                    <tr
                      key={row.rowId}
                      className={`${i % 2 === 1 ? "bg-slate-50/60" : "bg-white"} ${
                        selected.has(row.rowId) ? "ring-1 ring-inset ring-primary/25" : ""
                      }`}
                    >
                      <td className="px-2 py-1 border border-slate-200/80 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(row.rowId)}
                          onChange={() => toggleSelect(row.rowId)}
                          className="w-3.5 h-3.5 accent-primary cursor-pointer"
                          aria-label={`Chọn ${row.customer_name || "dòng mới"}`}
                        />
                      </td>
                      <td className="p-1 border border-slate-200/80">
                        <input
                          ref={(el) => {
                            if (el) nameInputRefs.current.set(row.rowId, el);
                            else nameInputRefs.current.delete(row.rowId);
                          }}
                          type="text"
                          placeholder="Tên *"
                          value={row.customer_name}
                          onChange={(e) => updateRow(row.rowId, "customer_name", e.target.value)}
                          className={`${cellInput} font-semibold`}
                        />
                      </td>
                      <td className="p-1 border border-slate-200/80">
                        <input
                          type="tel"
                          placeholder="SĐT"
                          value={row.phone}
                          onChange={(e) => updateRow(row.rowId, "phone", e.target.value)}
                          className={cellInput}
                        />
                      </td>
                      <td className="p-1 border border-slate-200/80">
                        <input
                          type="text"
                          placeholder="Tỉnh"
                          value={row.province}
                          onChange={(e) => updateRow(row.rowId, "province", e.target.value)}
                          className={cellInput}
                        />
                      </td>
                      <td className="p-1 border border-slate-200/80">
                        <AdminSelect
                          compact
                          portal
                          value={row.trailer_type}
                          onChange={(v) => updateRow(row.rowId, "trailer_type", v)}
                          options={TRAILER_TYPE_OPTIONS}
                          placeholder="—"
                        />
                      </td>
                      <td className="p-1 border border-slate-200/80">
                        <input
                          type="text"
                          placeholder="Giá"
                          value={row.price_quote}
                          onChange={(e) => updateRow(row.rowId, "price_quote", e.target.value)}
                          className={cellInput}
                        />
                      </td>
                      <td className="p-1 border border-slate-200/80">
                        <input
                          type="text"
                          placeholder="Ghi chú"
                          value={row.post_call_notes}
                          onChange={(e) => updateRow(row.rowId, "post_call_notes", e.target.value)}
                          className={cellInput}
                        />
                      </td>
                      <td className="px-2 py-1.5 border border-slate-200/80 text-slate-500 text-center text-[10px] whitespace-nowrap">
                        {formatDateDisplay(row.report_date)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CallExcelPreviewModal
        open={showExcelPreview}
        onClose={() => setShowExcelPreview(false)}
        onConfirm={handleConfirmExportExcel}
        period={period}
        staffName={profile.full_name}
        branchName={branchLabel}
        calls={filteredRows.filter((r) => r.customer_name.trim())}
      />
    </div>
  );
}
