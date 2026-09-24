import { DashboardShell } from "@/components/layout/dashboard-shell";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { serverApi, type Profile } from "@/lib/api/server";
import { redirect } from "next/navigation";

export default async function ChangePasswordPage() {
  const profile = await serverApi<Profile>("/api/v1/me/");
  if (profile.accountStatus !== "active") redirect("/pending/");
  return <DashboardShell profile={profile} title="Change password">
    <ChangePasswordForm />
  </DashboardShell>;
}
