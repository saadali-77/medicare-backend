# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev          # dev server, watch mode
npm run build               # nest build -> dist/
npm run start:prod          # node dist/main (run build first)
npm run lint                 # eslint --fix on src/apps/libs/test
npm run format               # prettier --write

npm test                     # jest, all unit specs (src/**/*.spec.ts)
npx jest path/to.spec.ts     # run a single spec file
npx jest -t "test name"      # run tests matching a name
npm run test:cov             # coverage
npm run test:e2e             # e2e (test/jest-e2e.json) — currently no real e2e specs exist

npx tsc --noEmit             # type-check only, faster feedback than a full build
```

Prisma (schema lives at `prisma/schema.prisma`, client is generated to `generated/prisma`, **not** `node_modules/.prisma`):

```bash
npx prisma generate                              # regenerate client after schema/model changes
npx prisma validate                              # check schema syntax
npx prisma format                                # auto-align schema.prisma
npx prisma migrate dev --name <description>      # create + apply a migration in dev
npx prisma migrate status                        # check pending/applied migrations
```

## Architecture

NestJS 11 + Prisma 6 (PostgreSQL, hosted on Neon) REST API for a medical appointments system.

**Module layout** (`src/`): `auth`, `users`, `admin`, `doctors`, `appointments`, `prisma`, wired together in `app.module.ts`. `PrismaModule` is `@Global()` — inject `PrismaService` directly in any service without importing the module.

- **`admin`** — all `/admin/*` routes, gated by `JwtAuthGuard` + `RolesGuard` + `@Roles(UserRole.ADMIN)` at the controller level. Owns doctor/department/user-role/appointment-status management from an operator's perspective, including doctor weekly schedules (`DoctorAvailability`, single and bulk creation with overlap validation).
- **`appointments`** — patient-facing `/appointments/*` routes (booking, own-appointments listing, cancellation, slot lookup), gated by `JwtAuthGuard` only.
- **`doctors`** — a near-empty scaffold (`DoctorsController`/`DoctorsModule` with no routes). Doctor CRUD actually lives in `admin`, not here. Don't assume this module does anything.

**Deliberate architectural rule: `AdminService` and `AppointmentsService` must stay decoupled.** Both implement appointment-related admin operations (list all appointments, update appointment status) independently via their own `PrismaService` calls rather than one injecting the other. This was an explicit design decision (not an oversight) — do not "clean up" by making `AdminService` delegate to `AppointmentsService` for appointments.

**Auth flow**: `POST /auth/register` and `/auth/login` issue JWTs (bcrypt-hashed passwords, `JwtModule` in `auth.module.ts`, secret from `JWT_SECRET`). `JwtStrategy.validate()` returns `{ id, email, role }` — note the field is `id`, **not** `userId`; this has regressed multiple times in controllers. `JwtAuthGuard` protects any authenticated route; `RolesGuard` + `@Roles(...)` additionally restricts by `UserRole` (`PATIENT | DOCTOR | ADMIN | PHARMACIST`). `JWT_EXPIRES_IN` exists in `.env` but is currently unused — the expiry is hardcoded to `'1d'` in `auth.module.ts`.

**Environment loading**: `main.ts` imports `'dotenv/config'` as its literal first line, before `AppModule`. This is required — several `@Module()` decorators read `process.env.*` (e.g. `JWT_SECRET` in `JwtModule.register`) at class-decoration time, which happens during the `AppModule` import chain, so env vars must already be loaded before that import runs.

**Prisma schema conventions**:
- `@relation(...)` attributes must be written on a single line — Prisma's schema language does not support the attribute's argument list spanning multiple lines (a recurring source of `prisma validate` failures in this repo's history; if you see "This line is not a valid field or attribute definition", check for a multi-line `@relation`).
- Double-booking prevention for `Appointment(doctorId, appointmentDate)` is enforced by a **partial unique index** added via raw SQL in a hand-edited migration (`20260919183123_add_doctor_availability/migration.sql`), scoped to `WHERE status IN ('PENDING', 'CONFIRMED')` — not a schema-level `@@unique`. A plain `@@unique([doctorId, appointmentDate])` would permanently block rebooking a slot after cancellation; don't add one.
- `DoctorAvailability` models a doctor's recurring weekly schedule (`dayOfWeek` 0=Sunday..6=Saturday, `startTime`/`endTime` as `"HH:mm"` strings). Slots are computed on the fly in `AppointmentsService.getAvailableSlots()` (fixed 30-minute grid) rather than pre-generated/stored — there is no slots table.
- `createAppointment` only enforces the requested time against a doctor's `DoctorAvailability` windows **if that doctor has at least one window configured**; doctors with no schedule rows accept bookings at any time (backward-compatible fallback, not a bug).

**Windows dev environment gotchas** (this repo is developed on Windows/Neon):
- `prisma generate` frequently fails with `EPERM` on `query_engine-windows.dll.node` if any Node process (a running dev server, a leftover terminal) still has the file open — stop all node processes first.
- Manual `nest build` / `node dist/main.js` runs can race with a concurrently running `npm run start:dev` watcher (both honor `deleteOutDir: true` in `nest-cli.json`), producing transient `MODULE_NOT_FOUND`/`EADDRINUSE`. If that happens, just restart the dev server.
- Never pass a real/shared `DATABASE_URL` as `--shadow-database-url` to any `prisma migrate diff`/`migrate dev` command — Prisma treats the shadow database as disposable and will reset it, which drops all data if it's actually your real database.
