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

  // --- SHEET 1: HIỆU SUẤT ĐĂNG BÀI ---
  const postSheet = workbook.addWorksheet("Hiệu suất đăng bài", {
    views: [{ showGridLines: true }],
  });

  postSheet.columns = [
    { key: "platform", width: 14 },
    { key: "title", width: 35 },
    { key: "link", width: 24 },
    { key: "views", width: 12 },
    { key: "likes", width: 12 },
    { key: "status", width: 16 },
    { key: "author", width: 18 },
    { key: "date", width: 14 },
  ];

  const addMergedLinePost = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: string = "G"
  ) => {
    const row = postSheet.addRow([text, "", "", "", "", "", "", ""]);
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

  const pLine3 = addMergedLinePost(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]} · Tổng: ${posts.length} bài viết`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );
  postSheet.getRow(pLine3).height = 24;

  if (imageId !== undefined) {
    postSheet.addImage(imageId, {
      tl: { col: 7, row: 0 },
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
    "Trạng thái",
    "Người tạo",
    "Ngày nộp",
  ]);
  styleRow(postHeaderRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  postHeaderRow.height = 22;

  if (posts.length === 0) {
    const emptyRow = postSheet.addRow(["—", "—", "—", "—", "—", "—", "—", "Chưa có dữ liệu"]);
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
        post.status === "completed" ? "Hoàn thành" : post.status === "in_progress" ? "Đang tiến hành" : "Chờ duyệt",
        post.author_name || staffName,
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
    });
  }

  // --- SHEET 2: BÀN GIAO MOOC & SỰ KIỆN ---
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
    { key: "status", width: 16 },
    { key: "author", width: 18 },
  ];

  const addMergedLineEvent = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: string = "I"
  ) => {
    const row = eventSheet.addRow([text, "", "", "", "", "", "", "", "", ""]);
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
      tl: { col: 9, row: 0 },
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
    "Trạng thái",
    "Người tạo",
  ]);
  styleRow(eventHeaderRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  eventHeaderRow.height = 22;

  if (events.length === 0) {
    const emptyRow = eventSheet.addRow(["—", "—", "—", "—", "—", "—", "—", "—", "—", "Chưa có dữ liệu"]);
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
        event.status === "completed" ? "Hoàn thành" : event.status === "in_progress" ? "Đang tiến hành" : "Chờ duyệt",
        event.author_name || staffName,
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
