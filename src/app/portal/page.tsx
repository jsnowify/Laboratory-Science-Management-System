import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Overview } from "@/components/dashboard/overview";
import { requirePageRole } from "@/lib/api/server";

export default async function PortalPage() {
  const profile = await requirePageRole("student_faculty");
  return <DashboardShell profile={profile} title="Your laboratory portal"><Overview role="student_faculty" links={[{ label: "Browse equipment", href: "/portal/equipment/" }, { label: "New request", href: "/portal/requests/new/" }, { label: "Current custody", href: "/portal/custody/" }]} /></DashboardShell>;
}
