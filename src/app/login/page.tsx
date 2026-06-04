import { fetchLoginMetadata } from "../actions";
import LoginForm from "./login-form";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  // If already logged in, redirect directly to dashboard
  const cookieStore = await cookies();
  const userId = cookieStore.get("hatico_user_id")?.value;
  if (userId) {
    redirect("/dashboard");
  }

  const metadata = await fetchLoginMetadata();
  return <LoginForm {...metadata} />;
}
