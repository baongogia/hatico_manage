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

  const addMergedLine = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endCol: "B" | "C" = "C"
  ) => {
    const row = sheet.addRow([text, "", ""]);
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

  // 2. Add header fields (merge A:B, leave Column C open for logo)
  const line1 = addMergedLine("CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  }, "B");
  sheet.getRow(line1).height = 24;

  const line2 = addMergedLine(`TỔNG HỢP BÁO CÁO — ${formatReportDate(selectedDate)}`, {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  }, "B");
  sheet.getRow(line2).height = 32;

  const line3 = addMergedLine(
    `Tổng nhân sự: ${totalStaff} · Đã báo cáo: ${reportedCount} · Chưa báo cáo: ${missingCount} · Hoàn thành: ${reportRate}%`,
    {
      font: { size: 10, color: { argb: "FF334155" } },
      alignment: { wrapText: true, vertical: "middle" },
    },
    "B"
  );
  sheet.getRow(line3).height = 24;

  // Add the logo in Column C spanning rows 1-3
  if (imageId !== undefined) {
    sheet.addImage(imageId, {
      tl: { col: 2, row: 0 },
      ext: { width: 138, height: 60 },
    });
  }

  sheet.addRow([]);

  for (const group of groupStaffByBranch(staff, branchFilter)) {
    const branchNum = addMergedLine(`--- ${group.branchName} ---`, {
      font: { bold: true, size: 11, color: { argb: PRIMARY } },
      alignment: { horizontal: "center", vertical: "middle" },
      border: {
        bottom: { style: "thin", color: { argb: PRIMARY } },
      },
    }, "C");
    sheet.getRow(branchNum).height = 22;

    const metaNum = addMergedLine(
      `${group.rows.length} nhân sự · Đã báo cáo ${group.reported}/${group.rows.length}`,
      {
        font: { size: 9, italic: true, color: { argb: "FF475569" } },
        alignment: { horizontal: "center", vertical: "middle" },
      },
      "C"
    );
    sheet.getRow(metaNum).height = 18;

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
      dataRow.getCell(1).font = { size: 10, bold: true };
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
