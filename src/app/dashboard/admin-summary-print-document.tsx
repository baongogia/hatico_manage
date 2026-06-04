"use client";

import { useMemo, type CSSProperties } from "react";
import type { AdminStaffRow } from "../actions";

type AdminSummaryPrintDocumentProps = {
  selectedDate: string;
  totalStaff: number;
  reportedCount: number;
  missingCount: number;
  reportRate: number;
  staff: AdminStaffRow[];
  branchFilter: string;
};

function formatDateDisplay(dateString: string) {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

const cellStyle: CSSProperties = {
  border: "1px solid #475569",
  padding: "6px 10px",
  verticalAlign: "top",
  fontSize: "9pt",
  lineHeight: 1.45,
};

const thStyle: CSSProperties = {
  ...cellStyle,
  backgroundColor: "#e2e8f0",
  fontWeight: 700,
  textAlign: "left",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  border: "2px solid #0f2d59",
  marginTop: "8px",
};

export function AdminSummaryPrintDocument({
  selectedDate,
  totalStaff,
  reportedCount,
  missingCount,
  reportRate,
  staff,
  branchFilter,
}: AdminSummaryPrintDocumentProps) {
  const printByBranch = useMemo(() => {
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
  }, [staff, branchFilter]);

  return (
    <div className="admin-print-root">
      <div className="print-header">
        <div>
          <p className="print-company">CÔNG TY CỔ PHẦN XUẤT NHẬP KHẨU HATICO</p>
          <h1 className="print-title">TỔNG HỢP BÁO CÁO — {formatDateDisplay(selectedDate)}</h1>
          <p className="print-summary">
            Tổng nhân sự: {totalStaff} · Đã báo cáo: {reportedCount} · Chưa báo cáo: {missingCount} · Hoàn
            thành: {reportRate}%
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/hatico_logo.png" alt="" width={112} height={112} className="print-logo" />
      </div>

      {printByBranch.map((group, index) => (
        <section key={group.branchName} className={index > 0 ? "print-branch print-branch--spaced" : "print-branch"}>
          <div className="print-branch-banner">
            <span className="print-branch-banner-line" aria-hidden />
            <span className="print-branch-banner-label">--- {group.branchName} ---</span>
            <span className="print-branch-banner-line" aria-hidden />
          </div>
          <p className="print-branch-meta">
            {group.rows.length} nhân sự · Đã báo cáo {group.reported}/{group.rows.length}
          </p>

          <table className="print-table" style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: "26%" }}>Họ tên</th>
                <th style={{ ...thStyle, width: "16%" }}>Trạng thái</th>
                <th style={thStyle}>Việc làm</th>
              </tr>
            </thead>
            <tbody>
              {group.rows.map((s, rowIndex) => (
                <tr
                  key={s.id}
                  style={{ backgroundColor: rowIndex % 2 === 1 ? "#f8fafc" : "#ffffff" }}
                >
                  <td style={{ ...cellStyle, fontWeight: 600 }}>{s.full_name}</td>
                  <td style={cellStyle}>{s.hasReport ? "Đã báo cáo" : "Chưa báo cáo"}</td>
                  <td style={cellStyle}>{s.tasks.length > 0 ? s.tasks.join("; ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
