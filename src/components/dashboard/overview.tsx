import Link from "next/link";
import { ArrowRight, ClipboardList } from "lucide-react";
import { serverApi, type Profile } from "@/lib/api/server";
import { auditActionLabel, auditRoleLabel } from "@/lib/audit-presentation";

const priorities: Record<
  Profile["role"],
  { label: string; href: string; action: string }[]
> = {
  super_admin: [
    {
      label: "Submitted requests",
      href: "/super-admin/requests/?status=submitted",
      action: "Review requests",
    },
    {
      label: "Ready for release",
      href: "/super-admin/requests/?status=ready_for_release",
      action: "View releases",
    },
    {
      label: "Overdue assets",
      href: "/super-admin/overdue/",
      action: "View overdue",
    },
  ],
  admin: [
    {
      label: "Pending accounts",
      href: "/admin/users/",
      action: "Review accounts",
    },
    {
      label: "Maintenance",
      href: "/admin/equipment/assets/",
      action: "View assets",
    },
    {
      label: "Damaged",
      href: "/admin/equipment/assets/",
      action: "View assets",
    },
  ],
  student_faculty: [
    {
      label: "Draft requests",
      href: "/portal/requests/?status=draft",
      action: "Continue requests",
    },
    {
      label: "Approved requests",
      href: "/portal/requests/?status=approved",
      action: "View requests",
    },
    {
      label: "Assets in custody",
      href: "/portal/custody/",
      action: "View custody",
    },
  ],
};

export async function Overview({
  role,
  links,
}: {
  role: Profile["role"];
  links: { label: string; href: string }[];
}) {
  const data = await serverApi<{
    cards: { label: string; value: number }[];
    audit?: {
      total: number;
      adminTotal: number;
      recent: {
        id: string;
        action: string;
        entityType: string;
        createdAt: string;
        firstName: string | null;
        lastName: string | null;
        actorRole: string | null;
      }[];
    };
  }>("/api/v1/dashboard/");
  const count = new Map(data.cards.map((item) => [item.label, item.value]));
  const attention = new Set(priorities[role].map((item) => item.label));
  const context = data.cards.filter((item) => !attention.has(item.label));
  return (
    <div className="space-y-7">
      <section aria-labelledby="attention-heading">
        <h2
          id="attention-heading"
          className="mb-5 font-[Georgia,serif] text-[30px] tracking-[-.05em] text-[#1c3929] sm:text-[36px]"
        >
          Needs your attention
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {priorities[role].map((item, index) => {
            const value = count.get(item.label) ?? 0;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex min-h-[200px] flex-col rounded-[15px] border border-[#e1eae0] bg-white p-6 shadow-[0_12px_40px_rgba(28,62,38,.045)] transition-colors hover:border-[#b7cdb4] hover:bg-[#fbfdf9]"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-[#eaf3e8] text-[#3b7650]">
                    <ClipboardList size={21} aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold tracking-[.16em] text-[#526b58]">
                    0{index + 1}
                  </span>
                </div>
                <strong className="mt-5 font-[Georgia,serif] text-[40px] font-normal leading-none tracking-[-.06em] text-[#1c3d2c] tabular-nums">
                  {value}
                </strong>
                <span className="mt-2 text-sm font-semibold text-[#355540]">
                  {item.label}
                </span>
                <span className="mt-auto flex items-center gap-2 pt-5 text-xs font-semibold text-[#356744]">
                  {value === 0 ? "Nothing waiting right now" : item.action}
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section
          aria-labelledby="snapshot-heading"
          className="rounded-[15px] border border-[#e1eae0] bg-white p-6 shadow-sm sm:p-7"
        >
          <h2
            id="snapshot-heading"
            className="mt-2 font-[Georgia,serif] text-[28px] tracking-[-.05em] text-[#1c3929]"
          >
            At a glance
          </h2>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {context.map((item) => (
              <div key={item.label} className="rounded-xl bg-[#f5f8f4] p-4">
                <dt className="text-xs font-medium text-[#4b6251]">
                  {item.label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold tabular-nums text-[#254333]">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section
          aria-labelledby="quick-links-heading"
          className="rounded-[15px] border border-[#e1eae0] bg-white p-6 shadow-sm sm:p-7"
        >
          <h2
            id="quick-links-heading"
            className="mt-2 font-[Georgia,serif] text-[28px] tracking-[-.05em] text-[#1c3929]"
          >
            Quick actions
          </h2>
          <div className="mt-5 grid gap-2.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-[#e0eae0] px-4 text-sm font-semibold text-[#355742] hover:bg-[#f5f9f4]"
              >
                {link.label}
                <ArrowRight
                  size={17}
                  className="shrink-0 text-[#679276]"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </section>
      </div>
      {role === "super_admin" && data.audit && (
        <section
          aria-labelledby="activity-heading"
          className="rounded-[15px] border border-[#e1eae0] bg-white p-6 shadow-sm sm:p-7"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="activity-heading"
                className="font-[Georgia,serif] text-[28px] tracking-[-.05em] text-[#1c3929]"
              >
                Recent system activity
              </h2>
              <p className="mt-1 text-sm text-[#526b59]">
                {data.audit.total} recorded actions · {data.audit.adminTotal} by
                Admin accounts
              </p>
            </div>
            <Link href="/super-admin/audit/" className="ui-button-secondary">
              View full audit log <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {data.audit.recent.length ? (
            <ol className="mt-5 divide-y divide-[#e9eee7]">
              {data.audit.recent.map((event) => (
                <li
                  key={event.id}
                  className="flex flex-wrap justify-between gap-x-5 gap-y-1 py-3 text-sm"
                >
                  <span>
                    <strong className="text-[#263d2b]">
                      {event.firstName && event.lastName
                        ? `${event.firstName} ${event.lastName}`
                        : "System"}
                    </strong>{" "}
                    <span className="text-[#5b6f5e]">
                      ({auditRoleLabel(event.actorRole)})
                    </span>{" "}
                    · {auditActionLabel(event.action)}
                  </span>
                  <time className="text-[#617166]" dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleString()}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 rounded-xl bg-[#f6f9f4] p-5 text-sm text-[#526b59]">
              No activity has been recorded yet.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
