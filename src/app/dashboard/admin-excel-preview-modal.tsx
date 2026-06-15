"use client";

import { useMemo } from "react";
import type { AdminStaffRow } from "../actions";
import { formatReportDate, groupStaffByBranch } from "@/lib/admin-report-export";

interface AdminExcelPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  selectedDate: string;
  totalStaff: number;
  reportedCount: number;
  missingCount: number;
  reportRate: number;
  staff: AdminStaffRow[];
  branchFilter: string;
}

export function AdminExcelPreviewModal({
  open,
  onClose,
  onConfirm,
  selectedDate,
  totalStaff,
  reportedCount,
  missingCount,
  reportRate,
  staff,
  branchFilter,
}: AdminExcelPreviewModalProps) {
  const groups = useMemo(() => {
    return groupStaffByBranch(staff, branchFilter);
  }, [staff, branchFilter]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 max-w-4xl w-full flex flex-col max-h-[90vh] animate-slide-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Xem trước file Excel xuất báo cáo
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
          <div className="border border-slate-200 rounded-lg overflow-auto bg-slate-100 p-4 min-w-[700px] max-h-[60vh] no-scrollbar">
            {/* The simulated Excel Sheet */}
            <div className="bg-white border border-slate-300 shadow-sm font-sans text-xs text-slate-800 grid grid-cols-[40px_2.8fr_1.6fr_5.2fr] relative select-none">
              
              {/* Header row (A, B, C) */}
              <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 flex items-center justify-center text-[10px]">
                {/* corner */}
              </div>
              <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 text-[10px]">
                A
              </div>
              <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 text-[10px]">
                B
              </div>
              <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-b border-slate-300 py-1 text-[10px]">
                C
              </div>

              {/* Row 1: Company Info & Logo */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2.5 flex items-center justify-center text-[10px] h-10">
                1
              </div>
              <div className="col-span-2 border-r border-b border-slate-200 px-3 font-bold text-slate-900 flex items-center h-10">
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
              <div className="col-span-2 border-r border-b border-slate-200 px-3 font-bold text-[#0f2d59] text-[13px] flex items-center h-12">
                TỔNG HỢP BÁO CÁO — {formatReportDate(selectedDate)}
              </div>

              {/* Row 3: Stats */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2 flex items-center justify-center text-[10px] h-10">
                3
              </div>
              <div className="col-span-2 border-r border-b border-slate-200 px-3 text-slate-600 text-[10px] flex items-center h-10 leading-snug">
                Tổng nhân sự: {totalStaff} · Đã báo cáo: {reportedCount} · Chưa báo cáo: {missingCount} · Hoàn thành: {reportRate}%
              </div>

              {/* Row 4: Spacer */}
              <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-1.5 flex items-center justify-center text-[10px] h-6">
                4
              </div>
              <div className="col-span-3 border-b border-slate-200 h-6"></div>

              {/* Render branches dynamically */}
              {(() => {
                let currentRowIndex = 5;
                return groups.map((group) => {
                  const branchRowIndex = currentRowIndex++;
                  const metaRowIndex = currentRowIndex++;
                  const tableHeaderRowIndex = currentRowIndex++;
                  
                  return (
                    <div key={group.branchName} className="contents">
                      {/* Branch Header Row */}
                      <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-8">
                        {branchRowIndex}
                      </div>
                      <div className="col-span-3 border-b border-slate-300 text-[#0f2d59] font-bold text-[11px] flex items-center justify-center h-8">
                        --- {group.branchName} ---
                      </div>

                      {/* Branch Meta Row */}
                      <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-6">
                        {metaRowIndex}
                      </div>
                      <div className="col-span-3 border-b border-slate-200 text-slate-500 italic text-[10px] flex items-center justify-center h-6">
                        {group.rows.length} nhân sự · Đã báo cáo {group.reported}/{group.rows.length}
                      </div>

                      {/* Table Header Row */}
                      <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-7">
                        {tableHeaderRowIndex}
                      </div>
                      <div className="bg-slate-100 text-[#0f2d59] font-bold border-r border-b border-slate-300 px-3 flex items-center h-7">
                        Họ tên
                      </div>
                      <div className="bg-slate-100 text-[#0f2d59] font-bold border-r border-b border-slate-300 px-3 flex items-center h-7">
                        Trạng thái
                      </div>
                      <div className="bg-slate-100 text-[#0f2d59] font-bold border-b border-slate-300 px-3 flex items-center h-7">
                        Việc làm
                      </div>

                      {/* Data Rows */}
                      {group.rows.map((s, idx) => {
                        const dataRowIndex = currentRowIndex++;
                        const isEven = idx % 2 === 1;
                        const rowBg = isEven ? "bg-[#f8fafc]" : "bg-white";
                        
                        return (
                          <div key={s.id} className="contents">
                            <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] min-h-[28px] py-1.5">
                              {dataRowIndex}
                            </div>
                            <div className={`${rowBg} border-r border-b border-slate-200 px-3 font-bold text-slate-800 flex items-start py-1.5`}>
                              {s.full_name}
                            </div>
                            <div className={`${rowBg} border-r border-b border-slate-200 px-3 flex items-start py-1.5`}>
                              {s.hasReport ? (
                                <span className="text-emerald-600 font-bold">Đã báo cáo</span>
                              ) : (
                                <span className="text-rose-500">Chưa báo cáo</span>
                              )}
                            </div>
                            <div className={`${rowBg} border-b border-slate-200 px-3 text-slate-700 flex items-start py-1.5 break-all whitespace-pre-wrap`}>
                              {s.tasks.length > 0 ? s.tasks.join("; ") : "—"}
                            </div>
                          </div>
                        );
                      })}

                      {/* Branch Spacer Row */}
                      {(() => {
                        const spacerRowIndex = currentRowIndex++;
                        return (
                          <div className="contents" key={`spacer-${group.branchName}`}>
                            <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-6">
                              {spacerRowIndex}
                            </div>
                            <div className="col-span-3 border-b border-slate-200 h-6"></div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                });
              })()}
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
