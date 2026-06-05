import {
  getSessionUser,
  getReportDetail,
  getProfileById,
  getReportByUserAndDate,
  getOrCreateProfileForStaff,
} from "../../actions";
import { redirect } from "next/navigation";
import ReportForm from "./report-form";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ReportPage({ searchParams }: PageProps) {
  const sessionUser = await getSessionUser();
  
  if (!sessionUser || (sessionUser.role !== "employee" && sessionUser.role !== "admin")) {
    redirect("/dashboard");
  }

  const resolvedParams = await searchParams;
  const reportId = typeof resolvedParams.id === "string" ? resolvedParams.id : undefined;
  const targetUserId = typeof resolvedParams.userId === "string" ? resolvedParams.userId : undefined;
  const staffIdParam = typeof resolvedParams.staffId === "string" ? resolvedParams.staffId : undefined;
  const dateParam = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;

  let initialReport = null;
  let targetUser = sessionUser; // Default to logged-in user

  if (reportId) {
    initialReport = await getReportDetail(reportId);
    if (!initialReport) {
      redirect("/dashboard");
    }

    // Double check ownership
    if (initialReport.user_id !== sessionUser.id) {
      // If it belongs to someone else, only admin can view/edit it
      if (sessionUser.role !== "admin") {
        redirect("/dashboard");
      }
      // Load target user profile
      const loadedProfile = await getProfileById(initialReport.user_id);
      if (!loadedProfile) {
        redirect("/dashboard");
      }
      targetUser = loadedProfile;
    }
  } else {
    // Determine the target user profile for creating a new report
    let actualTargetUserId = targetUserId;

    if (staffIdParam) {
      const staffIdNum = parseInt(staffIdParam, 10);
      if (!isNaN(staffIdNum)) {
        if (sessionUser.role !== "admin") {
          redirect("/dashboard");
        }
        const provisionResult = await getOrCreateProfileForStaff(staffIdNum);
        if ("error" in provisionResult || !provisionResult.profileId) {
          console.error("Profile provisioning error:", provisionResult.error);
          redirect("/dashboard");
        }
        actualTargetUserId = provisionResult.profileId;
      }
    }

    if (actualTargetUserId && actualTargetUserId !== sessionUser.id) {
      if (sessionUser.role !== "admin") {
        redirect("/dashboard");
      }
      const loadedProfile = await getProfileById(actualTargetUserId);
      if (!loadedProfile) {
        redirect("/dashboard");
      }
      targetUser = loadedProfile;

      // If a report already exists for this target user on the selected date, edit it instead!
      if (dateParam) {
        const existingReport = await getReportByUserAndDate(actualTargetUserId, dateParam);
        if (existingReport) {
          redirect(`/dashboard/report?id=${existingReport.id}`);
        }
      }
    }
  }

  return (
    <ReportForm
      user={targetUser}
      initialReport={initialReport}
      initialDate={dateParam}
      isAdmin={sessionUser.role === "admin"}
    />
  );
}
