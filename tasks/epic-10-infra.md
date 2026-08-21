# Epic E10 — Docker, Health, Tests, Docs

## Tujuan

Deployment, health check, testing, dan dokumentasi handover.

---

## T35 — Docker multi-stage

- **Estimasi:** S
- **Dep:** T01
- **Status:** DONE — 2026-08-20

### Checklist

- [x] `docker/Dockerfile` — multi-stage `deps → builder → runner`:
  - `deps`: install dependencies
  - `builder`: build `output: "standalone"`
  - `runner`: non-root user, `HOSTNAME=0.0.0.0`, port 3000, copy standalone + `.next/static` + `public` + `prisma/migrations` + Prisma client
- [x] `.dockerignore` — exclude `.env`, `node_modules`, `.next` (kecuali standalone di runner)
- [x] `docker-compose.yml` — app service only, env dari `.env`, `DATABASE_URL` external

### AC

- `docker build -f docker/Dockerfile .` sukses
- Runner non-root, standalone output ter-copy lengkap

---

## T36 — Entrypoint & health

- **Estimasi:** S
- **Dep:** T35
- **Status:** DONE — 2026-08-20

### Checklist

- [x] `docker/entrypoint.sh` (executable):
  ```sh
  #!/bin/sh
  set -e
  echo "Waiting for database..."
  until npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1" 2>/dev/null; do
    echo "Database not ready, retrying in 2s..."; sleep 2; done
  echo "Running migrations..."
  npx prisma migrate deploy
  echo "Seeding (idempotent)..."
  npx prisma db seed || node prisma/seed.js || true
  exec node server.js
  ```
- [x] `GET /api/v1/health`:
  - `prisma.$queryRaw SELECT 1` dengan 2s timeout
  - DB reachable → `200 { status: "ok", db: "up" }`
  - DB unreachable → `503 { status: "error", db: "down" }` + `Retry-After: 10`
  - Never 500, excluded dari rate limiting, no auth
- [x] Dockerfile `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/v1/health | grep -q '"status":"ok"' || exit 1`
- [x] Seed warning jika `SUPER_ADMIN_USERNAME` env beda dari existing

### AC

- `HEALTHCHECK` grep `"status":"ok"` passed
- Health 503 dengan Retry-After saat DB down

---

## T37 — Unit tests (Vitest)

- **Estimasi:** M
- **Dep:** T07, T09, T30
- **Status:** DONE — 2026-08-20

### Checklist

- [x] Setup `vitest.config.ts`, `tests/unit/` — mocks, no real DB/provider
- [x] Coverage wajib (mock/in-memory fixtures):
  - [x] Access-code generation + uniqueness + no-reuse after delete (sequence)
  - [x] Effective permissions: direct + org-derived, inactive status filtering, SUPER_ADMIN bypass + protection
  - [x] `PUBLIC_REGISTRATION_ENABLED` flag
  - [x] Password & token login failures (generic 401)
  - [x] Access-token expiry, refresh rotation, logout revocation, disabled user rejection, permission change impact
  - [x] Rate-limit counter, window reset, 429, TRUST_PROXY, Retry-After
  - [x] Transaction rollback: registration, feature generation + sequence, role assignments
  - [x] Record lock: concurrent acquire, heartbeat, expiry, release, force unlock permission, 423 enforcement, global+per-feature disable
  - [x] Audit log: append per mutation, bulk delete per-id outcomes, authMethod BEARER vs COOKIE, read gated AM, retention/index
  - [x] External integration: headers, timeout AbortController, error mapping 502/504/503, key non-disclosure
  - [x] Kinetic: `calcTotal` IDR, `canFit/periodOf/toMinutes`, overlap detection, availability

### AC

- `npm run test` hijau, no real DB/provider connection

---

## T38 — Docs & handover

- **Estimasi:** S
- **Dep:** T37
- **Status:** DONE — 2026-08-20

### Checklist

- [x] `docs/ui-shared-components.md` — dokumentasi `Skeleton/DataTable/Select/Button/Access` contract & usage
- [x] `README.md` — cara run: `npm install`, `npm run dev/build/preview`, Docker (`docker compose up`), env setup, seed order, RBAC, audit retention
- [x] `docs/` tambahan: env docs (placeholders, production rules), `TRUST_PROXY` docs, CSRF choice docs
- [x] Verify: `AUTH_SECRET != JWT_SECRET` documented, seed order 0000001–0000011, retention 90d

### AC

- README lengkap, docs ter-review, tasks final
