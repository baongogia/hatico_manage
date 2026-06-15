import ExcelJS from "exceljs";
import type { MonthlyAttendanceStaffRow, AdminStaffRow } from "@/app/actions";

const PRIMARY = "FF0F2D59";
const BORDER = "FF475569";
const HEADER_FILL = "FFE2E8F0";
const ALT_FILL = "FFF8FAFC";
const PRESENT_FILL = "FFE2F0D9"; // Light green for present days
const ABSENT_REASON_FILL = "FFFCE4D6"; // Light orange/peach for reasoned leave

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

type ExportAttendanceOptions = {
  month: string; // YYYY-MM
  staff: MonthlyAttendanceStaffRow[];
  branchFilter: string;
};

export async function downloadAdminAttendanceExcel(filename: string, options: ExportAttendanceOptions) {
  const { month, staff, branchFilter } = options;

  const [year, monthNum] = month.split("-");
  const lastDay = new Date(Number(year), Number(monthNum), 0).getDate();

  const filteredStaff = branchFilter === "all" ? staff : staff.filter(s => s.branch_id === branchFilter);
  const sortedStaff = [...filteredStaff].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";
  const sheet = workbook.addWorksheet("Điểm danh tháng", {
    views: [{ showGridLines: true }],
  });

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "Họ tên", key: "name", width: 25 },
    { header: "Chi nhánh", key: "branch", width: 18 },
    { header: "Bộ phận", key: "dept", width: 15 },
    { header: "Chức vụ", key: "pos", width: 18 },
  ];

  for (let d = 1; d <= lastDay; d++) {
    columns.push({ header: String(d), key: `d_${d}`, width: 4.5 });
  }

  columns.push({ header: "Tổng công", key: "total", width: 12 });

  sheet.columns = columns;

  const addMergedLine = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endColIdx: number
  ) => {
    const rowValues = new Array(endColIdx).fill("");
    rowValues[0] = text;
    const row = sheet.addRow(rowValues);
    const n = row.number;
    
    const getColLetter = (idx: number) => {
      let temp = "";
      while (idx > 0) {
        let modulo = (idx - 1) % 26;
        temp = String.fromCharCode(65 + modulo) + temp;
        idx = Math.floor((idx - modulo) / 26);
      }
      return temp;
    };

    sheet.mergeCells(`A${n}:${getColLetter(endColIdx)}${n}`);
    styleRow(row, style);
    return n;
  };

  const totalCols = 4 + lastDay + 1;

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

  // 2. Title Block (merge columns A to D, leaving Column E open for logo)
  const line1 = addMergedLine("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  }, 4);
  sheet.getRow(line1).height = 24;

  const line2 = addMergedLine(`BẢNG CÔNG ĐIỂM DANH CHI TIẾT - THÁNG ${monthNum}/${year}`, {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  }, 4);
  sheet.getRow(line2).height = 32;

  const line3 = addMergedLine(
    `Tổng nhân sự: ${sortedStaff.length} người · Ngày xuất báo cáo: ${new Date().toLocaleDateString("vi-VN")}`,
    {
      font: { size: 10, italic: true, color: { argb: "FF475569" } },
      alignment: { vertical: "middle" },
    },
    4
  );
  sheet.getRow(line3).height = 24;

  // Add the logo in Column E (col: 4) spanning rows 1-3
  if (imageId !== undefined) {
    sheet.addImage(imageId, {
      tl: { col: 4, row: 0 },
      ext: { width: 206, height: 90 },
    });
  }

  sheet.addRow([]);

  // Table Headers
  const headerRowValues = ["Họ tên", "Chi nhánh", "Bộ phận", "Chức vụ"];
  for (let d = 1; d <= lastDay; d++) {
    headerRowValues.push(String(d));
  }
  headerRowValues.push("Số ngày công");

  const tableHeaderRow = sheet.addRow(headerRowValues);
  styleRow(tableHeaderRow, {
    font: { bold: true, size: 10, color: { argb: PRIMARY } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "center" },
  });
  tableHeaderRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
  tableHeaderRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
  tableHeaderRow.getCell(3).alignment = { vertical: "middle", horizontal: "left" };
  tableHeaderRow.getCell(4).alignment = { vertical: "middle", horizontal: "left" };
  tableHeaderRow.height = 24;

  // Add Data Rows
  sortedStaff.forEach((s, idx) => {
    const rowValues = [
      s.full_name,
      s.branch_name || "—",
      s.department || "—",
      s.position || "—",
    ];

    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${month}-${String(d).padStart(2, "0")}`;
      const status = s.attendanceMap[dateStr];
      if (status?.hasReport) {
        rowValues.push("x");
      } else if (status?.absenceReason) {
        rowValues.push("p");
      } else {
        rowValues.push("");
      }
    }

    rowValues.push(String(s.presentCount));

    const dataRow = sheet.addRow(rowValues);
    styleRow(dataRow, {
      font: { size: 10 },
      fill: idx % 2 === 1 ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } } : undefined,
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "center" },
    });

    dataRow.getCell(1).font = { size: 10, bold: true };
    dataRow.getCell(1).alignment = { vertical: "middle", horizontal: "left" };
    dataRow.getCell(2).alignment = { vertical: "middle", horizontal: "left" };
    dataRow.getCell(3).alignment = { vertical: "middle", horizontal: "left" };
    dataRow.getCell(4).alignment = { vertical: "middle", horizontal: "left" };

    for (let d = 1; d <= lastDay; d++) {
      const cell = dataRow.getCell(4 + d);
      if (cell.value === "x") {
        cell.font = { size: 10, bold: true, color: { argb: "FF385723" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRESENT_FILL } };
      } else if (cell.value === "p") {
        cell.font = { size: 10, bold: true, color: { argb: "FFC65911" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABSENT_REASON_FILL } };
      }
    }

    dataRow.getCell(totalCols).font = { size: 10, bold: true, color: { argb: PRIMARY } };
  });

  sheet.addRow([]);
  addMergedLine("Ghi chú ký hiệu:   x = Đi làm (Điểm danh/Có báo cáo)   |   p = Nghỉ phép (Vắng có lý do)   |   Trống = Vắng không báo cáo", {
    font: { italic: true, size: 9, color: { argb: "FF475569" } },
    alignment: { horizontal: "left", vertical: "middle" }
  }, totalCols);

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

type ExportDailyAttendanceOptions = {
  date: string;
  staff: AdminStaffRow[];
  branchFilter: string;
};

export async function downloadDailyAttendanceExcel(filename: string, options: ExportDailyAttendanceOptions) {
  const { date, staff, branchFilter } = options;

  const [year, month, day] = date.split("-");
  const formattedDate = `${day}/${month}/${year}`;

  const filteredStaff = branchFilter === "all" ? staff : staff.filter(s => s.branch_id === branchFilter);
  const sortedStaff = [...filteredStaff].sort((a, b) => a.full_name.localeCompare(b.full_name, "vi"));

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Hatico Manager";
  const sheet = workbook.addWorksheet("Điểm danh ngày", {
    views: [{ showGridLines: true }],
  });

  const columns: Partial<ExcelJS.Column>[] = [
    { header: "Họ tên", key: "name", width: 28 },
    { header: "Chi nhánh", key: "branch", width: 20 },
    { header: "Bộ phận", key: "dept", width: 18 },
    { header: "Chức vụ", key: "pos", width: 20 },
    { header: "Trạng thái", key: "status", width: 25 },
    { header: "Giờ điểm danh", key: "time", width: 16 },
  ];

  sheet.columns = columns;

  const addMergedLine = (
    text: string,
    style: Partial<ExcelJS.Style>,
    endColIdx: number
  ) => {
    const rowValues = new Array(endColIdx).fill("");
    rowValues[0] = text;
    const row = sheet.addRow(rowValues);
    const n = row.number;
    
    const getColLetter = (idx: number) => {
      let temp = "";
      while (idx > 0) {
        let modulo = (idx - 1) % 26;
        temp = String.fromCharCode(65 + modulo) + temp;
        idx = Math.floor((idx - modulo) / 26);
      }
      return temp;
    };

    sheet.mergeCells(`A${n}:${getColLetter(endColIdx)}${n}`);
    styleRow(row, style);
    return n;
  };

  const totalCols = 6;

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

  // 2. Title Block (merge columns A to E, leaving Column F open for logo)
  const line1 = addMergedLine("CÔNG TY CỔ PHẦN XNK QUỐC TẾ HATICO", {
    font: { bold: true, size: 11 },
    alignment: { vertical: "middle" },
  }, 5);
  sheet.getRow(line1).height = 24;

  const line2 = addMergedLine(`BÁO CÁO ĐIỂM DANH HÀNG NGÀY - NGÀY ${formattedDate}`, {
    font: { bold: true, size: 14, color: { argb: PRIMARY } },
    alignment: { vertical: "middle" },
  }, 5);
  sheet.getRow(line2).height = 32;

  const reportedCount = sortedStaff.filter(s => s.hasReport).length;
  const missingCount = sortedStaff.length - reportedCount;

  const line3 = addMergedLine(
    `Tổng nhân sự: ${sortedStaff.length} người · Đi làm: ${reportedCount} · Vắng: ${missingCount}`,
    {
      font: { size: 10, italic: true, color: { argb: "FF475569" } },
      alignment: { vertical: "middle" },
    },
    5
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

  // Table Headers
  const tableHeaderRow = sheet.addRow(["Họ tên", "Chi nhánh", "Bộ phận", "Chức vụ", "Trạng thái", "Giờ điểm danh"]);
  styleRow(tableHeaderRow, {
    font: { bold: true, size: 10, color: { argb: PRIMARY } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } },
    border: thinBorder,
    alignment: { vertical: "middle", horizontal: "left" },
  });
  tableHeaderRow.getCell(5).alignment = { vertical: "middle", horizontal: "left" };
  tableHeaderRow.getCell(6).alignment = { vertical: "middle", horizontal: "center" };
  tableHeaderRow.height = 24;

  // Add Data Rows
  sortedStaff.forEach((s, idx) => {
    let statusText = s.hasReport ? "Đi làm" : "Vắng";
    if (!s.hasReport && s.absence_reason) {
      statusText = `Vắng (Lý do: ${s.absence_reason})`;
    }

    const dataRow = sheet.addRow([
      s.full_name,
      s.branch_name || "—",
      s.department || "—",
      s.position || "—",
      statusText,
      s.check_in_time || "—",
    ]);

    styleRow(dataRow, {
      font: { size: 10 },
      fill: idx % 2 === 1 ? { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } } : undefined,
      border: thinBorder,
      alignment: { vertical: "middle", horizontal: "left" },
    });

    dataRow.getCell(1).font = { size: 10, bold: true };
    dataRow.getCell(5).alignment = { vertical: "middle", horizontal: "left" };
    dataRow.getCell(6).alignment = { vertical: "middle", horizontal: "center" };

    if (s.hasReport) {
      dataRow.getCell(5).font = { size: 10, bold: true, color: { argb: "FF385723" } };
      dataRow.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRESENT_FILL } };
      dataRow.getCell(6).font = { size: 10, bold: true, color: { argb: PRIMARY } };
    } else if (s.absence_reason) {
      dataRow.getCell(5).font = { size: 10, bold: true, color: { argb: "FFC65911" } };
      dataRow.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ABSENT_REASON_FILL } };
    } else {
      dataRow.getCell(5).font = { size: 10, color: { argb: "FFE11D48" } };
    }
  });

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
