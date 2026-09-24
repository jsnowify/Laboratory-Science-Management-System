import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { requireActiveProfile } from "../../auth/authorize";
import { database } from "../../db";

type CountRow = { label: string; value: number };

export async function dashboardRoutes(app: FastifyInstance) {
  app.get("/api/v1/dashboard/", async (request) => {
    const actor = await requireActiveProfile(request);
    if (actor.role === "super_admin") {
      const [requests, custody, overdue, returns] = await Promise.all([
        database().execute(sql`select status::text as status, count(*)::int as total from borrow_requests group by status`),
        database().execute(sql`select count(*)::int as total from vw_current_custody`),
        database().execute(sql`select count(*)::int as total from vw_overdue_loans`),
        database().execute(sql`select count(*)::int as total from return_records where returned_at > now() - interval '7 days'`),
      ]);
      const countStatus = (status: string) => Number(requests.find((row) => row.status === status)?.total ?? 0);
      return { cards: [
        { label: "Submitted requests", value: countStatus("submitted") }, { label: "Under review", value: countStatus("under_review") },
        { label: "Ready for release", value: countStatus("ready_for_release") }, { label: "Borrowed assets", value: Number(custody[0].total) },
        { label: "Overdue assets", value: Number(overdue[0].total) }, { label: "Returns this week", value: Number(returns[0].total) },
      ] satisfies CountRow[] };
    }
    if (actor.role === "admin") {
      const [assets, pending, usage] = await Promise.all([
        database().execute(sql`select availability_status, count(*)::int as total from vw_equipment_asset_availability group by availability_status`),
        database().execute(sql`select count(*)::int as total from users where account_status = 'pending'`),
        database().execute(sql`select coalesce(sum(total_borrow_count), 0)::int as total from vw_equipment_usage`),
      ]);
      const countState = (state: string) => Number(assets.find((row) => row.availability_status === state)?.total ?? 0);
      return { cards: [
        { label: "Physical assets", value: assets.reduce((sum, row) => sum + Number(row.total), 0) },
        { label: "Available", value: countState("available") }, { label: "Borrowed", value: countState("borrowed") },
        { label: "Maintenance", value: countState("maintenance") }, { label: "Damaged", value: countState("damaged") },
        { label: "Pending accounts", value: Number(pending[0].total) }, { label: "Recorded asset uses", value: Number(usage[0].total) },
      ] satisfies CountRow[] };
    }
    const [requests, custody, notifications] = await Promise.all([
      database().execute(sql`select status::text as status, count(*)::int as total from borrow_requests where borrower_id = ${actor.id}::uuid group by status`),
      database().execute(sql`select count(*)::int as total from vw_current_custody where borrower_id = ${actor.id}::uuid`),
      database().execute(sql`select count(*)::int as total from notifications where user_id = ${actor.id}::uuid and read_at is null`),
    ]);
    const countStatus = (status: string) => Number(requests.find((row) => row.status === status)?.total ?? 0);
    return { cards: [
      { label: "Draft requests", value: countStatus("draft") }, { label: "Submitted requests", value: countStatus("submitted") },
      { label: "Approved requests", value: countStatus("approved") }, { label: "Assets in custody", value: Number(custody[0].total) },
      { label: "Unread notifications", value: Number(notifications[0].total) },
    ] satisfies CountRow[] };
  });
}
