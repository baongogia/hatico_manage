import { getSessionUser, getReportDetail } from "../../actions";
import { redirect } from "next/navigation";
import ReportForm from "./report-form";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ReportPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  
  if (!user || (user.role !== "employee" && user.role !== "admin")) {
    redirect("/dashboard");
  }

  const resolvedParams = await searchParams;
  const reportId = typeof resolvedParams.id === "string" ? resolvedParams.id : undefined;

  let initialReport = null;
  if (reportId) {
    initialReport = await getReportDetail(reportId);
    // Double check that this report belongs to the current user
    if (initialReport && initialReport.user_id !== user.id) {
      redirect("/dashboard");
    }
  }

  return <ReportForm user={user} initialReport={initialReport} />;
}
