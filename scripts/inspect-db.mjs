import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const tables = await sql`select tablename from pg_tables where schemaname = 'public' order by tablename`;
  const counts = await sql`select count(*)::int as users from users`;
  console.log(`Tables: ${tables.map((table) => table.tablename).join(", ")}`);
  console.log(`Institutional profiles: ${counts[0].users}`);
} finally {
  await sql.end();
}
