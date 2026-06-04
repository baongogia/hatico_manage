import { getSessionUser } from "../../actions";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/** Giữ URL cũ — chuyển sang dashboard client-side (mượt hơn). */
export default async function AdminPage({ searchParams }: PageProps) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const resolvedParams = await searchParams;
  const dateStr = typeof resolvedParams.date === "string" ? resolvedParams.date : undefined;
  const qs = new URLSearchParams({ view: "summary" });
  if (dateStr) qs.set("date", dateStr);

  redirect(`/dashboard?${qs.toString()}`);
}
