"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import {
  type TaskItem,
  type CallReportEntry,
  type CallReportRow,
  type ReportDataItem,
  type CallReportPeriod,
  type MarketingPostEntry,
  type MarketingEventEntry,
  type MarketingPostRow,
  type MarketingEventRow,
  splitReportItems,
  getPeriodStartDate,
  isSalesDepartment,
  isMarketingDepartment,
} from "@/lib/report-data";

// Interface definitions
export interface Branch {
  id: string;
  name: string;
  code: string;
}

export interface Department {
  id: string;
  branch_id: string;
  name: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: "employee" | "department_manager" | "branch_director" | "admin";
  department_id: string;
  avatar_url?: string;
  department?: Department & { branch?: Branch };
}

export interface StaffMember {
  id: number;
  full_name: string;
  position: string | null;
  department: string | null;
  branch_id: string | null;
}
function mapStaffRole(position: string | null): Profile["role"] {
  if (!position) return "employee";
  if (position.toLowerCase().includes("admin")) return "admin";
  return "employee";
}

export interface AdminBranchStat {
  branchId: string;
  branchName: string;
  total: number;
  reported: number;
}

export interface AdminStaffRow {
  id: number;
  full_name: string;
  position: string | null;
  department: string | null;
  branch_id: string | null;
  branch_name: string;
  hasReport: boolean;
  tasks: string[];
  report_id?: string;
  check_in_time?: string;
  absence_reason?: string;
}

export interface AdminDashboardData {
  profile: Profile;
  date: string;
  totalStaff: number;
  reportedCount: number;
  missingCount: number;
  branchStats: AdminBranchStat[];
  staff: AdminStaffRow[];
}

export type {
  TaskItem,
  CallReportEntry,
  CallReportRow,
  ReportDataItem,
  CallReportPeriod,
  MarketingPostEntry,
  MarketingEventEntry,
  MarketingPostRow,
  MarketingEventRow,
} from "@/lib/report-data";

export interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  tasks_data: ReportDataItem[];
  status: "draft" | "submitted" | "approved";
  approved_by?: string;
  feedback?: string;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

// 1. Fetch metadata for the passwordless login page
export async function fetchLoginMetadata() {
  const supabase = createServiceClient();

  const [
    { data: branches, error: bErr },
    { data: departments, error: dErr },
    { data: staff, error: sErr },
  ] = await Promise.all([
    supabase.from("branches").select("*").order("name"),
    supabase.from("departments").select("*").order("name"),
    supabase.from("staff_staging").select("id, full_name, position, department, branch_id").order("full_name"),
  ]);

  if (bErr || dErr || sErr) {
    console.error("Error loading login metadata:", { bErr, dErr, sErr });
    return { branches: [], departments: [], staff: [] };
  }

  return {
    branches: (branches || []) as Branch[],
    departments: (departments || []) as Department[],
    staff: (staff || []) as StaffMember[],
  };
}

// Login via staff_staging selection — auto-provisions auth user + profile
export async function loginWithStaff(
  staffId: number,
  deptType: "Kinh doanh" | "Kỹ thuật"
) {
  const supabase = createServiceClient();

  const { data: staff, error: staffErr } = await supabase
    .from("staff_staging")
    .select("id, full_name, position, department, branch_id")
    .eq("id", staffId)
    .single();

  if (staffErr || !staff) {
    return { error: "Không tìm thấy nhân viên" };
  }

  if (!staff.branch_id) {
    return { error: "Nhân viên chưa được gán chi nhánh trong hệ thống" };
  }

  let { data: dept } = await supabase
    .from("departments")
    .select("id")
    .eq("branch_id", staff.branch_id)
    .eq("name", deptType)
    .maybeSingle();

  if (!dept) {
    const { data: newDept, error: deptErr } = await supabase
      .from("departments")
      .insert({ branch_id: staff.branch_id, name: deptType })
      .select("id")
      .single();

    if (deptErr || !newDept) {
      console.error("Error creating department:", deptErr);
      return { error: "Không thể tạo bộ phận cho chi nhánh" };
    }
    dept = newDept;
  }

  const role = mapStaffRole(staff.position);
  const email = `staff.${staff.id}@hatico.internal`;

  let authUser = null;
  let existingProfile = null;

  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", staff.full_name)
    .maybeSingle();

  if (profileCheck) {
    existingProfile = profileCheck;
    authUser = { id: profileCheck.id };
  } else {
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: "Password123!",
      email_confirm: true,
      user_metadata: { full_name: staff.full_name },
    });

    if (created && created.user) {
      authUser = created.user;
    } else if (createErr && createErr.status === 422) {
      const { data: authList, error: listErr } = await supabase.auth.admin.listUsers({
        perPage: 1000
      });
      if (!listErr && authList) {
        authUser = authList.users.find((u) => u.email === email);
      }
    }

    if (!authUser) {
      console.error("Error creating or retrieving auth user:", createErr);
      return { error: "Không thể xác thực tài khoản" };
    }

    const { data: pCheck } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", authUser.id)
      .maybeSingle();
    existingProfile = pCheck;
  }

  if (existingProfile) {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        full_name: staff.full_name,
        role,
        department_id: dept.id,
      })
      .eq("id", authUser.id);

    if (updateErr) {
      console.error("Error updating profile:", updateErr);
      return { error: "Không thể cập nhật hồ sơ nhân viên" };
    }
  } else {
    const { error: insertErr } = await supabase.from("profiles").insert({
      id: authUser.id,
      full_name: staff.full_name,
      role,
      department_id: dept.id,
    });

    if (insertErr) {
      console.error("Error inserting profile:", insertErr);
      return { error: "Không thể tạo hồ sơ nhân viên" };
    }
  }

  await loginUser(authUser.id, role, staff.full_name);

  return {
    success: true,
    profile: {
      id: authUser.id,
      full_name: staff.full_name,
      role,
    },
  };
}

// Helper to get session from cookies
export async function getSessionUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("hatico_user_id")?.value;
  if (!userId) return null;

  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      department_id,
      departments (
        id,
        name,
        branch_id,
        branches (
          id,
          name,
          code
        )
      )
    `)
    .eq("id", userId)
    .single();

  if (error || !profile) {
    console.error("Error fetching session profile:", error);
    return null;
  }

  // Map nested objects to match interface
  const deptData = profile.departments as unknown as {
    id: string;
    name: string;
    branch_id: string;
    branches: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;
  const mappedProfile: Profile = {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as Profile["role"],
    department_id: profile.department_id,
    department: deptData ? {
      id: deptData.id,
      branch_id: deptData.branch_id,
      name: deptData.name,
      branch: deptData.branches ? {
        id: deptData.branches.id,
        name: deptData.branches.name,
        code: deptData.branches.code
      } : undefined
    } : undefined
  };

  return mappedProfile;
}

// 2. Fetch Dashboard Data based on role
export async function getDashboardData(selectedDate?: string, user?: Profile) {
  const profile = user || await getSessionUser();
  if (!profile) return { error: "Unauthorized" };

  const supabase = createServiceClient();
  const todayStr = selectedDate || new Date().toISOString().split("T")[0];

  if (profile.role === "employee" || profile.role === "admin") {
    const { data: reports, error } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", profile.id)
      .order("report_date", { ascending: false });

    if (error) console.error("Error fetching personal reports:", error);

    const dailyReports = (reports || []) as DailyReport[];
    const callReports = isSalesDepartment(profile.department?.name)
      ? extractCallRows(dailyReports)
      : [];

    return {
      role: profile.role,
      profile,
      reports: dailyReports,
      callReports,
    };
  } else if (profile.role === "department_manager") {
    // Department managers see reports from their department
    // Fetch all profiles in this department
    const { data: deptProfiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, role, department_id")
      .eq("department_id", profile.department_id);

    if (pErr) console.error("Error fetching department profiles:", pErr);

    const employeeIds = (deptProfiles || []).map(p => p.id);

    // Fetch reports for these profiles on the selected date
    const { data: reports, error: rErr } = await supabase
      .from("daily_reports")
      .select("*")
      .in("user_id", employeeIds)
      .eq("report_date", todayStr);

    if (rErr) console.error("Error fetching department reports:", rErr);

    // Map profiles to reports
    const mappedReports = (reports || []).map(r => {
      const repProfile = deptProfiles?.find(p => p.id === r.user_id);
      return {
        ...r,
        profile: repProfile
      };
    });

    return {
      role: "department_manager",
      profile,
      employees: (deptProfiles || []) as Profile[],
      reports: mappedReports as DailyReport[],
      date: todayStr
    };
  } else if (profile.role === "branch_director") {
    // Branch directors see all reports in their branch
    // 1. Get branch ID from the director's own department
    const branchId = profile.department?.branch_id;
    if (!branchId) {
      return { error: "Branch Director department has no branch mapping" };
    }

    // 2. Fetch all departments in this branch
    const { data: branchDepts, error: dErr } = await supabase
      .from("departments")
      .select("id, name")
      .eq("branch_id", branchId);

    if (dErr) console.error("Error fetching branch departments:", dErr);
    const deptIds = (branchDepts || []).map(d => d.id);

    // 3. Fetch all profiles in these departments
    const { data: branchProfiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, role, department_id")
      .in("department_id", deptIds);

    if (pErr) console.error("Error fetching branch profiles:", pErr);
    const employeeIds = (branchProfiles || []).map(p => p.id);

    // 4. Fetch reports for these profiles on the selected date
    const { data: reports, error: rErr } = await supabase
      .from("daily_reports")
      .select("*")
      .in("user_id", employeeIds)
      .eq("report_date", todayStr);

    if (rErr) console.error("Error fetching branch reports:", rErr);

    // Map profiles and departments to reports
    const mappedReports = (reports || []).map(r => {
      const repProfile = branchProfiles?.find(p => p.id === r.user_id);
      const repDept = branchDepts?.find(d => d.id === repProfile?.department_id);
      return {
        ...r,
        profile: repProfile ? {
          ...repProfile,
          department: repDept ? { id: repDept.id, name: repDept.name, branch_id: branchId } : undefined
        } : undefined
      };
    });

    const mappedEmployees = (branchProfiles || []).map(p => {
      const repDept = branchDepts?.find(d => d.id === p.department_id);
      return {
        ...p,
        department: repDept ? { id: repDept.id, name: repDept.name, branch_id: branchId } : undefined
      };
    });

    return {
      role: "branch_director",
      profile,
      employees: mappedEmployees as Profile[],
      reports: mappedReports as DailyReport[],
      date: todayStr
    };
  }

  return { error: "Unknown role" };
}

// Admin dashboard — toàn hệ thống (staff_staging + báo cáo theo ngày)
export async function getAdminDashboardData(selectedDate?: string, user?: Profile) {
  const profile = user || await getSessionUser();
  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const dateStr = selectedDate || new Date().toISOString().split("T")[0];

  const [{ data: branches }, { data: staff }, { data: profiles }, { data: reports }] =
    await Promise.all([
      supabase.from("branches").select("id, name, code").order("name"),
      supabase
        .from("staff_staging")
        .select("id, full_name, position, department, branch_id")
        .order("full_name"),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("daily_reports").select("*").eq("report_date", dateStr),
    ]);

  const branchMap = new Map((branches || []).map((b) => [b.id, b.name]));
  const profileByName = new Map(
    (profiles || []).map((p) => [p.full_name.trim().toLowerCase(), p.id])
  );
  const reportByUserId = new Map(
    (reports || []).map((r) => [r.user_id, r as DailyReport])
  );

  const staffRows: AdminStaffRow[] = (staff || []).map((s) => {
    const profileId = profileByName.get(s.full_name.trim().toLowerCase());
    const report = profileId ? reportByUserId.get(profileId) : undefined;
    const rawTasks = (report?.tasks_data || []) as any[];
    const rawAbsenceTask = rawTasks.find(
      (t) => t.title && typeof t.title === "string" && t.title.toLowerCase().startsWith("nghỉ:")
    );
    const hasReport = !!report && !rawAbsenceTask;
    const absence_reason = rawAbsenceTask ? rawAbsenceTask.title.substring(5).trim() : undefined;

    const tasks = splitReportItems(report?.tasks_data || []).tasks
      .map((t) => t.title)
      .filter(Boolean);

    let check_in_time: string | undefined = undefined;
    if (report?.created_at && hasReport) {
      const d = new Date(report.created_at);
      check_in_time = d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Ho_Chi_Minh",
      });
    }

    return {
      id: s.id,
      full_name: s.full_name,
      position: s.position,
      department: s.department,
      branch_id: s.branch_id,
      branch_name: s.branch_id ? branchMap.get(s.branch_id) || "—" : "—",
      hasReport,
      tasks: hasReport ? tasks : [],
      report_id: report?.id,
      check_in_time,
      absence_reason,
    };
  });

  const branchStatsMap = new Map<string, AdminBranchStat>();
  for (const row of staffRows) {
    const key = row.branch_id || "unknown";
    const name = row.branch_id ? branchMap.get(row.branch_id) || "Khác" : "Chưa gán CN";
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

  const reportedCount = staffRows.filter((s) => s.hasReport).length;

  return {
    profile,
    date: dateStr,
    totalStaff: staffRows.length,
    reportedCount,
    missingCount: staffRows.length - reportedCount,
    branchStats: Array.from(branchStatsMap.values()).sort((a, b) =>
      a.branchName.localeCompare(b.branchName, "vi")
    ),
    staff: staffRows,
  } as AdminDashboardData;
}

function extractCallRows(reports: DailyReport[], period: CallReportPeriod = "all"): CallReportRow[] {
  const startDate = getPeriodStartDate(period);
  const rows: CallReportRow[] = [];

  for (const report of reports) {
    if (startDate && report.report_date < startDate) continue;
    const { calls } = splitReportItems(report.tasks_data || []);
    for (const call of calls) {
      rows.push({
        ...call,
        report_date: report.report_date,
        report_id: report.id,
      });
    }
  }

  return rows.sort((a, b) => b.report_date.localeCompare(a.report_date));
}

// 3. Fetch call reports for sales users
export async function getCallReports(period: CallReportPeriod = "all") {
  const profile = await getSessionUser();
  if (!profile || !isSalesDepartment(profile.department?.name)) {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const startDate = getPeriodStartDate(period);

  let query = supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", profile.id)
    .order("report_date", { ascending: false });

  if (startDate) {
    query = query.gte("report_date", startDate);
  }

  const { data: reports, error } = await query;
  if (error) {
    console.error("Error fetching call reports:", error);
    return { error: error.message };
  }

  return {
    calls: extractCallRows((reports || []) as DailyReport[], period),
    profile,
  };
}

// 4. Save call report entries for a given date
export async function saveCallReports(params: {
  date: string;
  calls: Omit<CallReportEntry, "type">[];
}) {
  const profile = await getSessionUser();
  if (!profile || !isSalesDepartment(profile.department?.name)) {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const callEntries: CallReportEntry[] = params.calls
    .filter((c) => c.customer_name.trim())
    .map((c) => ({
      type: "call" as const,
      customer_name: c.customer_name.trim(),
      phone: c.phone.trim(),
      province: c.province.trim(),
      trailer_type: c.trailer_type.trim(),
      price_quote: c.price_quote.trim(),
      post_call_notes: c.post_call_notes.trim(),
    }));

  const { data: existingReport } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", profile.id)
    .eq("report_date", params.date)
    .maybeSingle();

  const existingNonCalls = ((existingReport?.tasks_data || []) as ReportDataItem[]).filter(
    (item) => item.type !== "call"
  );
  const mergedData: ReportDataItem[] = [...existingNonCalls, ...callEntries];

  if (!existingReport && callEntries.length === 0) {
    return { success: true };
  }

  if (existingReport) {
    const { data, error } = await supabase
      .from("daily_reports")
      .update({
        tasks_data: mergedData,
        updated_at: now,
      })
      .eq("id", existingReport.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating call reports:", error);
      return { error: error.message };
    }
    return { success: true, report: data };
  }

  const { data, error } = await supabase
    .from("daily_reports")
    .insert({
      id: crypto.randomUUID(),
      user_id: profile.id,
      report_date: params.date,
      tasks_data: mergedData,
      status: "submitted",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting call reports:", error);
    return { error: error.message };
  }
  return { success: true, report: data };
}

export async function saveCallReportsBatch(
  entries: { date: string; calls: Omit<CallReportEntry, "type">[] }[]
) {
  for (const entry of entries) {
    const result = await saveCallReports(entry);
    if (result.error) return { error: result.error };
  }
  return { success: true };
}

// 5. Fetch a single report by ID
export async function getReportDetail(reportId: string) {
  const supabase = createServiceClient();
  const { data: report, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !report) {
    console.error("Error fetching report detail:", error);
    return null;
  }

  return report as DailyReport;
}

// 6. Save (create or update) a daily report
export async function saveDailyReport(params: {
  id?: string;
  date: string;
  tasksData: TaskItem[];
  status: "draft" | "submitted";
  userId?: string;
}) {
  const profile = await getSessionUser();
  if (!profile) return { error: "Unauthorized" };

  // Check permission: if saving report for someone else, user must be admin
  let targetUserId = profile.id;
  if (params.userId && params.userId !== profile.id) {
    if (profile.role !== "admin") {
      return { error: "Unauthorized: Only admin can save reports for other users." };
    }
    targetUserId = params.userId;
  }

  const supabase = createServiceClient();
  const reportId = params.id || crypto.randomUUID();

  // Check if a report already exists for this user and date (if no ID was passed)
  let existingId = params.id;
  let existingNonTasks: ReportDataItem[] = [];
  if (!existingId) {
    const { data: existingReport } = await supabase
      .from("daily_reports")
      .select("id, tasks_data")
      .eq("user_id", targetUserId)
      .eq("report_date", params.date)
      .maybeSingle();
    if (existingReport) {
      existingId = existingReport.id;
      existingNonTasks = ((existingReport.tasks_data || []) as ReportDataItem[]).filter(
        (item) => item.type && item.type !== "task"
      );
    }
  } else {
    const { data: existingReport } = await supabase
      .from("daily_reports")
      .select("tasks_data, user_id")
      .eq("id", existingId)
      .single();
    if (existingReport) {
      if (existingReport.user_id !== profile.id && profile.role !== "admin") {
        return { error: "Unauthorized: You do not own this report." };
      }
      existingNonTasks = ((existingReport.tasks_data || []) as ReportDataItem[]).filter(
        (item) => item.type && item.type !== "task"
      );
    }
  }

  const mergedTasksData: ReportDataItem[] = [
    ...params.tasksData.map((t) => ({ ...t, type: "task" as const })),
    ...existingNonTasks,
  ];

  const now = new Date().toISOString();

  if (existingId) {
    // Update existing report
    const { data, error } = await supabase
      .from("daily_reports")
      .update({
        tasks_data: mergedTasksData,
        status: params.status,
        updated_at: now
      })
      .eq("id", existingId)
      .select()
      .single();

    if (error) {
      console.error("Error updating report:", error);
      return { error: error.message };
    }
    revalidatePath("/dashboard");
    return { success: true, report: data };
  } else {
    // Insert new report
    const { data, error } = await supabase
      .from("daily_reports")
      .insert({
        id: reportId,
        user_id: targetUserId,
        report_date: params.date,
        tasks_data: mergedTasksData,
        status: params.status,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting report:", error);
      return { error: error.message };
    }
    revalidatePath("/dashboard");
    return { success: true, report: data };
  }
}

// 7. Fetch a profile by ID (with department & branch)
export async function getProfileById(profileId: string) {
  const supabase = createServiceClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      role,
      department_id,
      departments (
        id,
        name,
        branch_id,
        branches (
          id,
          name,
          code
        )
      )
    `)
    .eq("id", profileId)
    .single();

  if (error || !profile) {
    console.error("Error fetching profile by ID:", error);
    return null;
  }

  const deptData = profile.departments as unknown as {
    id: string;
    name: string;
    branch_id: string;
    branches: {
      id: string;
      name: string;
      code: string;
    } | null;
  } | null;

  const mappedProfile: Profile = {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as Profile["role"],
    department_id: profile.department_id,
    department: deptData ? {
      id: deptData.id,
      branch_id: deptData.branch_id,
      name: deptData.name,
      branch: deptData.branches ? {
        id: deptData.branches.id,
        name: deptData.branches.name,
        code: deptData.branches.code
      } : undefined
    } : undefined
  };

  return mappedProfile;
}

// 8. Fetch a report by user ID and report date
export async function getReportByUserAndDate(userId: string, date: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("report_date", date)
    .maybeSingle();

  if (error) {
    console.error("Error fetching report by user and date:", error);
    return null;
  }
  return data as DailyReport | null;
}

// 9. Auto-provision profile for staff_staging member who hasn't logged in yet
export async function getOrCreateProfileForStaff(staffId: number) {
  const supabase = createServiceClient();

  const { data: staff, error: staffErr } = await supabase
    .from("staff_staging")
    .select("id, full_name, position, department, branch_id")
    .eq("id", staffId)
    .single();

  if (staffErr || !staff) {
    return { error: "Không tìm thấy nhân viên trong dữ liệu staging" };
  }

  // Check if profile exists by full name
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", staff.full_name)
    .maybeSingle();

  if (existingProfile) {
    return { profileId: existingProfile.id };
  }

  if (!staff.branch_id) {
    return { error: "Nhân viên chưa được gán chi nhánh trong hệ thống" };
  }

  const TECH_POSITIONS = new Set(["Kỹ thuật", "NVKT", "Lắp mooc", "GĐKV"]);
  const deptType = TECH_POSITIONS.has(staff.position || "") ? "Kỹ thuật" : "Kinh doanh";

  let { data: dept } = await supabase
    .from("departments")
    .select("id")
    .eq("branch_id", staff.branch_id)
    .eq("name", deptType)
    .maybeSingle();

  if (!dept) {
    const { data: newDept, error: deptErr } = await supabase
      .from("departments")
      .insert({ branch_id: staff.branch_id, name: deptType })
      .select("id")
      .single();

    if (deptErr || !newDept) {
      console.error("Error creating department:", deptErr);
      return { error: "Không thể tạo bộ phận cho chi nhánh" };
    }
    dept = newDept;
  }

  const role = mapStaffRole(staff.position);
  const email = `staff.${staff.id}@hatico.internal`;

  let authUser = null;

  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password: "Password123!",
    email_confirm: true,
    user_metadata: { full_name: staff.full_name },
  });

  if (created && created.user) {
    authUser = created.user;
  } else if (createErr && createErr.status === 422) {
    const { data: authList, error: listErr } = await supabase.auth.admin.listUsers({
      perPage: 1000
    });
    if (!listErr && authList) {
      authUser = authList.users.find((u) => u.email === email);
    }
  }

  if (!authUser) {
    console.error("Error creating or retrieving auth user:", createErr);
    return { error: "Không thể tạo tài khoản xác thực cho nhân viên" };
  }

  const { data: pCheck } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  if (pCheck) {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        full_name: staff.full_name,
        role,
        department_id: dept.id,
      })
      .eq("id", authUser.id);

    if (updateErr) {
      console.error("Error updating profile:", updateErr);
      return { error: "Không thể cập nhật hồ sơ nhân viên" };
    }
    return { profileId: authUser.id };
  } else {
    const { error: insertErr } = await supabase.from("profiles").insert({
      id: authUser.id,
      full_name: staff.full_name,
      role,
      department_id: dept.id,
    });

    if (insertErr) {
      console.error("Error inserting profile:", insertErr);
      return { error: "Không thể tạo hồ sơ nhân viên" };
    }
    return { profileId: authUser.id };
  }
}

// 5. Approve or reject a daily report
export async function approveReport(reportId: string, approve: boolean) {
  const profile = await getSessionUser();
  if (!profile || (profile.role !== "department_manager" && profile.role !== "branch_director")) {
    return { error: "Unauthorized. Only managers can approve reports." };
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("daily_reports")
    .update({
      status: approve ? "approved" : "submitted",
      approved_by: approve ? profile.id : null,
      updated_at: now
    })
    .eq("id", reportId);

  if (error) {
    console.error("Error updating approval status:", error);
    return { error: error.message };
  }

  return { success: true };
}

// 6. Submit feedback and optionally send back to draft (request changes)
export async function submitFeedback(params: {
  reportId: string;
  feedback: string;
  requestChanges: boolean;
}) {
  const profile = await getSessionUser();
  if (!profile || (profile.role !== "department_manager" && profile.role !== "branch_director")) {
    return { error: "Unauthorized. Only managers can submit feedback." };
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const updateFields: {
    feedback: string;
    updated_at: string;
    status?: "draft" | "submitted" | "approved";
  } = {
    feedback: params.feedback,
    updated_at: now
  };

  if (params.requestChanges) {
    updateFields.status = "draft"; // Return to draft so employee can edit
  }

  const { error } = await supabase
    .from("daily_reports")
    .update(updateFields)
    .eq("id", params.reportId);

  if (error) {
    console.error("Error saving feedback:", error);
    return { error: error.message };
  }

  return { success: true };
}

// 7. Clear user session cookies (logout)
export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete("hatico_user_id");
  cookieStore.delete("hatico_user_role");
  cookieStore.delete("hatico_user_name");
  return { success: true };
}

// 8. Set user session cookies (login)
export async function loginUser(profileId: string, role: string, fullName: string) {
  const cookieStore = await cookies();
  cookieStore.set("hatico_user_id", profileId, { path: "/", maxAge: 60 * 60 * 24 * 30 }); // 30 days
  cookieStore.set("hatico_user_role", role, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  cookieStore.set("hatico_user_name", fullName, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  return { success: true };
}

export interface MonthlyAttendanceStaffRow {
  id: number;
  full_name: string;
  position: string | null;
  department: string | null;
  branch_id: string | null;
  branch_name: string;
  attendanceMap: Record<string, { hasReport: boolean; checkInTime?: string; reportId?: string; absenceReason?: string }>;
  presentCount: number;
}

export interface AdminMonthlyAttendanceData {
  month: string;
  staff: MonthlyAttendanceStaffRow[];
  totalStaff: number;
  branches: { id: string; name: string }[];
}

export async function getAdminMonthlyAttendance(monthStr: string) {
  const profile = await getSessionUser();
  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const [year, month] = monthStr.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${monthStr}-01`;
  const end = `${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const [{ data: branches }, { data: staff }, { data: profiles }, { data: reports }] =
    await Promise.all([
      supabase.from("branches").select("id, name").order("name"),
      supabase
        .from("staff_staging")
        .select("id, full_name, position, department, branch_id")
        .order("full_name"),
      supabase.from("profiles").select("id, full_name"),
      supabase
        .from("daily_reports")
        .select("id, user_id, report_date, created_at, tasks_data")
        .gte("report_date", start)
        .lte("report_date", end),
    ]);

  const branchMap = new Map((branches || []).map((b) => [b.id, b.name]));
  const profileByName = new Map(
    (profiles || []).map((p) => [p.full_name.trim().toLowerCase(), p.id])
  );

  const reportsGrouped = new Map<
    string,
    Map<string, { id: string; created_at: string; hasReport: boolean; absenceReason?: string }>
  >();
  
  for (const r of reports || []) {
    const userMap = reportsGrouped.get(r.user_id) || new Map();
    const rawTasks = (r.tasks_data || []) as any[];
    const absenceTask = rawTasks.find(
      (t) => t.title && typeof t.title === "string" && t.title.toLowerCase().startsWith("nghỉ:")
    );
    const hasReport = !absenceTask;
    const absenceReason = absenceTask ? absenceTask.title.substring(5).trim() : undefined;

    userMap.set(r.report_date, {
      id: r.id,
      created_at: r.created_at,
      hasReport,
      absenceReason,
    });
    reportsGrouped.set(r.user_id, userMap);
  }

  const staffRows: MonthlyAttendanceStaffRow[] = (staff || []).map((s) => {
    const profileId = profileByName.get(s.full_name.trim().toLowerCase());
    const userReports = profileId ? reportsGrouped.get(profileId) : undefined;
    
    const attendanceMap: MonthlyAttendanceStaffRow["attendanceMap"] = {};
    let presentCount = 0;

    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
      const dayReport = userReports?.get(dateStr);
      
      const hasReport = !!dayReport?.hasReport;
      const absenceReason = dayReport?.absenceReason;
      let checkInTime: string | undefined = undefined;
      if (dayReport?.created_at && hasReport) {
        const d = new Date(dayReport.created_at);
        checkInTime = d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Ho_Chi_Minh",
        });
      }

      attendanceMap[dateStr] = {
        hasReport,
        checkInTime,
        reportId: dayReport?.id,
        absenceReason,
      };

      if (hasReport) {
        presentCount++;
      }
    }

    return {
      id: s.id,
      full_name: s.full_name,
      position: s.position,
      department: s.department,
      branch_id: s.branch_id,
      branch_name: s.branch_id ? branchMap.get(s.branch_id) || "—" : "—",
      attendanceMap,
      presentCount,
    };
  });

  return {
    month: monthStr,
    staff: staffRows,
    totalStaff: staffRows.length,
    branches: (branches || []).map(b => ({ id: b.id, name: b.name })),
  } as AdminMonthlyAttendanceData;
}

export async function markStaffPresent(staffId: number, date: string) {
  const profile = await getSessionUser();
  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const provisionResult = await getOrCreateProfileForStaff(staffId);
  if ("error" in provisionResult || !provisionResult.profileId) {
    return { error: provisionResult.error || "Không thể khởi tạo hồ sơ cho nhân viên" };
  }
  const targetUserId = provisionResult.profileId;

  return await saveDailyReport({
    date,
    tasksData: [],
    status: "submitted",
    userId: targetUserId,
  });
}

export async function deleteDailyReport(staffId: number, date: string) {
  const profile = await getSessionUser();
  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const { data: staff } = await supabase
    .from("staff_staging")
    .select("full_name")
    .eq("id", staffId)
    .single();

  if (!staff) {
    return { error: "Không tìm thấy nhân viên" };
  }

  const { data: userProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", staff.full_name)
    .maybeSingle();

  if (!userProfile) {
    return { success: true };
  }

  const { error } = await supabase
    .from("daily_reports")
    .delete()
    .eq("user_id", userProfile.id)
    .eq("report_date", date);

  if (error) {
    console.error("Error deleting report:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function markStaffAbsent(staffId: number, date: string, reason?: string) {
  const profile = await getSessionUser();
  if (!profile || profile.role !== "admin") {
    return { error: "Unauthorized" };
  }

  if (!reason || reason.trim() === "") {
    return await deleteDailyReport(staffId, date);
  }

  const provisionResult = await getOrCreateProfileForStaff(staffId);
  if ("error" in provisionResult || !provisionResult.profileId) {
    return { error: provisionResult.error || "Không thể khởi tạo hồ sơ cho nhân viên" };
  }
  const targetUserId = provisionResult.profileId;

  return await saveDailyReport({
    date,
    tasksData: [{ title: `Nghỉ: ${reason.trim()}`, progress: "", status: "completed" }],
    status: "submitted",
    userId: targetUserId,
  });
}

function extractMarketingPostRows(reports: DailyReport[], period: CallReportPeriod = "all"): MarketingPostRow[] {
  const startDate = getPeriodStartDate(period);
  const rows: MarketingPostRow[] = [];

  for (const report of reports) {
    if (startDate && report.report_date < startDate) continue;
    const { marketingPosts } = splitReportItems(report.tasks_data || []);
    for (const post of marketingPosts) {
      rows.push({
        ...post,
        report_date: report.report_date,
        report_id: report.id,
        author_name: report.profile?.full_name,
      });
    }
  }

  return rows.sort((a, b) => b.report_date.localeCompare(a.report_date));
}

function extractMarketingEventRows(reports: DailyReport[], period: CallReportPeriod = "all"): MarketingEventRow[] {
  const startDate = getPeriodStartDate(period);
  const rows: MarketingEventRow[] = [];

  for (const report of reports) {
    if (startDate && report.report_date < startDate) continue;
    const { marketingEvents } = splitReportItems(report.tasks_data || []);
    for (const event of marketingEvents) {
      rows.push({
        ...event,
        report_date: report.report_date,
        report_id: report.id,
        author_name: report.profile?.full_name,
      });
    }
  }

  return rows.sort((a, b) => b.report_date.localeCompare(a.report_date));
}

export async function getMarketingReports(period: CallReportPeriod = "all", userId?: string) {
  const profile = await getSessionUser();
  if (!profile) return { error: "Unauthorized" };

  const isAdmin = profile.role === "admin";
  const isMarketing = isMarketingDepartment(profile.department?.name);

  if (!isAdmin && !isMarketing) {
    return { error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const startDate = getPeriodStartDate(period);

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, department_id, departments(name)");
  
  if (pErr) console.error("Error fetching profiles for marketing report:", pErr);
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  let query = supabase
    .from("daily_reports")
    .select("*")
    .order("report_date", { ascending: false });

  if (!isAdmin) {
    query = query.eq("user_id", profile.id);
  } else if (userId && userId !== "all") {
    query = query.eq("user_id", userId);
  }

  if (startDate) {
    query = query.gte("report_date", startDate);
  }

  const { data: reports, error } = await query;
  if (error) {
    console.error("Error fetching marketing reports:", error);
    return { error: error.message };
  }

  const mappedReports = (reports || []).map(r => {
    const repProfile = profileMap.get(r.user_id);
    const deptName = repProfile?.departments ? (repProfile.departments as any).name : undefined;
    return {
      ...r,
      profile: repProfile ? {
        id: repProfile.id,
        full_name: repProfile.full_name,
        role: "employee" as const,
        department_id: repProfile.department_id,
        department: deptName ? { id: repProfile.department_id, name: deptName, branch_id: "" } : undefined
      } : undefined
    };
  });

  const marketingStaff = (profiles || [])
    .filter(p => {
      const deptName = p.departments ? (p.departments as any).name : "";
      return isMarketingDepartment(deptName);
    })
    .map(p => ({
      id: p.id,
      full_name: p.full_name,
    }));

  return {
    posts: extractMarketingPostRows(mappedReports as DailyReport[], period),
    events: extractMarketingEventRows(mappedReports as DailyReport[], period),
    marketingStaff,
    profile,
  };
}

export async function saveMarketingReports(params: {
  date: string;
  posts: Omit<MarketingPostEntry, "type">[];
  events: Omit<MarketingEventEntry, "type">[];
  userId?: string;
}) {
  const profile = await getSessionUser();
  if (!profile) return { error: "Unauthorized" };

  let targetUserId = profile.id;
  if (params.userId && params.userId !== profile.id) {
    if (profile.role !== "admin") {
      return { error: "Unauthorized" };
    }
    targetUserId = params.userId;
  } else {
    if (profile.role !== "admin" && !isMarketingDepartment(profile.department?.name)) {
      return { error: "Unauthorized" };
    }
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const postEntries: MarketingPostEntry[] = params.posts
    .filter((p) => p.title.trim())
    .map((p) => ({
      type: "marketing_post" as const,
      platform: p.platform,
      title: p.title.trim(),
      link: p.link.trim(),
      views: p.views.trim(),
      likes: p.likes.trim(),
      comments: p.comments.trim(),
      shares: p.shares.trim(),
      status: p.status,
    }));

  const eventEntries: MarketingEventEntry[] = params.events
    .filter((e) => e.event_name.trim())
    .map((e) => ({
      type: "marketing_event" as const,
      event_name: e.event_name.trim(),
      event_date: e.event_date.trim(),
      trailer_type: e.trailer_type?.trim(),
      qty: e.qty?.trim(),
      location: e.location?.trim(),
      budget: e.budget.trim(),
      attendees: e.attendees.trim(),
      outcome: e.outcome.trim(),
      status: e.status,
    }));

  const { data: existingReport } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("report_date", params.date)
    .maybeSingle();

  const existingOtherItems = (existingReport?.tasks_data || [])
    .filter((item: ReportDataItem) => item.type !== "marketing_post" && item.type !== "marketing_event");

  const mergedData: ReportDataItem[] = [...existingOtherItems, ...postEntries, ...eventEntries];

  if (!existingReport && postEntries.length === 0 && eventEntries.length === 0) {
    return { success: true };
  }

  if (existingReport) {
    const { data, error } = await supabase
      .from("daily_reports")
      .update({
        tasks_data: mergedData,
        updated_at: now,
      })
      .eq("id", existingReport.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating marketing reports:", error);
      return { error: error.message };
    }
    return { success: true, report: data };
  }

  const { data, error } = await supabase
    .from("daily_reports")
    .insert({
      id: crypto.randomUUID(),
      user_id: targetUserId,
      report_date: params.date,
      tasks_data: mergedData,
      status: "submitted",
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("Error inserting marketing reports:", error);
    return { error: error.message };
  }
  return { success: true, report: data };
}

export async function saveMarketingReportsBatch(
  entries: {
    date: string;
    posts: Omit<MarketingPostEntry, "type">[];
    events: Omit<MarketingEventEntry, "type">[];
  }[],
  userId?: string
) {
  for (const entry of entries) {
    const result = await saveMarketingReports({
      date: entry.date,
      posts: entry.posts,
      events: entry.events,
      userId,
    });
    if (result.error) return { error: result.error };
  }
  return { success: true };
}
