# Epic E8 — Cross-Cutting — Rate Limit, Lock, Audit, OpenAPI

## Tujuan

Hardening lintas fitur: rate limiting, record locking, audit log, dan dokumentasi OpenAPI.

---

## T29 — Rate limiting (PostgreSQL)

- **Estimasi:** S
- **Dep:** T03
- **Status:** DONE — 2026-08-20

### Checklist

- [x] `RateLimitEntry` fixed window: `prisma.$transaction` increment, reset jika `now - windowStart > windowSeconds`
- [x] Rules:
  - Login: 5/15m — key `login:ip:username`
  - Register: 5/h — key `register:ip`
  - Refresh: 20/15m
  - Protected API: 120/m — key `api:userId` fallback `api:ip`
  - Health/docs excluded
- [x] `429` + `Retry-After` + `X-RateLimit-*` headers, error code `RATE_LIMITED`
- [x] `TRUST_PROXY` handling: `true` → `x-forwarded-for[0]`, else socket IP, fallback `x-real-ip`
- [x] `RATE_LIMIT_ENABLED=false` disables all
- [x] Middleware/helper applied di semua protected routes

### AC

- 6th login dalam 15m → 429 dengan Retry-After
- Health tidak pernah 429

---

## T30 — Record locking full

- **Estimasi:** M
- **Dep:** T03
- **Status:** DONE — 2026-08-20

### Schema

```prisma
RecordLock {
  resourceType, resourceId, lockTokenHash, ownerUserId
  acquiredAt, heartbeatAt, expiresAt
  @@unique([resourceType, resourceId])
}
```

### Endpoints

```
POST   /api/v1/locks/acquire        # { resourceType, resourceId } → { data, lockToken }
GET    /api/v1/locks/status?resourceType=&resourceId=
POST   /api/v1/locks/:id/heartbeat  # X-Record-Lock-Token → extend 2m
DELETE /api/v1/locks/:id            # owner release
DELETE /api/v1/locks/:id/force      # DD Locked Records
GET    /api/v1/locks                # list (AM Locked Records)
```

### Checklist

- [x] `POST /acquire` — transactional, cek no valid lock exists, hash token (Argon2), return plaintext once
- [x] `GET /status` — `{ locked, owner?, expiresAt? }`, expired (`expiresAt < now()`) → unlocked
- [x] `POST /heartbeat` 30s — extend `expiresAt = now + 2m`, verify token
- [x] `DELETE /:id` — verify token, hard delete; `DELETE /:id/force` — requires `DD` Locked Records
- [x] `SystemSetting.recordLockEnabled` global + `MenuFeature.recordLockEnabled` per-feature (Court/Booking default true)
- [x] `hooks/useRecordLock.ts`:
  - States: `UNLOCKED | LOCKED_BY_SELF | LOCKED_BY_OTHER | EXPIRED`
  - `acquire()` / `release()` / heartbeat interval 30s / poll 30s when LOCKED_BY_OTHER
  - Token in memory only (no localStorage), `pagehide` → `sendBeacon` best-effort, Back button await release
- [x] Mutations check `X-Record-Lock-Token` when locking enabled → 423 LOCKED dengan owner info jika mismatch
- [x] Logout → release all locks by user

### AC

- 2 tab same record → second tab LOCKED_BY_OTHER (read-only)
- Force unlock hanya dengan DD, delete hanya lock bukan resource

---

## T31 — Audit log

- **Estimasi:** S
- **Dep:** T30
- **Status:** DONE — 2026-08-20

### Schema

```prisma
AuditLog {
  actorUserId, actorUsername, authMethod: BEARER/COOKIE/NONE
  ip, userAgent, requestId, action, resourceType, resourceId, resourceIds[]
  permissionCode, before, after, status: SUCCESS/FAILED, errorCode
}
```

### Endpoints

```
GET /api/v1/audit-logs
GET /api/v1/audit-logs/:id
# No POST/PATCH/DELETE — read-only, AM Audit Logs required
```

### Checklist

- [x] `lib/audit/writeAuditLog.ts` — called **after** business `prisma.$transaction` commits (separate write, never block response, log failure server-side)
- [x] Coverage: semua mutations (Court/Booking/Member CRUD + bulk delete + lock actions + assignment), termasuk `BEARER vs COOKIE` dari `lib/api/auth-helpers.ts`
- [x] Sensitive fields tidak masuk before/after: `passwordHash`, `lockTokenHash`, `x-api-key`
- [x] Bulk delete: 1 row per bulk request, `resourceIds` + per-id outcomes di `after` JSON
- [x] Failed mutations juga logged `status FAILED` dengan `errorCode`
- [x] Read API: gated `AM Audit Logs`, query `page/limit/q/sortBy/sortOrder + authMethod/action/resourceType/actorUserId/status/from/to`
- [x] Dashboard: `dashboard/audit-logs` — columns Time/Actor/Method badge/Action/Resource/Permission/IP/RequestID/Status, detail drawer before/after diff
- [x] Retention 90d note (periodic hard-delete `createdAt < now - 90d`), indexes untuk efficient range delete

### AC

- `POST /courts/delete` via Bearer vs Cookie distinguishable (authMethod)
- Failed 403 CREATE juga logged

---

## T32 — OpenAPI & Swagger

- **Estimasi:** S
- **Dep:** T19, T22
- **Status:** DONE — 2026-08-20

### Checklist

- [x] `lib/openapi/registry.ts` — `zod-to-openapi` 3.1, envelopes, pagination components, Bearer + cookie security schemes, error enum reusable
- [x] Register semua endpoints: courts, bookings, slots, members, locks, audit-logs, integrations (external demo), health + auth, openapi.json/docs
- [x] Document: RBAC code per operation, request/response schemas, `429`/`423`/`409` errors, `RateLimit` headers
- [x] Serve: `GET /api/openapi.json` + `GET /api/docs` (Swagger UI)

### AC

- Swagger di `/api/docs` menampilkan RBAC code per operation, contoh IDR di response
