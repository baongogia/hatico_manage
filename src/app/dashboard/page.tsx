import { getSessionUser, getDashboardData, getAdminDashboardData } from "../actions";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  const resolvedParams = await searchParams;
  const dateStr = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;
  const notice = typeof resolvedParams.notice === "string" ? resolvedParams.notice : undefined;

  const data = await getDashboardData(dateStr);
  if ("error" in data) {
    console.error("Dashboard data load error:", data.error);
    redirect("/login");
  }

  const adminView =
    data.role === "admin" && resolvedParams.view === "summary" ? "summary" : "personal";

  let initialAdminData = null;
  if (adminView === "summary") {
    const adminData = await getAdminDashboardData(dateStr);
    if (!("error" in adminData)) {
      initialAdminData = adminData;
    }
  }

  return (
    <DashboardClient
      initialData={data}
      initialAdminView={adminView}
      initialAdminData={initialAdminData}
      notice={notice}
    />
  );
}
