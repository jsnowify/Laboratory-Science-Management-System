import { notFound, redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { serverApi, type Profile } from "@/lib/api/server";

type Lookup = { assetCode: string; equipmentName: string; categoryName: string; departmentName: string | null; currentCondition: string; operationalStatus: string; availabilityStatus: string };

export default async function QrLookupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) notFound();
  const profile = await serverApi<Profile>("/api/v1/me/");
  if (profile.accountStatus !== "active") redirect("/pending/");
  const asset = await serverApi<Lookup>(`/api/v1/equipment/qr/${token}/`);
  return <DashboardShell profile={profile} title={`Equipment ${asset.assetCode}`}>
    <dl className="grid max-w-2xl gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
      {[["Equipment", asset.equipmentName], ["Category", asset.categoryName], ["Department", asset.departmentName ?? "Unassigned"], ["Condition", asset.currentCondition], ["Operational status", asset.operationalStatus], ["Current availability", asset.availabilityStatus]].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-medium capitalize text-slate-900">{label === "Operational status" || label === "Current availability" ? <StatusBadge status={value} /> : value}</dd></div>)}
    </dl>
  </DashboardShell>;
}
