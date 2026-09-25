import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { listQuery } from "@lsms/shared";
import { requireActiveProfile, requirePermission } from "../../auth/authorize";
import { database } from "../../db";
import { AppError } from "../../lib/errors";

const analyticsViews = {
  "borrowing-trends": "vw_borrowing_trends_monthly",
  "equipment-usage": "vw_equipment_usage",
  "inventory-utilization": "vw_inventory_utilization",
  "user-frequency": "vw_user_borrowing_frequency",
  "college-frequency": "vw_college_borrowing_frequency",
  "course-frequency": "vw_course_borrowing_frequency",
  "peak-periods": "vw_peak_borrowing_periods",
  "inventory-overview": "vw_equipment_inventory_summary",
} as const;

const reports = {
  inventory: { source: "vw_equipment_inventory_summary", roles: ["admin"] },
  "borrowing-history": {
    source:
      "(select br.request_number, br.status, br.purpose, br.requested_borrow_at, br.requested_due_at, u.institutional_id from borrow_requests br join users u on u.id = br.borrower_id) as report",
    roles: ["admin", "super_admin"],
  },
  "equipment-usage": { source: "vw_equipment_usage", roles: ["admin"] },
  utilization: { source: "vw_inventory_utilization", roles: ["admin"] },
  "borrowing-frequency": {
    source: "vw_user_borrowing_frequency",
    roles: ["admin"],
  },
  custody: { source: "vw_current_custody", roles: ["super_admin"] },
  overdue: { source: "vw_overdue_loans", roles: ["super_admin"] },
  accountability: {
    source: "vw_accountability_records",
    roles: ["admin", "super_admin"],
  },
} as const;

function csvCell(value: unknown) {
  const raw =
    value === null || value === undefined
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : String(value);
  const safe = /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/api/v1/analytics/:key/", async (request) => {
    await requirePermission(request, "analytics.read");
    const key = z
      .enum(
        Object.keys(analyticsViews) as [
          keyof typeof analyticsViews,
          ...(keyof typeof analyticsViews)[],
        ],
      )
      .parse((request.params as { key: string }).key);
    const { page, limit } = listQuery.parse(request.query);
    const view = sql.raw(analyticsViews[key]);
    const [data, totals] = await Promise.all([
      database().execute(
        sql`select * from ${view} limit ${limit} offset ${(page - 1) * limit}`,
      ),
      database().execute(sql`select count(*)::int as total from ${view}`),
    ]);
    return {
      data: Array.from(data),
      total: Number(totals[0].total),
      page,
      limit,
    };
  });

  app.get("/api/v1/reports/:key/", async (request) => {
    const actor = await requireActiveProfile(request);
    const key = z
      .enum(
        Object.keys(reports) as [
          keyof typeof reports,
          ...(keyof typeof reports)[],
        ],
      )
      .parse((request.params as { key: string }).key);
    if (!(reports[key].roles as readonly string[]).includes(actor.role))
      throw new AppError(
        403,
        "FORBIDDEN",
        "This report is not available to your role.",
      );
    const { page, limit } = listQuery.parse(request.query);
    const source = sql.raw(reports[key].source);
    const [data, totals] = await Promise.all([
      database().execute(
        sql`select * from ${source} limit ${limit} offset ${(page - 1) * limit}`,
      ),
      database().execute(sql`select count(*)::int as total from ${source}`),
    ]);
    return {
      data: Array.from(data),
      total: Number(totals[0].total),
      page,
      limit,
    };
  });

  app.get("/api/v1/reports/:key/csv/", async (request, reply) => {
    const actor = await requireActiveProfile(request);
    const key = z
      .enum(
        Object.keys(reports) as [
          keyof typeof reports,
          ...(keyof typeof reports)[],
        ],
      )
      .parse((request.params as { key: string }).key);
    if (!(reports[key].roles as readonly string[]).includes(actor.role))
      throw new AppError(
        403,
        "FORBIDDEN",
        "This report is not available to your role.",
      );
    const rows = await database().execute(
      sql`select * from ${sql.raw(reports[key].source)} limit 10000`,
    );
    const data = Array.from(rows) as Record<string, unknown>[];
    const columns = data.length ? Object.keys(data[0]) : [];
    const csv = [
      columns.map(csvCell).join(","),
      ...data.map((row) =>
        columns.map((column) => csvCell(row[column])).join(","),
      ),
    ].join("\r\n");
    reply.header(
      "Content-Disposition",
      `attachment; filename="lsms-${key}.csv"`,
    );
    reply.header("X-Export-Limit", "10000");
    return reply.type("text/csv; charset=utf-8").send(`\ufeff${csv}`);
  });
}
