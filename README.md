# dantes-management

A dental provider marketplace and educational platform targeting **Egypt**, with a
bilingual (Arabic / English) data model. Patients book treatment either with a
licensed **doctor** (paid) or with a dental **student** (free, materials fee only,
under supervision).

## Stack

| Layer | Tech |
| --- | --- |
| Backend | Node.js, Express 4 (ESM), PostgreSQL via `pg` |
| Auth | JWT (`jsonwebtoken`), bcrypt, httpOnly cookies, rate limiting, Helmet |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Uploads | Multer → `backend/public/uploads`, served at `/uploads` |

## Layout

```
backend/
  migrations/       SQL schema, applied in filename order
  public/uploads/   runtime uploads (gitignored)
  src/
    routes/         Express routers
    controllers/    request handlers
    middleware(s)/  auth guards, multer
    config/         pg pool
    utils/          JWT sign/verify
  server.js         entrypoint
frontend/
  src/app/          Next.js pages (search, provider/[id], dashboard, auth)
  src/components/   UI + dashboard components
  src/lib/api.ts    API client
scripts/dev.js      runs backend + frontend together
```

## Roles

The `user_role` enum is `student`, `doctor`, `patient`. "Provider" is not a role —
it is the union of doctor and student, used by the provider search/detail routes.

## Setup

**Requirements:** Node.js 20+, PostgreSQL 16+, and the `psql` client.

> **`uuid_generate_v7()` is not stock PostgreSQL.** The migrations call it 19 times,
> but `001` only creates `uuid-ossp`, `pgcrypto` and `btree_gist` — and no version
> of `uuid-ossp` provides it. (PG 18 added a *core* `uuidv7()`, not a uuid-ossp one;
> the PG 18 uuid-ossp docs still list only v1/v1mc/v3/v4/v5.) So migration `001`
> fails on any stock PostgreSQL until you supply the function. See Known issues.

```bash
npm run setup                      # installs backend + frontend deps
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dental_platform
DB_USER=dental_app
DB_PASSWORD=<your password>
JWT_SECRET=<random string, 32+ chars>
JWT_EXPIRES_IN=7d
JWT_ISSUER=dental-platform
```

The API refuses to start if `JWT_SECRET` is missing or under 32 characters
(`backend/src/utils/jwt.js`). Generate one with:

```bash
openssl rand -base64 48
```

### Database

```bash
createuser dental_app --pwprompt
createdb dental_platform --owner=dental_app

for f in backend/migrations/*.sql; do
  psql -U dental_app -d dental_platform -f "$f"
done
```

The migrations create `uuid-ossp`, `pgcrypto` and `btree_gist`, so the app role
needs rights to `CREATE EXTENSION`.

### Run

```bash
npm run dev      # backend :3001 + frontend :3000
```

Or individually: `npm run dev:backend`, `npm run dev:frontend`.

Health check: `curl http://localhost:3001/api/health`.

CORS is restricted to `http://localhost:3000` in `backend/src/app.js:34`, and
`frontend/src/lib/api.ts` hardcodes `http://localhost:3001/api`. Change both for
any non-local deployment.

## Known issues

- **`uuid_generate_v7()` is undefined (blocking).** 19 call sites across `001`,
  `004` and `005`; nothing in the repo defines the function. Migrations cannot run
  until you add it. Cheapest fix — create it before `001`:

  ```sql
  CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";   -- third-party, needs superuser
  ```

  Or define it yourself, which needs no extra extension:

  ```sql
  CREATE OR REPLACE FUNCTION uuid_generate_v7() RETURNS uuid AS $$
    SELECT encode(
      set_bit(set_bit(overlay(uuid_send(gen_random_uuid())
        placing substring(int8send(floor(extract(epoch FROM clock_timestamp())*1000)::bigint) from 3)
        from 1 for 6), 52, 1), 53, 1), 'hex')::uuid;
  $$ LANGUAGE plpgsql VOLATILE;
  ```

  Drop-in replacements that need no new function: `gen_random_uuid()` (built in
  since PG 13, v4 — loses the time-sortable property but is otherwise fine), or
  PG 18+'s built-in `uuidv7()`.
- **Migration `002` is missing** — files run `001`, `003`, `004`, `005`. If
  anything in `003`–`005` depends on a `002` change, a fresh setup will fail.
- **`npm run db:migrate` is broken** — it passes a directory to `psql -f`, which
  only accepts a file. Use the loop above.
- **`npm run lint` / `npm run typecheck` are broken at the root** — they delegate
  to `--prefix backend`, which defines neither script. Only `frontend` has `lint`.
- **No test runner is configured.** `backend/test_endpoints.js` is a manual
  script that hits a running server; it registers a throwaway account
  (`test.doctor.<timestamp>@example.com` / `SecurePass123!`).

## API

| Mount | Routes |
| --- | --- |
| `/api/auth` | register, login |
| `/api/doctor` | doctor profile, license |
| `/api/student` | student profile, university |
| `/api/providers` | provider search and detail |
| `/api/services` | service catalog |
| `/api/search` | cross-role search |
| `/api/appointments` | booking |
| `/uploads` | static uploaded files |
