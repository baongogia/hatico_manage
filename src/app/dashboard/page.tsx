import { getSessionUser, getDashboardData } from "../actions";
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
  if (user.role === "admin") {
    redirect("/dashboard/admin");
  }

  const resolvedParams = await searchParams;
  const dateStr = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;
  const notice = typeof resolvedParams.notice === "string" ? resolvedParams.notice : undefined;

  const data = await getDashboardData(dateStr);
  if ("error" in data) {
    console.error("Dashboard data load error:", data.error);
    redirect("/login");
  }

  return <DashboardClient initialData={data} notice={notice} />;
}
