# S-CUBUS Timetable Management (SmartTimetable)

A multi-tenant timetable management system for S-CUBUS coaching institute, with an
automatic constraint-based scheduling engine. Given courses, batches, subjects, faculty,
rooms, availability and weekly subject requirements, it generates a conflict-free weekly
timetable — and if something can't be scheduled, it tells you exactly why.

## Tech stack

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- SQLite + Drizzle ORM (file-based DB — see note on Render below)
- Session auth (bcrypt + signed JWT cookie), server-side RBAC
- `@react-pdf/renderer` for the weekly PDF export
- Vitest for the scheduler test suite

## Local setup

```bash
npm install
cp .env.example .env          # edit AUTH_SECRET before production use
npm run db:generate            # only needed if you change src/db/schema.ts
npm run db:migrate             # creates data/smarttimetable.db and applies schema
npm run db:seed                # loads the S-CUBUS demo institute (courses, batches, faculty, rooms...)
npm run dev                    # http://localhost:3000
```

Demo Owner login: **owner@demo.local / Admin@12345**
Change this password (or create a new Owner and deactivate this one) before going live.

## Generating a timetable

1. Sign in as Owner.
2. Sidebar → **Timetable → Generate Timetable**.
3. Pick the academic session and the Monday of the week you want, optionally scoped to
   one course/batch.
4. Click **Generate Timetable**. The engine runs 3 attempts with different seeds so you
   can compare quality scores and pick the best one.
5. Save the chosen attempt as a Draft, review it on the weekly grid, then **Publish**
   (publishing is blocked automatically if any hard conflict is detected).
6. Download the weekly PDF from the timetable page.

If some subject/batch requirements can't be fully scheduled, the generation screen and
the **Conflicts** dashboard list exactly which ones and why (faculty unavailable, room
capacity, workload limits, etc.) rather than just failing silently.

## Running tests

```bash
npm test
```

Covers: batch/faculty/room conflict prevention, room capacity, faculty availability and
blocked slots, batch daily limits, and detailed-failure reporting for infeasible
requirements.

## Deploying to Render

This app uses a **file-based SQLite database**, matching the existing S-CUBUS ERP setup.
That means the database resets on every redeploy on Render's free/standard web service
tiers (ephemeral filesystem) — fine for demos and iteration, but if you need the data to
survive redeploys, add a Render Persistent Disk mounted at `/opt/render/project/src/data`
and keep `DATABASE_URL=./data/smarttimetable.db` pointing at it.

1. Push this repo to GitHub (same account as the ERP, separate repo — as decided).
2. In Render: **New → Web Service**, connect the repo.
3. Build command: `npm install && npm run db:generate && npm run build`
4. Start command: `npm run db:migrate && npm run db:seed && npm start` (drop `db:seed`
   after the first deploy once you have real data — it's safe to re-run but will error
   on unique-constraint conflicts if the demo org already exists).
5. Environment variables:
   - `AUTH_SECRET` — a long random string (required; sessions aren't secure without it)
   - `DATABASE_URL` — `./data/smarttimetable.db` (or your persistent-disk path)
   - `NODE_ENV` — `production`
6. Health check path: `/api/health`

## What's implemented vs. what's next

**Implemented and tested:** multi-tenant schema, auth + server-side RBAC, academic
sessions/courses/subjects/holidays (full CRUD), batches/faculty/rooms/time-slots
(view, seeded via script), the constraint-based scheduler (hard + soft constraints,
multi-attempt generation, detailed infeasibility reporting), weekly grid view, publish
workflow with conflict blocking, conflicts dashboard, audit log records, complete
institute weekly PDF export, and an automated test suite.

**Not yet built** (straightforward extensions on top of this foundation):
edit/delete forms for batches, faculty and rooms (currently add via seed script or
direct DB access); drag-and-drop timetable editing; Excel export; per-batch/faculty/room
dedicated PDF types and views; timetable versioning UI (the `timetable_change_log` table
is ready for it); granular per-user permission overrides UI (the `user_permissions`
table and server-side enforcement already exist); email-based invitations (currently
users are created directly with a temp password).
