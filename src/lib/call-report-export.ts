import ExcelJS from "exceljs";
import type { CallReportRow } from "@/lib/report-data";
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
  calls: CallReportRow[];
};

export async function downloadCallReportExcel(filename: string, options: ExportOptions) {
  const { period, staffName, branchName, calls } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";
  const sheet = workbook.addWorksheet("Báo cáo cuộc gọi", {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { key: "name", width: 18 },
    { key: "phone", width: 16 },
    { key: "province", width: 14 },
    { key: "trailer", width: 12 },
    { key: "quote", width: 14 },
    { key: "notes", width: 36 },
  ];

  const addMergedLine = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: "E" | "F" = "F"
  ) => {
    const row = sheet.addRow([text, "", "", "", "", ""]);
    const n = row.number;
    sheet.mergeCells(`A${n}:${endCol}${n}`);
    styleRow(row, style);
    return n;
  };

  // 1. Fetch logo and add to workbook
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

  // 2. Add header fields (merge A:E, leave Column F open for logo)
  const line1 = addMergedLine("CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  }, "E");
  sheet.getRow(line1).height = 24;

  const line2 = addMergedLine("BÁO CÁO CUỘC GỌI", {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  }, "E");
  sheet.getRow(line2).height = 32;

  const line3 = addMergedLine(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]} · Tổng: ${calls.length} cuộc gọi`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    },
    "E"
  );
  sheet.getRow(line3).height = 24;

  // Add the logo in Column F (col: 5) spanning rows 1-3
  if (imageId !== undefined) {
    sheet.addImage(imageId, {
      tl: { col: 5, row: 0 },
      ext: { width: 206, height: 90 },
    });
  }

  sheet.addRow([]);

  const headerRow = sheet.addRow([
    "Tên",
    "Điện thoại",
    "Tỉnh",
    "Loại mooc",
    "Báo giá",
    "Báo cáo sau gọi",
  ]);
  styleRow(headerRow, {
    font: { bold: true, size: 10, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center", wrapText: true },
  });
  headerRow.height = 22;

  if (calls.length === 0) {
    const emptyRow = sheet.addRow(["—", "—", "—", "—", "—", "Chưa có dữ liệu"]);
    styleRow(emptyRow, {
      font: { size: 10, italic: true, color: { argb: "FF64748B" } },
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "center" },
    });
  } else {
    calls.forEach((call, i) => {
      const dataRow = sheet.addRow([
        call.customer_name,
        call.phone,
        call.province,
        call.trailer_type,
        call.price_quote,
        call.post_call_notes,
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

export function formatCallExportDate(dateString: string) {
  return formatReportDate(dateString);
}
