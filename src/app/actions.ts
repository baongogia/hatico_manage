"use server";

import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

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
  role: "employee" | "department_manager" | "branch_director";
  department_id: string;
  avatar_url?: string;
  department?: Department & { branch?: Branch };
}

export interface TaskItem {
  title: string;
  progress: string;
  status: "completed" | "in_progress" | "pending";
}

export interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  tasks_data: TaskItem[];
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

  const { data: branches, error: bErr } = await supabase
    .from("branches")
    .select("*")
    .order("name");
  
  const { data: departments, error: dErr } = await supabase
    .from("departments")
    .select("*")
    .order("name");

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, full_name, role, department_id")
    .order("full_name");

  if (bErr || dErr || pErr) {
    console.error("Error loading login metadata:", { bErr, dErr, pErr });
    return { branches: [], departments: [], profiles: [] };
  }

  return {
    branches: (branches || []) as Branch[],
    departments: (departments || []) as Department[],
    profiles: (profiles || []) as Profile[],
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
  const deptData = profile.departments as any;
  const mappedProfile: Profile = {
    id: profile.id,
    full_name: profile.full_name,
    role: profile.role as any,
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
export async function getDashboardData(selectedDate?: string) {
  const profile = await getSessionUser();
  if (!profile) return { error: "Unauthorized" };

  const supabase = createServiceClient();
  const todayStr = selectedDate || new Date().toISOString().split("T")[0];

  if (profile.role === "employee") {
    // Employees see all their reports
    const { data: reports, error } = await supabase
      .from("daily_reports")
      .select("*")
      .eq("user_id", profile.id)
      .order("report_date", { ascending: false });

    if (error) console.error("Error fetching employee reports:", error);

    return {
      role: "employee",
      profile,
      reports: (reports || []) as DailyReport[],
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

// 3. Fetch a single report by ID
export async function getReportDetail(reportId: string) {
  const supabase = createServiceClient();
  const { data: report, error } = await supabase
    .from("daily_reports")
    .select(`
      *,
      profiles (
        id,
        full_name,
        role,
        department_id,
        departments (
          id,
          name
        )
      )
    `)
    .eq("id", reportId)
    .single();

  if (error || !report) {
    console.error("Error fetching report detail:", error);
    return null;
  }

  const prof = report.profiles as any;
  const mappedProfile: Profile | undefined = prof ? {
    id: prof.id,
    full_name: prof.full_name,
    role: prof.role,
    department_id: prof.department_id,
    department: prof.departments ? {
      id: prof.departments.id,
      name: prof.departments.name,
      branch_id: ""
    } : undefined
  } : undefined;

  return {
    ...report,
    profile: mappedProfile
  } as DailyReport;
}

// 4. Save (create or update) a daily report
export async function saveDailyReport(params: {
  id?: string;
  date: string;
  tasksData: TaskItem[];
  status: "draft" | "submitted";
}) {
  const profile = await getSessionUser();
  if (!profile) return { error: "Unauthorized" };

  const supabase = createServiceClient();
  const reportId = params.id || crypto.randomUUID();

  // Check if a report already exists for this user and date (if no ID was passed)
  let existingId = params.id;
  if (!existingId) {
    const { data: existingReport } = await supabase
      .from("daily_reports")
      .select("id")
      .eq("user_id", profile.id)
      .eq("report_date", params.date)
      .single();
    if (existingReport) {
      existingId = existingReport.id;
    }
  }

  const now = new Date().toISOString();

  if (existingId) {
    // Update existing report
    const { data, error } = await supabase
      .from("daily_reports")
      .update({
        tasks_data: params.tasksData,
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
    return { success: true, report: data };
  } else {
    // Insert new report
    const { data, error } = await supabase
      .from("daily_reports")
      .insert({
        id: reportId,
        user_id: profile.id,
        report_date: params.date,
        tasks_data: params.tasksData,
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
    return { success: true, report: data };
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

  const updateFields: any = {
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
