import type { AdminBranchStat, AdminDashboardData, AdminStaffRow } from "@/app/actions";

export interface StaffAttendanceUpdate {
  staffId: number;
  hasReport: boolean;
  tasks: string[];
  report_id?: string;
  check_in_time?: string;
  absence_reason?: string;
  profile_id?: string;
}

function recomputeBranchStats(staff: AdminStaffRow[]): AdminBranchStat[] {
  const branchStatsMap = new Map<string, AdminBranchStat>();
  for (const row of staff) {
    const key = row.branch_id || "unknown";
    const name = row.branch_name;
    const existing = branchStatsMap.get(key) || {
      branchId: key,
      branchName: name,
      total: 0,
      reported: 0,
    };
    existing.total += 1;
    if (row.hasReport) existing.reported += 1;
    branchStatsMap.set(key, existing);
  }
  return Array.from(branchStatsMap.values()).sort((a, b) =>
    a.branchName.localeCompare(b.branchName, "vi"),
  );
}

export function applyStaffAttendanceUpdate(
  data: AdminDashboardData,
  update: StaffAttendanceUpdate,
): AdminDashboardData {
  const staff = data.staff.map((s) =>
    s.id === update.staffId
      ? {
          ...s,
          hasReport: update.hasReport,
          tasks: update.tasks,
          report_id: update.report_id,
          check_in_time: update.check_in_time,
          absence_reason: update.absence_reason,
          profile_id: update.profile_id ?? s.profile_id,
        }
      : s,
  );
  const reportedCount = staff.filter((s) => s.hasReport).length;

  return {
    ...data,
    staff,
    reportedCount,
    missingCount: staff.length - reportedCount,
    branchStats: recomputeBranchStats(staff),
  };
}

export function attendanceCellKey(staffId: number, dateStr: string): string {
  return `${staffId}:${dateStr}`;
}

export function applyMonthlyAttendanceUpdate(
  data: import("@/app/actions").AdminMonthlyAttendanceData,
  update: StaffAttendanceUpdate,
  dateStr: string,
): import("@/app/actions").AdminMonthlyAttendanceData {
  return {
    ...data,
    staff: data.staff.map((s) => {
      if (s.id !== update.staffId) return s;
      const currentMap = { ...s.attendanceMap };
      const wasPresent = !!currentMap[dateStr]?.hasReport;
      currentMap[dateStr] = {
        hasReport: update.hasReport,
        checkInTime: update.check_in_time,
        reportId: update.report_id,
        absenceReason: update.absence_reason,
      };
      let presentCount = s.presentCount;
      if (wasPresent && !update.hasReport) {
        presentCount = Math.max(0, presentCount - 1);
      } else if (!wasPresent && update.hasReport) {
        presentCount += 1;
      }
      return { ...s, attendanceMap: currentMap, presentCount };
    }),
  };
}
