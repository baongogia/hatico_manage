"use client";

import { useMemo } from "react";
import type { AdminStaffRow, MonthlyAttendanceStaffRow } from "../actions";

// Format date to DD/MM/YYYY
function formatReportDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

interface DailyAttendancePreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedDate: string;
  staff: AdminStaffRow[];
  branchFilter: string;
}

export function DailyAttendancePreviewModal({
  open,
  onClose,
  onConfirm,
  selectedDate,
  staff,
  branchFilter,
}: DailyAttendancePreviewModalProps) {
  const filteredStaff = useMemo(() => {
    const list = branchFilter === "all" ? staff : staff.filter(s => s.branch_id === branchFilter);
    return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
  }, [staff, branchFilter]);

  const { reportedCount, missingCount } = useMemo(() => {
    const present = filteredStaff.filter(s => s.hasReport).length;
    return {
      reportedCount: present,
      missingCount: filteredStaff.length - present
    };
  }, [filteredStaff]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 max-w-4xl w-full flex flex-col max-h-[90vh] animate-slide-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Xem trước bảng Excel điểm danh ngày
            </h3>
            <p className="text-slate-500 text-[10px] mt-0.5 font-medium">
              Kiểm tra định dạng và dữ liệu trước khi xuất file `.xlsx`
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body / Spreadsheet Preview */}
        <div className="flex-grow overflow-auto py-4 min-h-0">
          <div className="border border-slate-200 rounded-lg overflow-auto bg-slate-100 p-4 min-w-[750px] max-h-[60vh] no-scrollbar">
            {/* Simulated Excel Grid */}
            <div className="bg-white border border-slate-300 shadow-sm font-sans text-xs text-slate-800 grid grid-cols-[40px_2fr_1.5fr_1.5fr_1.5fr_2fr_1.5fr] relative select-none">
              {/* Header row (A, B, C, D, E, F) */}
              <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 flex items-center justify-center text-[10px]">
                {/* corner */}
              </div>
              {["A", "B", "C", "D", "E", "F"].map((col) => (
                <div key={col} className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 text-[10px]">
                  {col}
                </div>
              ))}

              {/* Row 1: Company Title */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2.5 flex items-center justify-center text-[10px] h-10">
                1
              </div>
              <div className="col-span-5 border-r border-b border-slate-200 px-3 font-bold text-slate-900 flex items-center h-10">
                CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO
              </div>
              {/* Logo container spanning Rows 1-3 */}
              <div className="row-span-3 border-b border-slate-200 p-2 flex items-center justify-end pr-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo/hatico_logo.png" alt="Logo" className="w-[206px] h-[90px] object-contain" />
              </div>

              {/* Row 2: Title */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-3 flex items-center justify-center text-[10px] h-12">
                2
              </div>
              <div className="col-span-5 border-r border-b border-slate-200 px-3 font-bold text-[#0f2d59] text-[13px] flex items-center h-12">
                BÁO CÁO ĐIỂM DANH HÀNG NGÀY - NGÀY {formatReportDate(selectedDate)}
              </div>

              {/* Row 3: Stats */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2 flex items-center justify-center text-[10px] h-10">
                3
              </div>
              <div className="col-span-5 border-r border-b border-slate-200 px-3 text-slate-600 text-[10px] flex items-center h-10 leading-snug">
                Tổng nhân sự: {filteredStaff.length} người · Đi làm: {reportedCount} · Vắng: {missingCount}
              </div>

              {/* Row 4: Spacer */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-1.5 flex items-center justify-center text-[10px] h-6">
                4
              </div>
              <div className="col-span-6 border-b border-slate-200 h-6"></div>

              {/* Row 5: Table Header */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-1.5 flex items-center justify-center text-[10px] h-7">
                5
              </div>
              {["Họ tên", "Chi nhánh", "Bộ phận", "Chức vụ", "Trạng thái", "Giờ điểm danh"].map((header, idx) => (
                <div
                  key={header}
                  className={`bg-slate-100 text-[#0f2d59] font-bold border-b border-slate-300 px-3 flex items-center h-7 ${
                    idx < 5 ? "border-r border-slate-300" : ""
                  }`}
                >
                  {header}
                </div>
              ))}

              {/* Data Rows */}
              {filteredStaff.map((s, idx) => {
                const rowIndex = 6 + idx;
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? "bg-[#f8fafc]" : "bg-white";
                
                let statusText = s.hasReport ? "Đi làm" : "Vắng";
                if (!s.hasReport && s.absence_reason) {
                  statusText = `Vắng (Lý do: ${s.absence_reason})`;
                }

                return (
                  <div key={s.id} className="contents">
                    <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] min-h-[28px] py-1.5">
                      {rowIndex}
                    </div>
                    <div className={`${rowBg} border-r border-b border-slate-200 px-3 font-bold text-slate-800 flex items-center py-1.5`}>
                      {s.full_name}
                    </div>
                    <div className={`${rowBg} border-r border-b border-slate-200 px-3 text-slate-600 flex items-center py-1.5`}>
                      {s.branch_name || "—"}
                    </div>
                    <div className={`${rowBg} border-r border-b border-slate-200 px-3 text-slate-600 flex items-center py-1.5`}>
                      {s.department || "—"}
                    </div>
                    <div className={`${rowBg} border-r border-b border-slate-200 px-3 text-slate-600 flex items-center py-1.5`}>
                      {s.position || "—"}
                    </div>
                    <div className={`${rowBg} border-r border-b border-slate-200 px-3 flex items-center py-1.5`}>
                      {s.hasReport ? (
                        <span className="text-[#385723] bg-[#e2f0d9] px-2 py-0.5 rounded font-bold text-[10px]">Đi làm</span>
                      ) : s.absence_reason ? (
                        <span className="text-[#c65911] bg-[#fce4d6] px-2 py-0.5 rounded font-bold text-[10px]">{statusText}</span>
                      ) : (
                        <span className="text-rose-500 font-medium">Vắng</span>
                      )}
                    </div>
                    <div className={`${rowBg} border-b border-slate-200 px-3 text-slate-700 flex items-center py-1.5`}>
                      {s.check_in_time || "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-[#10b981] text-white hover:bg-emerald-700 font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Tải file Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface MonthlyAttendancePreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedMonth: string;
  staff: MonthlyAttendanceStaffRow[];
  branchFilter: string;
}

export function MonthlyAttendancePreviewModal({
  open,
  onClose,
  onConfirm,
  selectedMonth,
  staff,
  branchFilter,
}: MonthlyAttendancePreviewModalProps) {
  const filteredStaff = useMemo(() => {
    const list = branchFilter === "all" ? staff : staff.filter(s => s.branch_id === branchFilter);
    return [...list].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));
  }, [staff, branchFilter]);

  const [year, monthNum] = selectedMonth.split("-");
  const lastDay = new Date(Number(year), Number(monthNum), 0).getDate();

  if (!open) return null;

  // Total columns helper: 4 (name, branch, dept, pos) + days + 1 (total)
  const totalCols = 4 + lastDay + 1;

  // Excel headers list
  const getHeaderLetter = (idx: number) => {
    let temp = "";
    while (idx > 0) {
      let modulo = (idx - 1) % 26;
      temp = String.fromCharCode(65 + modulo) + temp;
      idx = Math.floor((idx - modulo) / 26);
    }
    return temp;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 max-w-6xl w-full flex flex-col max-h-[90vh] animate-slide-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Xem trước bảng Excel bảng công tháng
            </h3>
            <p className="text-slate-500 text-[10px] mt-0.5 font-medium">
              Xem và kiểm tra dữ liệu bảng chấm công trước khi xuất file `.xlsx`
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50 cursor-pointer"
            aria-label="Đóng"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body / Spreadsheet Preview */}
        <div className="flex-grow overflow-auto py-4 min-h-0">
          <div className="border border-slate-200 rounded-lg overflow-auto bg-slate-100 p-4 max-h-[60vh] no-scrollbar">
            {/* Horizontally scrollable sheet container */}
            <div className="bg-white border border-slate-300 shadow-sm font-sans text-[10px] text-slate-800 min-w-[1200px] select-none">
              
              {/* Spreadsheet Header row A, B, C... */}
              <div className="flex">
                <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 w-10 py-1 shrink-0 flex items-center justify-center">
                  {/* corner */}
                </div>
                {Array.from({ length: totalCols }).map((_, idx) => (
                  <div
                    key={idx}
                    style={{ width: idx === 0 ? "180px" : idx < 4 ? "100px" : idx === totalCols - 1 ? "80px" : "32px" }}
                    className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 shrink-0"
                  >
                    {getHeaderLetter(idx + 1)}
                  </div>
                ))}
              </div>

              {/* Row 1-3 Container */}
              <div className="flex bg-white">
                {/* Row Headers (1, 2, 3) */}
                <div className="flex flex-col w-10 shrink-0 border-r border-slate-300">
                  <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-b border-slate-300 h-9 flex items-center justify-center text-[10px]">
                    1
                  </div>
                  <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-b border-slate-300 h-11 flex items-center justify-center text-[10px]">
                    2
                  </div>
                  <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-b border-slate-300 h-9 flex items-center justify-center text-[10px]">
                    3
                  </div>
                </div>

                {/* Columns A-D Texts (width 480px) */}
                <div className="flex flex-col w-[480px] shrink-0 border-r border-slate-200">
                  <div className="font-bold text-slate-900 border-b border-slate-200 px-3 h-9 flex items-center text-xs">
                    CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO
                  </div>
                  <div className="font-bold text-[#0f2d59] border-b border-slate-200 px-3 h-11 flex items-center text-sm">
                    BẢNG CÔNG ĐIỂM DANH CHI TIẾT - THÁNG {monthNum}/{year}
                  </div>
                  <div className="text-slate-500 border-b border-slate-200 px-3 h-9 flex items-center italic">
                    Tổng nhân sự: {filteredStaff.length} người · Ngày xuất báo cáo: {new Date().toLocaleDateString("vi-VN")}
                  </div>
                </div>

                {/* Column E Logo (width 206px) */}
                <div className="w-[206px] shrink-0 border-r border-b border-slate-200 flex items-center justify-center p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/hatico_logo.png" alt="Logo" className="w-[150px] h-[70px] object-contain" />
                </div>

                {/* Remainder space to match table horizontal grid line */}
                <div className="flex-grow border-b border-slate-200"></div>
              </div>

              {/* Row 4: Spacer */}
              <div className="flex h-5 items-center">
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 w-10 h-full flex items-center justify-center shrink-0">
                  4
                </div>
                <div className="border-b border-slate-200 w-full h-full bg-white"></div>
              </div>

              {/* Row 5: Table Header */}
              <div className="flex h-8 items-center bg-slate-100 font-bold text-[#0f2d59] border-b border-slate-300">
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-slate-300 w-10 h-full flex items-center justify-center shrink-0">
                  5
                </div>
                <div className="w-[180px] border-r border-slate-300 px-3 shrink-0 flex items-center h-full">Họ tên</div>
                <div className="w-[100px] border-r border-slate-300 px-3 shrink-0 flex items-center h-full">Chi nhánh</div>
                <div className="w-[100px] border-r border-slate-300 px-3 shrink-0 flex items-center h-full">Bộ phận</div>
                <div className="w-[100px] border-r border-slate-300 px-3 shrink-0 flex items-center h-full">Chức vụ</div>
                {Array.from({ length: lastDay }).map((_, i) => (
                  <div key={i} className="w-8 border-r border-slate-300 shrink-0 text-center flex items-center justify-center h-full">
                    {i + 1}
                  </div>
                ))}
                <div className="w-[80px] shrink-0 text-center flex items-center justify-center h-full">Số ngày công</div>
              </div>

              {/* Data Rows */}
              {filteredStaff.map((s, idx) => {
                const rowIndex = 6 + idx;
                const isEven = idx % 2 === 1;
                const rowBg = isEven ? "bg-[#f8fafc]" : "bg-white";

                return (
                  <div key={s.id} className="flex border-b border-slate-200 items-stretch bg-white">
                    <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-slate-300 w-10 flex items-center justify-center shrink-0 py-1">
                      {rowIndex}
                    </div>
                    <div className={`w-[180px] border-r border-slate-200 px-3 shrink-0 font-bold text-slate-800 flex items-center ${rowBg}`}>
                      {s.full_name}
                    </div>
                    <div className={`w-[100px] border-r border-slate-200 px-3 shrink-0 text-slate-600 flex items-center ${rowBg}`}>
                      {s.branch_name || "—"}
                    </div>
                    <div className={`w-[100px] border-r border-slate-200 px-3 shrink-0 text-slate-600 flex items-center ${rowBg}`}>
                      {s.department || "—"}
                    </div>
                    <div className={`w-[100px] border-r border-slate-200 px-3 shrink-0 text-slate-600 flex items-center ${rowBg}`}>
                      {s.position || "—"}
                    </div>

                    {/* Day cells */}
                    {Array.from({ length: lastDay }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = `${selectedMonth}-${String(day).padStart(2, "0")}`;
                      const att = s.attendanceMap[dateStr];

                      let cellText = "";
                      let cellStyleClass = "";
                      if (att?.hasReport) {
                        cellText = "x";
                        cellStyleClass = "text-[#385723] bg-[#e2f0d9]";
                      } else if (att?.absenceReason) {
                        cellText = "p";
                        cellStyleClass = "text-[#c65911] bg-[#fce4d6]";
                      }

                      return (
                        <div
                          key={day}
                          className={`w-8 border-r border-slate-200 shrink-0 text-center font-bold flex items-center justify-center text-[11px] ${rowBg} ${cellStyleClass}`}
                          title={att?.absenceReason ? `Lý do: ${att.absenceReason}` : undefined}
                        >
                          {cellText}
                        </div>
                      );
                    })}

                    <div className={`w-[80px] shrink-0 text-center font-bold text-[#0f2d59] flex items-center justify-center ${rowBg}`}>
                      {s.presentCount}
                    </div>
                  </div>
                );
              })}

              {/* Note Row */}
              <div className="flex h-8 border-b border-slate-300 bg-slate-50 items-center">
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-slate-300 w-10 h-full flex items-center justify-center shrink-0">
                  {6 + filteredStaff.length}
                </div>
                <div className="px-3 text-slate-500 italic text-[9px] w-full flex items-center h-full">
                  Ghi chú ký hiệu:   x = Đi làm (Điểm danh/Có báo cáo)   |   p = Nghỉ phép (Vắng có lý do)   |   Trống = Vắng không báo cáo
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="bg-[#10b981] text-white hover:bg-emerald-700 font-bold px-5 py-2 rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Tải file Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
