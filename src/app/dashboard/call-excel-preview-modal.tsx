"use client";

import type { CallReportRow } from "@/lib/report-data";

const PERIOD_LABELS = {
  week: "1 tuần",
  month: "1 tháng",
  all: "Tất cả",
} as const;

interface CallExcelPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  period: keyof typeof PERIOD_LABELS;
  staffName: string;
  branchName?: string;
  calls: CallReportRow[];
}

export function CallExcelPreviewModal({
  open,
  onClose,
  onConfirm,
  period,
  staffName,
  branchName,
  calls,
}: CallExcelPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 max-w-4xl w-full flex flex-col max-h-[90vh] animate-slide-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Xem trước file Excel cuộc gọi
            </h3>
            <p className="text-slate-500 text-[10px] mt-0.5 font-medium">
              Kiểm tra định dạng và danh sách cuộc gọi trước khi xuất file `.xlsx`
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
            {/* Simulated spreadsheet */}
            <div className="bg-white border border-slate-300 shadow-sm font-sans text-xs text-slate-800 grid grid-cols-[40px_1.8fr_1.6fr_1.4fr_1.2fr_1.4fr_3.6fr] relative select-none">
              
              {/* Columns Header (A, B, C, D, E, F) */}
              <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 flex items-center justify-center text-[10px]">
                {/* corner */}
              </div>
              {["A", "B", "C", "D", "E", "F"].map((col) => (
                <div
                  key={col}
                  className={`bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-slate-300 py-1 text-[10px] ${
                    col !== "F" ? "border-r border-b" : "border-b"
                  }`}
                >
                  {col}
                </div>
              ))}

              {/* Row 1: Company Info */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2.5 flex items-center justify-center text-[10px] h-10">
                1
              </div>
              <div className="col-span-4 border-r border-b border-slate-200 px-3 font-bold text-slate-900 flex items-center h-10">
                CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO
              </div>
              {/* Logo in Column E-F spanning Rows 1-3 */}
              <div className="col-span-2 row-span-3 border-b border-slate-200 p-2 flex items-center justify-end pr-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo/hatico_logo.png" alt="Logo" className="w-[138px] h-[60px] object-contain" />
              </div>

              {/* Row 2: Title */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-3 flex items-center justify-center text-[10px] h-12">
                2
              </div>
              <div className="col-span-4 border-r border-b border-slate-200 px-3 font-bold text-[#0f2d59] text-[13px] flex items-center h-12">
                BÁO CÁO CUỘC GỌI
              </div>

              {/* Row 3: Stats */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2 flex items-center justify-center text-[10px] h-10">
                3
              </div>
              <div className="col-span-4 border-r border-b border-slate-200 px-3 text-slate-600 text-[10px] flex items-center h-10 leading-snug">
                Nhân viên: {staffName}{branchName ? ` · ${branchName}` : ""} · Khoảng: {PERIOD_LABELS[period]} · Tổng: {calls.length} cuộc gọi
              </div>

              {/* Row 4: Spacer */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-1.5 flex items-center justify-center text-[10px] h-6">
                4
              </div>
              <div className="col-span-6 border-b border-slate-200 h-6"></div>

              {/* Row 5: Table Column Headers */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-7">
                5
              </div>
              <div className="bg-[#0f2d59] text-white font-bold border-r border-b border-slate-300 px-3 flex items-center h-7 justify-center">
                Tên
              </div>
              <div className="bg-[#0f2d59] text-white font-bold border-r border-b border-slate-300 px-3 flex items-center h-7 justify-center">
                Điện thoại
              </div>
              <div className="bg-[#0f2d59] text-white font-bold border-r border-b border-slate-300 px-3 flex items-center h-7 justify-center">
                Tỉnh
              </div>
              <div className="bg-[#0f2d59] text-white font-bold border-r border-b border-slate-300 px-3 flex items-center h-7 justify-center">
                Loại mooc
              </div>
              <div className="bg-[#0f2d59] text-white font-bold border-r border-b border-slate-300 px-3 flex items-center h-7 justify-center">
                Báo giá
              </div>
              <div className="bg-[#0f2d59] text-white font-bold border-b border-slate-300 px-3 flex items-center h-7 justify-center">
                Báo cáo sau gọi
              </div>

              {/* Data Rows */}
              {calls.length === 0 ? (
                <div className="contents">
                  <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-10">
                    6
                  </div>
                  <div className="col-span-6 border-b border-slate-200 text-slate-400 italic flex items-center justify-center h-10 bg-white">
                    Chưa có dữ liệu
                  </div>
                </div>
              ) : (
                calls.map((call, idx) => {
                  const dataRowIndex = 6 + idx;
                  const isEven = idx % 2 === 1;
                  const rowBg = isEven ? "bg-[#f8fafc]" : "bg-white";

                  return (
                    <div key={idx} className="contents">
                      <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] min-h-[28px] py-1.5">
                        {dataRowIndex}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-3 font-semibold text-slate-900 flex items-start py-1.5`}>
                        {call.customer_name || "—"}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-3 text-slate-700 flex items-start py-1.5`}>
                        {call.phone || "—"}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-3 text-slate-600 flex items-start py-1.5`}>
                        {call.province || "—"}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-3 text-slate-600 flex items-start py-1.5`}>
                        {call.trailer_type || "—"}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-3 text-slate-600 flex items-start py-1.5`}>
                        {call.price_quote || "—"}
                      </div>
                      <div className={`${rowBg} border-b border-slate-200 px-3 text-slate-700 flex items-start py-1.5 break-all whitespace-pre-wrap`}>
                        {call.post_call_notes || "—"}
                      </div>
                    </div>
                  );
                })
              )}
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
            <span>Tải file Excel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
