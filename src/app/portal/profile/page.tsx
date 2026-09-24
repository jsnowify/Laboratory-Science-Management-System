import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageRole } from "@/lib/api/server";

export default async function ProfilePage() {
  const profile = await requirePageRole("student_faculty");
  return <DashboardShell profile={profile} title="Your profile"><dl className="grid max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-6 text-sm sm:grid-cols-2">{[["Institutional ID", profile.institutionalId], ["Name", [profile.firstName, profile.middleName, profile.lastName].filter(Boolean).join(" ")], ["Email", profile.email], ["Person type", profile.personType ?? "—"], ["Account status", profile.accountStatus]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{label === "Account status" ? <StatusBadge status={value} /> : value}</dd></div>)}</dl></DashboardShell>;
}
