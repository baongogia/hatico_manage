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

  const addMergedLine = (text: string, style: Partial<ExcelJS.Style>) => {
    const row = sheet.addRow([text, "", "", "", "", ""]);
    const n = row.number;
    sheet.mergeCells(`A${n}:F${n}`);
    styleRow(row, style);
    return n;
  };

  addMergedLine("CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  });

  addMergedLine("BÁO CÁO CUỘC GỌI", {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  });

  addMergedLine(
    `Nhân viên: ${staffName}${branchName ? ` · ${branchName}` : ""} · Khoảng: ${PERIOD_LABELS[period]} · Tổng: ${calls.length} cuộc gọi`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );

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
