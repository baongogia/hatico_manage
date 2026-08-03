"use client";

import { useState } from "react";
import type { MarketingPostRow, MarketingEventRow } from "@/lib/report-data";

const PERIOD_LABELS = {
  week: "1 tuần",
  month: "1 tháng",
  all: "Tất cả",
} as const;

interface MarketingExcelPreviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  period: keyof typeof PERIOD_LABELS;
  staffName: string;
  branchName?: string;
  posts: MarketingPostRow[];
  events: MarketingEventRow[];
}

export function MarketingExcelPreviewModal({
  open,
  onClose,
  onConfirm,
  period,
  staffName,
  branchName,
  posts,
  events,
}: MarketingExcelPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"kpi" | "posts" | "events">("kpi");

  let tiktokCount = 0, tiktokViews = 0, tiktokOver5k = 0, tiktokOver10k = 0;
  let fbCount = 0, fbReach = 0, fbInteractions = 0, fbComments = 0;
  let ytCount = 0;
  let webCount = 0;

  posts.forEach(p => {
    const views = parseInt(String(p.views).replace(/[^0-9]/g, "")) || 0;
    const likes = parseInt(String(p.likes).replace(/[^0-9]/g, "")) || 0;
    const comments = parseInt(String(p.comments).replace(/[^0-9]/g, "")) || 0;
    const shares = parseInt(String(p.shares).replace(/[^0-9]/g, "")) || 0;

    if (p.platform.includes("Tiktok")) {
      tiktokCount++;
      tiktokViews += views;
      if (views >= 10000) tiktokOver10k++;
      if (views >= 5000) tiktokOver5k++; 
    }
    if (p.platform.includes("Facebook")) {
      fbCount++;
      fbReach += views;
      fbInteractions += (likes + comments + shares);
      fbComments += comments;
    }
    if (p.platform.includes("Youtube")) {
      ytCount++;
    }
    if (p.platform.includes("Website")) {
      webCount++;
    }
  });
  
  const kpiData = [
    { name: "[TikTok] Sản lượng video", target: 30, actual: tiktokCount },
    { name: "[TikTok] Tổng lượt xem", target: 60000, actual: tiktokViews },
    { name: "[TikTok] Video > 5.000 views", target: 5, actual: tiktokOver5k },
    { name: "[TikTok] Video > 10.000 views", target: 1, actual: tiktokOver10k },
    { name: "[Facebook] Sản lượng bài đăng", target: 25, actual: fbCount },
    { name: "[Facebook] Tổng reach (tiếp cận)", target: 60000, actual: fbReach },
    { name: "[Facebook] Tổng tương tác", target: 2000, actual: fbInteractions },
    { name: "[Facebook] Bình luận/tin nhắn", target: 30, actual: fbComments },
    { name: "[Website] Sản lượng bài viết", target: 2, actual: webCount },
    { name: "[YouTube] Sản lượng video/shorts", target: 8, actual: ytCount },
  ];

  const platformCounts = [];
  if (tiktokCount > 0) platformCounts.push(`Tiktok: ${tiktokCount}`);
  if (fbCount > 0) platformCounts.push(`Facebook: ${fbCount}`);
  if (ytCount > 0) platformCounts.push(`Youtube: ${ytCount}`);
  if (webCount > 0) platformCounts.push(`Website: ${webCount}`);
  const platformStatsStr = platformCounts.length > 0 ? ` (${platformCounts.join(", ")})` : "";

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 no-print animate-fade-in">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-5 max-w-5xl w-full flex flex-col max-h-[90vh] animate-slide-in">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">
              Xem trước file Excel Marketing
            </h3>
            <p className="text-slate-500 text-[10px] mt-0.5 font-medium">
              Kiểm tra định dạng của cả 2 sheet trước khi tải file `.xlsx`
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

        {/* Excel Sheet Selector (Tabs) */}
        <div className="flex items-center gap-2 mt-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("kpi")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "kpi"
                ? "bg-[#0f2d59] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Sheet 1: Đánh giá KPI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "posts"
                ? "bg-[#0f2d59] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Sheet 2: Hiệu suất đăng bài ({posts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "events"
                ? "bg-[#0f2d59] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Sheet 3: Bàn giao mooc & Sự kiện ({events.length})
          </button>
        </div>

        {/* Modal Body / Spreadsheet Preview */}
        <div className="flex-grow overflow-auto py-4 min-h-0">
          <div className="border border-slate-200 rounded-lg overflow-auto bg-slate-100 p-4 min-w-[850px] max-h-[55vh] no-scrollbar">
            
            {activeTab === "kpi" ? (
              /* Simulated Sheet 1: KPI */
              <div className="bg-white border border-slate-300 shadow-sm font-sans text-xs text-slate-800 grid grid-cols-[40px_2.5fr_1.5fr_1.5fr_1.5fr] relative select-none">
                
                {/* Columns Header (A to D) */}
                <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 flex items-center justify-center text-[10px]">
                  {/* corner */}
                </div>
                {["A", "B", "C", "D"].map((col) => (
                  <div
                    key={col}
                    className={`bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-slate-300 py-1 text-[10px] ${
                      col !== "D" ? "border-r border-b" : "border-b"
                    }`}
                  >
                    {col}
                  </div>
                ))}

                {/* Row 1: Company Info */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2.5 flex items-center justify-center text-[10px] h-10">
                  1
                </div>
                <div className="col-span-3 border-r border-b border-slate-200 px-3 font-bold text-slate-900 flex items-center h-10">
                  CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO
                </div>
                {/* Logo in Column D spanning Rows 1-3 */}
                <div className="row-span-3 border-b border-slate-200 p-2 flex items-center justify-end pr-4 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/hatico_logo.png" alt="Logo" className="w-[140px] h-[65px] object-contain" />
                </div>

                {/* Row 2: Title */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-3 flex items-center justify-center text-[10px] h-12">
                  2
                </div>
                <div className="col-span-3 border-r border-b border-slate-200 px-3 font-bold text-[#0f2d59] text-[13px] flex items-center h-12">
                  ĐÁNH GIÁ KPI MARKETING
                </div>

                {/* Row 3: Stats */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2 flex items-center justify-center text-[10px] h-10">
                  3
                </div>
                <div className="col-span-3 border-r border-b border-slate-200 px-3 text-slate-600 text-[10px] flex items-center h-10 leading-snug">
                  Nhân viên: {staffName}{branchName ? ` · ${branchName}` : ""} · Khoảng: {PERIOD_LABELS[period]}
                </div>

                {/* Row 4: Spacer */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-1.5 flex items-center justify-center text-[10px] h-6">
                  4
                </div>
                <div className="col-span-4 border-b border-slate-200 h-6"></div>

                {/* Row 5: Table Column Headers */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-7">
                  5
                </div>
                {["Hạng mục", "Chỉ tiêu (Tháng)", "Thực tế đạt", "Tỉ lệ đạt (%)"].map((header, idx) => (
                  <div
                    key={idx}
                    className={`bg-[#0f2d59] text-white font-bold px-2 flex items-center h-7 justify-center text-[10px] text-center ${
                      idx !== 3 ? "border-r border-b border-slate-300" : "border-b border-slate-300"
                    }`}
                  >
                    {header}
                  </div>
                ))}

                {/* Data Rows */}
                {kpiData.map((row, idx) => {
                  const dataRowIndex = 6 + idx;
                  const isEven = idx % 2 === 1;
                  const rowBg = isEven ? "bg-[#f8fafc]" : "bg-white";
                  const percent = row.target > 0 ? (row.actual / row.target) * 100 : 0;
                  
                  let colorClass = "text-red-600";
                  if (percent >= 100) colorClass = "text-green-600";
                  else if (percent >= 80) colorClass = "text-yellow-600";

                  return (
                    <div key={idx} className="contents">
                      <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] min-h-[28px] py-1.5">
                        {dataRowIndex}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-3 ${row.name === "Tổng bài đăng" ? "font-bold" : "font-medium"} text-slate-900 flex items-center py-1.5`}>
                        {row.name}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-700 flex items-center justify-center py-1.5`}>
                        {row.target.toLocaleString("vi-VN")}
                      </div>
                      <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-700 flex items-center justify-center py-1.5 font-medium`}>
                        {row.actual.toLocaleString("vi-VN")}
                      </div>
                      <div className={`${rowBg} border-b border-slate-200 px-2 flex items-center justify-center py-1.5 font-bold ${colorClass}`}>
                        {percent.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : activeTab === "posts" ? (
              /* Simulated Sheet 2: Posts */
              <div className="bg-white border border-slate-300 shadow-sm font-sans text-xs text-slate-800 grid grid-cols-[40px_1fr_2.4fr_1.8fr_1fr_1fr_1.2fr] relative select-none">
                
                {/* Columns Header (A to F) */}
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
                <div className="col-span-5 border-r border-b border-slate-200 px-3 font-bold text-slate-900 flex items-center h-10">
                  CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO
                </div>
                {/* Logo in Column F spanning Rows 1-3 */}
                <div className="row-span-3 border-b border-slate-200 p-2 flex items-center justify-end pr-4 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/hatico_logo.png" alt="Logo" className="w-[140px] h-[65px] object-contain" />
                </div>

                {/* Row 2: Title */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-3 flex items-center justify-center text-[10px] h-12">
                  2
                </div>
                <div className="col-span-5 border-r border-b border-slate-200 px-3 font-bold text-[#0f2d59] text-[13px] flex items-center h-12">
                  BÁO CÁO HIỆU SUẤT ĐĂNG BÀI MARKETING
                </div>

                {/* Row 3: Stats */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2 flex items-center justify-center text-[10px] h-10">
                  3
                </div>
                <div className="col-span-5 border-r border-b border-slate-200 px-3 text-slate-600 text-[10px] flex items-center h-10 leading-snug">
                  Nhân viên: {staffName}{branchName ? ` · ${branchName}` : ""} · Khoảng: {PERIOD_LABELS[period]} · Tổng: {posts.length} bài viết{platformStatsStr}
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
                {["Nền tảng", "Tiêu đề / Nội dung bài đăng", "Đường dẫn (Link)", "Lượt xem", "Lượt thích", "Ngày"].map((header, idx) => (
                  <div
                    key={idx}
                    className={`bg-[#0f2d59] text-white font-bold px-2 flex items-center h-7 justify-center text-[10px] text-center ${
                      idx !== 5 ? "border-r border-b border-slate-300" : "border-b border-slate-300"
                    }`}
                  >
                    {header}
                  </div>
                ))}

                {/* Data Rows */}
                {posts.length === 0 ? (
                  <div className="contents">
                    <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-10">
                      6
                    </div>
                    <div className="col-span-6 border-b border-slate-200 text-slate-400 italic flex items-center justify-center h-10 bg-white">
                      Chưa có dữ liệu
                    </div>
                  </div>
                ) : (
                  posts.map((post, idx) => {
                    const dataRowIndex = 6 + idx;
                    const isEven = idx % 2 === 1;
                    const rowBg = isEven ? "bg-[#f8fafc]" : "bg-white";

                    return (
                      <div key={idx} className="contents">
                        <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] min-h-[28px] py-1.5">
                          {dataRowIndex}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 font-semibold text-slate-900 flex items-start py-1.5 justify-center text-center`}>
                          {post.platform}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-700 flex items-start py-1.5`}>
                          {post.title || "—"}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-500 flex items-start py-1.5 break-all`}>
                          {post.link || "—"}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5 justify-center`}>
                          {post.views || "—"}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5 justify-center`}>
                          {post.likes || "—"}
                        </div>
                        <div className={`${rowBg} border-b border-slate-200 px-2 text-slate-500 flex items-start py-1.5 justify-center`}>
                          {post.report_date}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Simulated Sheet 2: Events */
              <div className="bg-white border border-slate-300 shadow-sm font-sans text-xs text-slate-800 grid grid-cols-[40px_1.4fr_1fr_1fr_0.8fr_1.2fr_1.1fr_0.9fr_1.6fr] relative select-none">
                
                {/* Columns Header (A to H) */}
                <div className="bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-r border-b border-slate-300 py-1 flex items-center justify-center text-[10px]">
                  {/* corner */}
                </div>
                {["A", "B", "C", "D", "E", "F", "G", "H"].map((col) => (
                  <div
                    key={col}
                    className={`bg-[#f3f4f6] text-[#4b5563] text-center font-bold border-slate-300 py-1 text-[10px] ${
                      col !== "H" ? "border-r border-b" : "border-b"
                    }`}
                  >
                    {col}
                  </div>
                ))}

                {/* Row 1: Company Info */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2.5 flex items-center justify-center text-[10px] h-10">
                  1
                </div>
                <div className="col-span-7 border-r border-b border-slate-200 px-3 font-bold text-slate-900 flex items-center h-10">
                  CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO
                </div>
                {/* Logo in Column H spanning Rows 1-3 */}
                <div className="row-span-3 border-b border-slate-200 p-2 flex items-center justify-end pr-4 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo/hatico_logo.png" alt="Logo" className="w-[140px] h-[65px] object-contain" />
                </div>

                {/* Row 2: Title */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-3 flex items-center justify-center text-[10px] h-12">
                  2
                </div>
                <div className="col-span-7 border-r border-b border-slate-200 px-3 font-bold text-[#0f2d59] text-[13px] flex items-center h-12">
                  BÁO CÁO BÀN GIAO MOOC & SỰ KIỆN
                </div>

                {/* Row 3: Stats */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-2 flex items-center justify-center text-[10px] h-10">
                  3
                </div>
                <div className="col-span-7 border-r border-b border-slate-200 px-3 text-slate-600 text-[10px] flex items-center h-10 leading-snug">
                  Nhân viên: {staffName}{branchName ? ` · ${branchName}` : ""} · Khoảng: {PERIOD_LABELS[period]} · Tổng: {events.length} sự kiện
                </div>

                {/* Row 4: Spacer */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 py-1.5 flex items-center justify-center text-[10px] h-6">
                  4
                </div>
                <div className="col-span-8 border-b border-slate-200 h-6"></div>

                {/* Row 5: Table Column Headers */}
                <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-7">
                  5
                </div>
                {["Sự kiện / Khách hàng", "Ngày thực hiện", "Loại mooc", "Số lượng", "Địa điểm", "Chi phí (VNĐ)", "Khách mời", "Kết quả đạt được"].map((header, idx) => (
                  <div
                    key={idx}
                    className={`bg-[#0f2d59] text-white font-bold px-2 flex items-center h-7 justify-center text-[10px] text-center ${
                      idx !== 7 ? "border-r border-b border-slate-300" : "border-b border-slate-300"
                    }`}
                  >
                    {header}
                  </div>
                ))}

                {/* Data Rows */}
                {events.length === 0 ? (
                  <div className="contents">
                    <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] h-10">
                      6
                    </div>
                    <div className="col-span-8 border-b border-slate-200 text-slate-400 italic flex items-center justify-center h-10 bg-white">
                      Chưa có dữ liệu
                    </div>
                  </div>
                ) : (
                  events.map((event, idx) => {
                    const dataRowIndex = 6 + idx;
                    const isEven = idx % 2 === 1;
                    const rowBg = isEven ? "bg-[#f8fafc]" : "bg-white";

                    return (
                      <div key={idx} className="contents">
                        <div className="bg-[#f3f4f6] text-[#6b7280] text-center font-semibold border-r border-b border-slate-300 flex items-center justify-center text-[10px] min-h-[28px] py-1.5">
                          {dataRowIndex}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 font-semibold text-slate-900 flex items-start py-1.5`}>
                          {event.event_name}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5 justify-center`}>
                          {event.event_date}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5 justify-center`}>
                          {event.trailer_type || "—"}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5 justify-center`}>
                          {event.qty || "—"}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5`}>
                          {event.location || "—"}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5 justify-end font-mono`}>
                          {event.budget || "—"}
                        </div>
                        <div className={`${rowBg} border-r border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5 justify-center`}>
                          {event.attendees || "—"}
                        </div>
                        <div className={`${rowBg} border-b border-slate-200 px-2 text-slate-600 flex items-start py-1.5`}>
                          {event.outcome || "—"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
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
