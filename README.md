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

**Requirements:** Node.js 20+, PostgreSQL 16+ (or Docker / Podman).

```bash
npm run setup                 # installs backend + frontend deps
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

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
(`backend/src/utils/jwt.js`). Generate one with `openssl rand -base64 48`.

### Database

Option A — Docker / Podman:

```bash
docker compose up -d db       # or: podman compose up -d db
```

Option B — local PostgreSQL:

```bash
createuser dental_app --pwprompt
createdb dental_platform --owner=dental_app
```

Then create the schema and demo data:

```bash
npm run db:migrate            # applies backend/migrations/*.sql in order
npm run db:seed               # services + demo doctor/student/patient
```

### Run

```bash
npm run dev                   # backend :3001 + frontend :3000
```

Or individually: `npm run dev:backend`, `npm run dev:frontend`.

Health check: `curl http://localhost:3001/api/health`.

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Doctor | `doctor@demo.dantes.local` | `Demo1234!` |
| Student | `student@demo.dantes.local` | `Demo1234!` |
| Patient | `patient@demo.dantes.local` | `Demo1234!` |

### Tests & checks

```bash
npm test                      # node:test — JWT + registration validation
npm run lint                  # backend syntax check + frontend ESLint
npm run typecheck             # TypeScript (frontend)
npm run build                 # production build (frontend)
```

### Configuration

- `FRONTEND_URL` controls the CORS origin (`backend/src/app.js`).
- `NEXT_PUBLIC_API_URL` points the frontend at the API
  (defaults to `http://localhost:3001/api`).

## Fixed in this pass

- Replaced the undefined `uuid_generate_v7()` with PostgreSQL's built-in
  `gen_random_uuid()` (19 call sites).
- Renumbered migrations into a gap-free `001`–`004` sequence.
- Added working `npm run db:migrate` and `npm run db:seed` scripts.
- Added backend linting and unit tests; fixed the broken root scripts.
- Removed duplicate auth-middleware copies.
- Fixed two TypeScript errors that blocked `next build`.
- Added the missing `api.patch()` method used by the provider dashboard.
- Made the API URL and CORS origin configurable for deployments.

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
