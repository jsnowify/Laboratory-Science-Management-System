# LSMS

Laboratory Science Management System for the Research and Laboratory Services Center.

## Current implementation status

The Next.js 16 project foundation is initialized. It includes a public entry page, PostgreSQL/Drizzle connection wiring, environment validation, a separate Better Auth table definition, and centralized role permissions. The existing `lsms` database has **not yet been introspected**, so authentication and the operational modules are not implemented or available. No existing database table has been modified.

## Stack and architecture

Next.js 16 App Router, React, TypeScript, Tailwind CSS, PostgreSQL, Drizzle ORM with postgres.js, Better Auth, Zod, Lucide React, Recharts, qrcode, pdf-lib, Vitest, and Playwright. The intended architecture is a modular monolith: routes and components call server-side authorization and validation, then domain services and database queries. PostgreSQL remains the source of truth.

## Prerequisites

- Node.js 24 or newer and npm
- The existing PostgreSQL database named `lsms`
- A database account with read access to schema metadata and the permissions required by the eventual application

## Environment

Copy `.env.example` to `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Connection to the existing PostgreSQL `lsms` database |
| `BETTER_AUTH_SECRET` | Random secret of at least 32 characters |
| `BETTER_AUTH_URL` | Server origin, such as `http://localhost:3000` |
| `NEXT_PUBLIC_APP_URL` | Public application origin |
| `INITIAL_SETUP_TOKEN` | Random first-run setup token of at least 24 characters |

Do not commit `.env.local`. The `.env.example` file contains placeholders only.

## Install and run

```sh
npm install
npm run dev
```

The current public entry page is available at `http://localhost:3000`. The login and registration routes are pending database introspection and implementation.

## Existing database integration

Once `DATABASE_URL` is available, inspect the schema with:

```sh
npm run db:pull
```

This uses a read-only Drizzle Kit `pull` configuration and writes generated TypeScript schema files under `src/db/introspected`. **Do not run `drizzle-kit push` against the existing database.** The separate Better Auth tables are defined in `src/db/auth-schema.ts`; their migration must be reviewed against the introspected `users.auth_user_id` type before applying it. No migration has been executed.

## Roles and first-run setup

The authorization roles are Super Admin, Admin, and Student/Faculty. Student versus Faculty is a profile classification, not a separate authorization role. Permission definitions are in `src/lib/permissions.ts`. The first Super Admin setup route is pending database mapping; the setup token is already part of the required environment contract. No administrator account has been seeded.

## Development checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run test:e2e` is configured for Playwright; browser flow tests require a fully implemented app and an isolated test database.
# Laboratory-Science-Management-System
