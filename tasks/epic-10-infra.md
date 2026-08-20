# Epic E10 — Docker, Health, Tests, Docs

## Tujuan

Deployment, health check, testing, dan dokumentasi handover.

---

## T35 — Docker multi-stage

- **Estimasi:** S
- **Dep:** T01
- **Status:** TODO

### Checklist

- [ ] `docker/Dockerfile` — multi-stage `deps → builder → runner`:
  - `deps`: install dependencies
  - `builder`: build `output: "standalone"`
  - `runner`: non-root user, `HOSTNAME=0.0.0.0`, port 3000, copy standalone + `.next/static` + `public` + `prisma/migrations` + Prisma client
- [ ] `.dockerignore` — exclude `.env`, `node_modules`, `.next` (kecuali standalone di runner)
- [ ] `docker-compose.yml` — app service only, env dari `.env`, `DATABASE_URL` external

### AC

- `docker build -f docker/Dockerfile .` sukses
- Runner non-root, standalone output ter-copy lengkap

---

## T36 — Entrypoint & health

- **Estimasi:** S
- **Dep:** T35
- **Status:** TODO

### Checklist

- [ ] `docker/entrypoint.sh` (executable):
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
- [ ] `GET /api/v1/health`:
  - `prisma.$queryRaw SELECT 1` dengan 2s timeout
  - DB reachable → `200 { status: "ok", db: "up" }`
  - DB unreachable → `503 { status: "error", db: "down" }` + `Retry-After: 10`
  - Never 500, excluded dari rate limiting, no auth
- [ ] Dockerfile `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/v1/health | grep -q '"status":"ok"' || exit 1`
- [ ] Seed warning jika `SUPER_ADMIN_USERNAME` env beda dari existing

### AC

- `HEALTHCHECK` grep `"status":"ok"` passed
- Health 503 dengan Retry-After saat DB down

---

## T37 — Unit tests (Vitest)

- **Estimasi:** M
- **Dep:** T07, T09, T30
- **Status:** TODO

### Checklist

- [ ] Setup `vitest.config.ts`, `tests/unit/` — mocks, no real DB/provider
- [ ] Coverage wajib (mock/in-memory fixtures):
  - [ ] Access-code generation + uniqueness + no-reuse after delete (sequence)
  - [ ] Effective permissions: direct + org-derived, inactive status filtering, SUPER_ADMIN bypass + protection
  - [ ] `PUBLIC_REGISTRATION_ENABLED` flag
  - [ ] Password & token login failures (generic 401)
  - [ ] Access-token expiry, refresh rotation, logout revocation, disabled user rejection, permission change impact
  - [ ] Rate-limit counter, window reset, 429, TRUST_PROXY, Retry-After
  - [ ] Transaction rollback: registration, feature generation + sequence, role assignments
  - [ ] Record lock: concurrent acquire, heartbeat, expiry, release, force unlock permission, 423 enforcement, global+per-feature disable
  - [ ] Audit log: append per mutation, bulk delete per-id outcomes, authMethod BEARER vs COOKIE, read gated AM, retention/index
  - [ ] External integration: headers, timeout AbortController, error mapping 502/504/503, key non-disclosure
  - [ ] Kinetic: `calcTotal` IDR, `canFit/periodOf/toMinutes`, overlap detection, availability

### AC

- `npm run test` hijau, no real DB/provider connection

---

## T38 — Docs & handover

- **Estimasi:** S
- **Dep:** T37
- **Status:** TODO

### Checklist

- [ ] `docs/ui-shared-components.md` — dokumentasi `Skeleton/DataTable/Select/Button/Access` contract & usage
- [ ] `README.md` — cara run: `npm install`, `npm run dev/build/preview`, Docker (`docker compose up`), env setup, seed order, RBAC, audit retention
- [ ] `docs/` tambahan: env docs (placeholders, production rules), `TRUST_PROXY` docs, CSRF choice docs
- [ ] Verify: `AUTH_SECRET != JWT_SECRET` documented, seed order 0000001–0000011, retention 90d

### AC

- README lengkap, docs ter-review, tasks final
