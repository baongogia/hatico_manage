import { getSessionUser, getAdminDashboardData } from "../../actions";
import { redirect } from "next/navigation";
import AdminDashboardClient from "../admin-dashboard-client";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const resolvedParams = await searchParams;
  const dateStr = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;

  const data = await getAdminDashboardData(dateStr);
  if ("error" in data) {
    console.error("Admin dashboard error:", data.error);
    redirect("/dashboard");
  }

  return <AdminDashboardClient initialData={data} />;
}
