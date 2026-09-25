import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { NotificationList } from "@/components/notifications/notification-list";
import { serverApi, type Profile } from "@/lib/api/server";

export default async function NotificationsPage() {
  const profile = await serverApi<Profile>("/api/v1/me/");
  if (profile.accountStatus !== "active") redirect("/pending/");
  return (
    <DashboardShell profile={profile} title="Notifications">
      <NotificationList role={profile.role} />
    </DashboardShell>
  );
}
