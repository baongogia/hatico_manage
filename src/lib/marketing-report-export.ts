import ExcelJS from "exceljs";
import type { MarketingPostRow, MarketingEventRow } from "@/lib/report-data";
import { formatReportDate } from "@/lib/admin-report-export";

const PRIMARY = "FF0F2D59";
const BORDER = "FF475569";
const HEADER_FILL = "FF0F2D59";
const ALT_FILL = "FFF8FAFC";

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: BORDER } },
  left: { style: "thin", color: { argb: BORDER } },
  bottom: { style: "thin", color: { argb: BORDER } },
  right: { style: "thin", color: { argb: BORDER } },
};

function styleRow(row: ExcelJS.Row, style: Partial<ExcelJS.Style>) {
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.style = { ...cell.style, ...style };
  });
}

const PERIOD_LABELS = {
  week: "1 tuần",
  month: "1 tháng",
  all: "Tất cả",
} as const;

type ExportOptions = {
  period: keyof typeof PERIOD_LABELS;
  staffName: string;
  branchName?: string;
  posts: MarketingPostRow[];
  events: MarketingEventRow[];
};

export async function downloadMarketingReportExcel(filename: string, options: ExportOptions) {
  const { period, staffName, branchName, posts, events } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";

  // 1. Fetch logo
  let imageId: number | undefined;
  try {
    const response = await fetch("/logo/hatico_logo.png");
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      imageId = workbook.addImage({
        buffer,
        extension: "png",
      });
    }
  } catch (err) {
    console.error("Failed to load logo for Excel", err);
  }

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
      fbReach += views; // reach
      fbInteractions += (likes + comments + shares);
      fbComments += comments; // proxy for messages/comments
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

  // --- SHEET 1: ĐÁNH GIÁ KPI ---
  const kpiSheet = workbook.addWorksheet("Đánh giá KPI", {
    views: [{ showGridLines: true }],
  });
  
  kpiSheet.columns = [
    { key: "name", width: 25 },
    { key: "target", width: 16 },
    { key: "actual", width: 16 },
    { key: "percent", width: 16 },
  ];

  const addMergedLineKpi = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: string = "D"
  ) => {
    const row = kpiSheet.addRow([text, "", "", ""]);
    const n = row.number;
    kpiSheet.mergeCells(`A${n}:${endCol}${n}`);
    styleRow(row, style);
    return n;
  };

  const kLine1 = addMergedLineKpi("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  });
  kpiSheet.getRow(kLine1).height = 24;

  const kLine2 = addMergedLineKpi("ĐÁNH GIÁ KPI MARKETING", {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  });
  kpiSheet.getRow(kLine2).height = 32;

  const kLine3 = addMergedLineKpi(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]}`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );
  kpiSheet.getRow(kLine3).height = 24;

  if (imageId !== undefined) {
    kpiSheet.addImage(imageId, {
      tl: { col: 3, row: 0 },
      ext: { width: 160, height: 75 },
    });
  }

  kpiSheet.addRow([]);

  const kpiHeaderRow = kpiSheet.addRow([
    "Hạng mục",
    "Chỉ tiêu (Tháng)",
    "Thực tế đạt",
    "Tỉ lệ đạt (%)"
  ]);
  styleRow(kpiHeaderRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  kpiHeaderRow.height = 22;

  kpiData.forEach((row, i) => {
    const percent = row.target > 0 ? (row.actual / row.target) * 100 : 0;
    const rowNum = 6 + i;
    const dataRow = kpiSheet.addRow([
      row.name,
      row.target,
      row.actual,
      { formula: `IF(B${rowNum}>0, C${rowNum}/B${rowNum}, 0)` }
    ]);
    
    styleRow(dataRow, {
      font: { size: 10, bold: row.name === "Tổng bài đăng" },
      fill:
        i % 2 === 1
          ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } }
          : undefined,
      border: thinBorder,
      alignment: { vertical: "middle", wrapText: true },
    });
    
    dataRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    dataRow.getCell(2).numFmt = "#,##0";
    dataRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    dataRow.getCell(3).numFmt = "#,##0";
    
    const percentCell = dataRow.getCell(4);
    percentCell.alignment = { horizontal: "center", vertical: "middle" };
    percentCell.numFmt = "0.0%";
    
    if (percent >= 100) {
      percentCell.font = { size: 10, bold: true, color: { argb: "FF16A34A" } }; // Green
    } else if (percent >= 80) {
      percentCell.font = { size: 10, bold: true, color: { argb: "FFCA8A04" } }; // Yellow
    } else {
      percentCell.font = { size: 10, bold: true, color: { argb: "FFDC2626" } }; // Red
    }
  });

  // --- SHEET 2: HIỆU SUẤT ĐĂNG BÀI ---
  const postSheet = workbook.addWorksheet("Hiệu suất đăng bài", {
    views: [{ showGridLines: true }],
  });

  postSheet.columns = [
    { key: "platform", width: 14 },
    { key: "title", width: 35 },
    { key: "link", width: 24 },
    { key: "views", width: 12 },
    { key: "likes", width: 12 },
    { key: "date", width: 14 },
  ];

  const addMergedLinePost = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: string = "F"
  ) => {
    const row = postSheet.addRow([text, "", "", "", "", ""]);
    const n = row.number;
    postSheet.mergeCells(`A${n}:${endCol}${n}`);
    styleRow(row, style);
    return n;
  };

  const pLine1 = addMergedLinePost("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  });
  postSheet.getRow(pLine1).height = 24;

  const pLine2 = addMergedLinePost("BÁO CÁO HIỆU SUẤT ĐĂNG BÀI MARKETING", {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  });
  postSheet.getRow(pLine2).height = 32;

  const platformCounts = [];
  if (tiktokCount > 0) platformCounts.push(`Tiktok: ${tiktokCount}`);
  if (fbCount > 0) platformCounts.push(`Facebook: ${fbCount}`);
  if (ytCount > 0) platformCounts.push(`Youtube: ${ytCount}`);
  if (webCount > 0) platformCounts.push(`Website: ${webCount}`);
  const platformStatsStr = platformCounts.length > 0 ? ` (${platformCounts.join(", ")})` : "";

  const pLine3 = addMergedLinePost(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]} · Tổng: ${posts.length} bài viết${platformStatsStr}`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );
  postSheet.getRow(pLine3).height = 24;

  if (imageId !== undefined) {
    postSheet.addImage(imageId, {
      tl: { col: 5, row: 0 },
      ext: { width: 160, height: 75 },
    });
  }

  postSheet.addRow([]);

  const postHeaderRow = postSheet.addRow([
    "Nền tảng",
    "Tiêu đề / Nội dung bài đăng",
    "Đường dẫn (Link)",
    "Lượt xem",
    "Lượt thích",
    "Ngày",
  ]);
  styleRow(postHeaderRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  postHeaderRow.height = 22;

  if (posts.length === 0) {
    const emptyRow = postSheet.addRow(["—", "—", "—", "—", "—", "Chưa có dữ liệu"]);
    styleRow(emptyRow, {
      font: { size: 10, italic: true, color: { argb: "FF64748B" } },
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "center" },
    });
  } else {
    posts.forEach((post, i) => {
      const dataRow = postSheet.addRow([
        post.platform,
        post.title,
        post.link,
        post.views,
        post.likes,
        formatReportDate(post.report_date),
      ]);
      styleRow(dataRow, {
        font: { size: 10 },
        fill:
          i % 2 === 1
            ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } }
            : undefined,
        border: thinBorder,
        alignment: { vertical: "top", wrapText: true },
      });
      dataRow.getCell(1).alignment = { vertical: "top", horizontal: "center", wrapText: true };
    });
  }

  // --- SHEET 3: BÀN GIAO MOOC & SỰ KIỆN ---
  const eventSheet = workbook.addWorksheet("Bàn giao mooc & Sự kiện", {
    views: [{ showGridLines: true }],
  });

  eventSheet.columns = [
    { key: "event_name", width: 28 },
    { key: "event_date", width: 14 },
    { key: "trailer_type", width: 14 },
    { key: "qty", width: 12 },
    { key: "location", width: 20 },
    { key: "budget", width: 16 },
    { key: "attendees", width: 14 },
    { key: "outcome", width: 24 },
  ];

  const addMergedLineEvent = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: string = "G"
  ) => {
    const row = eventSheet.addRow([text, "", "", "", "", "", "", ""]);
    const n = row.number;
    eventSheet.mergeCells(`A${n}:${endCol}${n}`);
    styleRow(row, style);
    return n;
  };

  const eLine1 = addMergedLineEvent("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  });
  eventSheet.getRow(eLine1).height = 24;

  const eLine2 = addMergedLineEvent("BÁO CÁO BÀN GIAO MOOC & SỰ KIỆN", {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  });
  eventSheet.getRow(eLine2).height = 32;

  const eLine3 = addMergedLineEvent(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]} · Tổng: ${events.length} sự kiện`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );
  eventSheet.getRow(eLine3).height = 24;

  if (imageId !== undefined) {
    eventSheet.addImage(imageId, {
      tl: { col: 7, row: 0 },
      ext: { width: 160, height: 75 },
    });
  }

  eventSheet.addRow([]);

  const eventHeaderRow = eventSheet.addRow([
    "Sự kiện / Khách hàng",
    "Ngày thực hiện",
    "Loại mooc",
    "Số lượng",
    "Địa điểm",
    "Chi phí (VNĐ)",
    "Khách mời",
    "Kết quả đạt được",
  ]);
  styleRow(eventHeaderRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  eventHeaderRow.height = 22;

  if (events.length === 0) {
    const emptyRow = eventSheet.addRow(["—", "—", "—", "—", "—", "—", "—", "Chưa có dữ liệu"]);
    styleRow(emptyRow, {
      font: { size: 10, italic: true, color: { argb: "FF64748B" } },
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "center" },
    });
  } else {
    events.forEach((event, i) => {
      const dataRow = eventSheet.addRow([
        event.event_name,
        formatReportDate(event.event_date),
        event.trailer_type || "—",
        event.qty || "—",
        event.location || "—",
        event.budget,
        event.attendees,
        event.outcome,
      ]);
      styleRow(dataRow, {
        font: { size: 10 },
        fill:
          i % 2 === 1
            ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } }
            : undefined,
        border: thinBorder,
        alignment: { vertical: "top", wrapText: true },
      });
    });
  }

  // --- DOWNLOAD ---
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
