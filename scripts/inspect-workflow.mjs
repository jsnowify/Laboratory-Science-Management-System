import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local", quiet: true });
const db = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  const triggers = await db`
    select event_object_table, trigger_name, action_timing, event_manipulation, action_statement
    from information_schema.triggers where trigger_schema = 'public'
    order by event_object_table, trigger_name`;
  for (const row of triggers) console.log(`${row.event_object_table}: ${row.trigger_name} ${row.action_timing} ${row.event_manipulation} ${row.action_statement}`);
  const constraints = await db`
    select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid) as definition
    from pg_constraint where connamespace = 'public'::regnamespace and contype in ('x', 'c')
    order by table_name, conname`;
  for (const row of constraints) console.log(`${row.table_name}: ${row.conname} ${row.definition}`);
  const functions = await db`
    select proname, pg_get_functiondef(p.oid) as definition from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and proname in
      ('validate_borrow_request_status_transition', 'validate_borrow_allocation', 'validate_allocation_status_transition',
       'set_allocation_reservation_period', 'process_return_record', 'validate_return_record')
    order by proname`;
  for (const row of functions) console.log(`\n${row.proname}:\n${row.definition}`);
  const triggerDefs = await db`select tgname, pg_get_triggerdef(t.oid) as definition from pg_trigger t where t.tgrelid='borrow_allocations'::regclass and not t.tgisinternal order by tgname`;
  for (const row of triggerDefs) console.log(`TRIGGER ${row.tgname}: ${row.definition}`);
} finally { await db.end(); }
