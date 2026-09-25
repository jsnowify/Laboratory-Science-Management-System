import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AccountProfile } from "@/components/users/account-profile";
import { serverApi, type Profile } from "@/lib/api/server";

export default async function ProfilePage() {
  const profile = await serverApi<Profile>("/api/v1/me/");
  if (profile.accountStatus !== "active") redirect("/pending/");
  if (profile.role === "student_faculty") redirect("/portal/profile/");
  return <DashboardShell profile={profile} title="Your profile"><AccountProfile initial={profile} /></DashboardShell>;
}
