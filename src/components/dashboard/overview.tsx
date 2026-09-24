import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { serverApi, type Profile } from "@/lib/api/server";

const priorities: Record<Profile["role"], { label: string; href: string; action: string }[]> = {
  super_admin: [
    { label: "Submitted requests", href: "/super-admin/requests/?status=submitted", action: "Review requests" },
    { label: "Ready for release", href: "/super-admin/requests/?status=ready_for_release", action: "View releases" },
    { label: "Overdue assets", href: "/super-admin/overdue/", action: "View overdue" },
  ],
  admin: [
    { label: "Pending accounts", href: "/admin/users/", action: "Review accounts" },
    { label: "Maintenance", href: "/admin/equipment/assets/", action: "View assets" },
    { label: "Damaged", href: "/admin/equipment/assets/", action: "View assets" },
  ],
  student_faculty: [
    { label: "Draft requests", href: "/portal/requests/?status=draft", action: "Continue requests" },
    { label: "Approved requests", href: "/portal/requests/?status=approved", action: "View requests" },
    { label: "Assets in custody", href: "/portal/custody/", action: "View custody" },
  ],
};

export async function Overview({ role, links }: { role: Profile["role"]; links: { label: string; href: string }[] }) {
  const data = await serverApi<{ cards: { label: string; value: number }[] }>("/api/v1/dashboard/");
  const count = new Map(data.cards.map((item) => [item.label, item.value]));
  const attention = new Set(priorities[role].map((item) => item.label));
  const context = data.cards.filter((item) => !attention.has(item.label));
  return <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.8fr)]">
    <section aria-labelledby="attention-heading" className="ui-panel overflow-hidden">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
        <h2 id="attention-heading" className="text-lg font-semibold text-slate-950">Needs your attention</h2>
        <p className="mt-1 text-sm text-slate-600">Open a workflow to review the records and take the next step.</p>
      </div>
      <ul className="divide-y divide-slate-100">{priorities[role].map((item) => {
        const value = count.get(item.label) ?? 0;
        return <li key={item.label}><Link href={item.href} className="group flex min-h-20 items-center gap-4 px-5 py-4 hover:bg-slate-50 sm:px-6">
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${value > 0 ? (item.label === "Overdue assets" || item.label === "Damaged" ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800") : "bg-slate-100 text-slate-500"}`}><ClipboardList size={20} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-900">{item.label}</span><span className="mt-0.5 block text-xs text-slate-600">{value === 0 ? "Nothing waiting right now" : item.action}</span></span>
          <strong className="text-xl tabular-nums text-slate-950">{value}</strong><ArrowRight size={17} className="shrink-0 text-slate-400 group-hover:text-green-800" aria-hidden="true" />
        </Link></li>;
      })}</ul>
    </section>
    <div className="space-y-7">
      <section aria-labelledby="snapshot-heading"><h2 id="snapshot-heading" className="text-lg font-semibold text-slate-950">At a glance</h2><dl className="mt-3 divide-y divide-slate-200 border-y border-slate-200">{context.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 py-3 text-sm"><dt className="text-slate-600">{item.label}</dt><dd className="font-semibold tabular-nums text-slate-900">{item.value}</dd></div>)}</dl></section>
      <section aria-labelledby="quick-links-heading"><h2 id="quick-links-heading" className="text-lg font-semibold text-slate-950">Quick actions</h2><div className="mt-3 flex flex-wrap gap-2">{links.map((link) => <Link key={link.href} href={link.href} className="ui-button-secondary inline-flex items-center">{link.label}</Link>)}</div></section>
    </div>
  </div>;
}
