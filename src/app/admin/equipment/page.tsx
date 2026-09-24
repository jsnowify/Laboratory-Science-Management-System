import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { requirePageRole } from "@/lib/api/server";

export default async function EquipmentPage() {
  const profile = await requirePageRole("admin");
  return <DashboardShell profile={profile} title="Equipment inventory"><div className="grid gap-4 sm:grid-cols-3">{[["Categories", "/admin/equipment/categories/", "Group related equipment."], ["Catalog", "/admin/equipment/catalog/", "Manage equipment types."], ["Assets", "/admin/equipment/assets/", "Track each physical unit and its QR code."]].map(([title, href, text]) => <Link key={href} href={href} className="rounded-xl border border-slate-200 bg-white p-6 hover:border-green-300"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm text-slate-600">{text}</p></Link>)}</div></DashboardShell>;
}
