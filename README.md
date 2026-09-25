# LSMS

Laboratory Science Management System. It manages institutional accounts, organization data, equipment, borrowing and custody, returns, ISO requisition records, notifications, and reports.

## Architecture

| Layer | Location | Runtime |
| --- | --- | --- |
| Web application | Repository root (`src/app`, `src/components`) | Next.js 16 on Vercel |
| API and business rules | `apps/api` | Fastify on Render |
| Shared validation and permissions | `packages/shared` | Both applications |
| Data | Existing PostgreSQL database `lsms` | Local PostgreSQL for development; managed PostgreSQL for production |

The existing Next.js project remains at the repository root to preserve its configuration and UI. npm workspaces link the API and shared package. Browsers call same-origin `/api/*` paths on Next.js; `next.config.ts` rewrites them to Fastify. Only Fastify accesses PostgreSQL. The API uses Drizzle mappings introspected from the existing database, and the database retains final authority for constraints and workflow triggers. Existing analytics views are read only.

## Prerequisites and configuration

- Node.js 24 or newer, npm, and access to the existing PostgreSQL `lsms` database.
- Copy `.env.example` to `.env.local` at the repository root, then provide real secrets. `.env.local` is ignored by Git.
- The backend needs permission to read and write the existing LSMS tables and, after review, the four Better Auth tables.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API | PostgreSQL connection to `lsms` |
| `BETTER_AUTH_SECRET` | API | Random secret, at least 32 characters |
| `BETTER_AUTH_URL` | API | Public API origin, such as `http://localhost:4000` |
| `FRONTEND_URL` | API | Public Next.js origin, such as `http://localhost:3000` |
| `INITIAL_SETUP_TOKEN` | API | Private first Super Admin setup token, at least 24 characters |
| `PORT` | API | Listening port, default `4000` |
| `NODE_ENV` | API | `development`, `test`, or `production` |
| `API_INTERNAL_URL` | Next.js | URL Next.js uses to reach Fastify, default `http://localhost:4000` |
| `NEXT_PUBLIC_APP_URL` | Next.js | Public web origin |
| `ISO_STORAGE_DIR` | API | Optional local PDF directory; default `.storage` relative to API working directory |

The browser API client uses the Next.js origin and sends credentials. `NEXT_PUBLIC_API_URL` is not needed for this same-origin setup. Do not use a local database URL in Render.

## Local development

Install dependencies and run each server in a separate terminal from the repository root:

```sh
npm install
npm run dev:api
npm run dev
```

Open `http://localhost:3000/`. Fastify listens at `http://localhost:4000/health/`. LSMS page and REST resource URLs end in `/`; Next.js redirects page URLs without it. Better Auth's `/api/auth/*` callback paths keep their library format.

To inspect the existing database again, run `npm run db:pull`. It writes to ignored `.drizzle-introspection/` so the curated mappings in `apps/api/src/db/introspected/` are not overwritten. Do not run `drizzle-kit push` against `lsms`.

### Authentication and first setup

Review `apps/api/migrations/0001_better_auth_tables.sql` with the database owner before applying it. **It has not been applied by this project.** The additive SQL creates `auth_users`, `auth_sessions`, `auth_accounts`, and `auth_verifications`; it does not change the existing LSMS tables. Registration, login, and setup require these tables to exist.

Once the reviewed migration is applied, visit `/setup/` and provide the private setup token to create the first Super Admin. Setup closes after an active Super Admin exists. Students and faculty register through `/register/`; their accounts remain pending until an authorized administrator activates them. The API validates sessions and permissions for each protected action, and ownership rules apply to student requests. Better Auth session cookies are HttpOnly and flow through the same-origin proxy. Public Better Auth sign-up is blocked in favor of the institutional registration flow.

In pgAdmin, connect to the existing `lsms` database, open Query Tool, load `apps/api/migrations/0001_better_auth_tables.sql`, review it, and run it once. The transaction creates only `public.auth_users`, `public.auth_sessions`, `public.auth_accounts`, and `public.auth_verifications`. The existing `public.users.auth_user_id` text column stores the ID from `auth_users.id`; LSMS roles and institutional fields stay in `public.users`. No application table is recreated.

The designated first Super Admin enters their institutional ID, name, designated email, temporary password, and setup token in `/setup/`. Better Auth creates and hashes the authentication password; the setup service links the new auth ID to an active LSMS Super Admin profile. After setup, sign in at `/login/`, then use **Change password** in the application header immediately. New ordinary passwords require at least 12 characters with uppercase and lowercase letters, a number, and a special character. The change-password form revokes other sessions. Local login creates a Better Auth session cookie through the same-origin proxy; protected API requests resolve that session to `public.users`. Sign out uses Better Auth to end the session. The temporary setup password and setup token must never be put in SQL or committed files.

## Main workflows

- Super Admin: organization records; Admin creation; borrowing review, approval, allocation, release, custody, overdue and accountability; ISO requisitions; reports; system-wide audit activity.
- Admin: account activation; categories, catalog and physical assets; QR identifiers; analytics and reports; audit activity from student and faculty accounts only.
- Student/Faculty: equipment browsing, borrowing drafts and submission, request history, custody, accountability and profile.
- System: notifications, audit records, PostgreSQL backed availability and descriptive analytics.

ISO PDFs generated here are labeled unofficial development records. An official institutional FM-DSSC-RLS-002 template and retention rules require institutional confirmation. The local document adapter suits development; production needs durable storage or a documented regeneration policy before relying on retained files. The document implementation can regenerate a PDF from database data when a local file is unavailable.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run build` builds both Fastify and Next.js. `npm run start -w @lsms/api` starts the built API; `npm run start` starts the built web app. Integration testing of authenticated workflows requires the reviewed auth migration and suitable accounts in a controlled database. Check the target installation's migration state before testing.

After a production build, `npm run test:e2e` runs a public route and proxy smoke test with Playwright's HTTP client. It uses ports 4000 and 3001 and the configured local database.

The isolated frontend suite uses test fixtures and never connects to PostgreSQL. Run `npm run build:ui`, then `npm run test:ui`. It uses ports 4100 and 3100 and a separate `.next-ui` build. Install Playwright Chromium (`npx playwright install chromium`), or set `UI_BROWSER_CHANNEL=msedge` to use an installed Microsoft Edge. The suite checks responsive layouts, dialogs, workflow validation, errors, and automated accessibility. See [the UI audit and implementation report](docs/ui-audit.md) for coverage and limits.

## Deployment

**PostgreSQL:** Provision a managed PostgreSQL instance reachable by Render. Import the approved existing LSMS schema and data through the institution's database process, verify its views, constraints, and triggers, then review and apply the additive Better Auth migration. Never point Render at a developer laptop or run an automatic schema push.

**Render API:** Create a Node web service from this repository, using the repository root as the working directory. Build with `npm ci && npm run build -w @lsms/api`; start with `npm run start -w @lsms/api`. Set the production `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (public Render API origin), `FRONTEND_URL` (Vercel origin), `INITIAL_SETUP_TOKEN`, and `NODE_ENV=production`. Render supplies `PORT`. Set the health check to `/health/`. The server binds to `0.0.0.0`, checks database connectivity in health checks, and closes connections on shutdown. Configure durable PDF storage before depending on local ISO files across restarts.

**Vercel web:** Import this repository as a Next.js project with the repository root as its root directory. Use `npm ci` and `npm run build` (or a build command that produces the same Next.js output). Set `API_INTERNAL_URL` to the public Render API origin and `NEXT_PUBLIC_APP_URL` to the Vercel origin. Set the API's `FRONTEND_URL` to the same Vercel origin. Deploy the API before the web app so rewrites have a live destination. Configure production origins without trailing slashes in environment values.

## Troubleshooting

- `/health/` fails: check `DATABASE_URL`, connectivity, PostgreSQL privileges, and Render logs.
- Login or registration fails with missing `auth_*` relations: the reviewed Better Auth migration has not been applied.
- A page loads but `/api/*` fails: check `API_INTERNAL_URL`, API health, and both public origin settings. Rebuild Next.js after changing rewrite configuration.
- Setup is unavailable: an active Super Admin already exists, or the API cannot query the users table.
- Production PDFs disappear after redeploy: the default local document directory is ephemeral; configure durable storage or use regeneration.
