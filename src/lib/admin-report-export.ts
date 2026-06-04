import ExcelJS from "exceljs";
import type { AdminStaffRow } from "@/app/actions";

export function formatReportDate(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

export function groupStaffByBranch(staff: AdminStaffRow[], branchFilter: string) {
  const printStaff =
    branchFilter === "all" ? staff : staff.filter((s) => s.branch_id === branchFilter);

  const groups = new Map<string, AdminStaffRow[]>();
  for (const s of printStaff) {
    const key = s.branch_name?.trim() || "Chưa gán chi nhánh";
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b, "vi"))
    .map(([branchName, rows]) => ({
      branchName,
      rows: rows.sort((x, y) => x.full_name.localeCompare(y.full_name, "vi")),
      reported: rows.filter((r) => r.hasReport).length,
    }));
}

const PRIMARY = "FF0F2D59";
const BORDER = "FF475569";
const HEADER_FILL = "FFE2E8F0";
const ALT_FILL = "FFF8FAFC";
const META_FILL = "FFF1F5F9";

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

function mergeRow(sheet: ExcelJS.Worksheet, rowNum: number) {
  sheet.mergeCells(`A${rowNum}:C${rowNum}`);
}

type ExportOptions = {
  selectedDate: string;
  totalStaff: number;
  reportedCount: number;
  missingCount: number;
  reportRate: number;
  staff: AdminStaffRow[];
  branchFilter: string;
};

export async function downloadAdminReportExcel(filename: string, options: ExportOptions) {
  const { selectedDate, totalStaff, reportedCount, missingCount, reportRate, staff, branchFilter } =
    options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";
  const sheet = workbook.addWorksheet("Báo cáo", {
    views: [{ showGridLines: true }],
  });

  sheet.columns = [
    { key: "name", width: 28 },
    { key: "status", width: 16 },
    { key: "tasks", width: 52 },
  ];

  const addMergedLine = (text: string, style: Partial<ExcelJS.Style>) => {
    const row = sheet.addRow([text, "", ""]);
    const n = row.number;
    mergeRow(sheet, n);
    styleRow(row, style);
    return n;
  };

  addMergedLine("CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  });

  addMergedLine(`TỔNG HỢP BÁO CÁO — ${formatReportDate(selectedDate)}`, {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  });

  addMergedLine(
    `Tổng nhân sự: ${totalStaff} · Đã báo cáo: ${reportedCount} · Chưa báo cáo: ${missingCount} · Hoàn thành: ${reportRate}%`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    }
  );

  sheet.addRow([]);

  for (const group of groupStaffByBranch(staff, branchFilter)) {
    const branchNum = addMergedLine(`--- ${group.branchName} ---`, {
      font: { bold: true, size: 11, color: { argb: PRIMARY } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        top: { style: "medium", color: { argb: PRIMARY } },
        bottom: { style: "thin", color: { argb: BORDER } },
      },
    });
    sheet.getRow(branchNum).height = 22;

    addMergedLine(
      `${group.rows.length} nhân sự · Đã báo cáo ${group.reported}/${group.rows.length}`,
      {
        font: { size: 9, italic: true, color: { argb: "FF475569" } },
        fill: { type: "pattern", pattern: "solid", fgColor: { argb: META_FILL } },
        alignment: { horizontal: "center" },
      }
    );

    const headerRow = sheet.addRow(["Họ tên", "Trạng thái", "Việc làm"]);
    styleRow(headerRow, {
      font: { bold: true, size: 10, color: { argb: PRIMARY } },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "left" },
    });
    headerRow.height = 20;

    group.rows.forEach((s, i) => {
      const dataRow = sheet.addRow([
        s.full_name,
        s.hasReport ? "Đã báo cáo" : "Chưa báo cáo",
        s.tasks.length > 0 ? s.tasks.join("; ") : "—",
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
      if (s.hasReport) {
        dataRow.getCell(2).font = { size: 10, color: { argb: "FF059669" }, bold: true };
      } else {
        dataRow.getCell(2).font = { size: 10, color: { argb: "FFE11D48" } };
      }
    });

    sheet.addRow([]);
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
