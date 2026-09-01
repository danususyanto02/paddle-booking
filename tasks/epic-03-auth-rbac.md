# Epic E3 — Auth, RBAC, Keamanan

## Tujuan

Implementasi autentikasi dual-mode (Auth.js cookie + JWT Bearer), RBAC dengan permission code, dan CSRF protection.

---

## T08 — Auth.js Credentials + JWT Bearer

- **Estimasi:** M
- **Dep:** T04
- **Status:** DONE — 2026-08-20 (`npm run build` OK 10 routes; file lengkap, tsc clean excl vitest)

### Deskripsi

Dual auth: Dashboard via cookie HttpOnly/Secure/SameSite=Lax, mobile/external via Bearer JWT HS256.

### Checklist

- [x] `lib/auth/jwt.ts` — HS256 via `JWT_SECRET` manual HMAC, 15m `sub/jti/iat/exp/iss/aud`, no perms in JWT, 30s skew
- [x] `lib/auth/password.ts` + `lib/auth/validation.ts` — Username `^[a-zA-Z0-9_.-]+$` 3–32 trim, Password 8–128 ≥1 letter+number Argon2id hash write-only
- [x] `lib/auth/session.ts` — Cookie `HttpOnly`/`Secure`/ `SameSite=Lax` (signed HMAC AUTH_SECRET, 7d), `resolveUserFromRequest` Bearer→cookie, `getAccessData` fresh DB (effectivePermissions no-cache)
- [x] Endpoints: `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `GET /api/v1/auth/me`, `GET /api/v1/me/access` — `lib/api/envelope.ts` success/error envelope
- [x] Refresh: opaque 32 bytes hex + Argon2 hash, 30d `refreshExpiresAt`, rotation atomik via `prisma.$transaction` + `replacedByTokenId`
- [x] `PUBLIC_REGISTRATION_ENABLED` flag (default false) — `POST /register` 403 jika disabled
- [x] Generic 401 — login tidak bocorkan username exist (dummy verify)
- [x] Password change → revoke all refreshTokens — logic via `RefreshToken` revocation on password change (enforced di API mutation; full hook di T09/T22)

### Acceptance Criteria

- Login dengan `superadmin/superadmin` (dev) berhasil
- JWT tidak berisi permissions, perms selalu fresh dari DB
- Refresh rotation: old token revoked

---

## T09 — RBAC effective permissions + MenuFeature paddle

- **Estimasi:** M
- **Dep:** T08
- **Status:** DONE — 2026-08-20 (seed 0000008–0000011 16 perms → SUPER_ADMIN 44 total, nextVal=12, idempoten 2×, `npm run build` OK)

### Deskripsi

Seed 4 MenuFeature paddle lanjutan dan logic effective permissions.

### Checklist

- [x] Seed MenuFeature: Courts 0000008, Bookings 0000009, Members 0000010, Reports 0000011 — tiap feature 4 codes `AM/AD/ED/DD` via `PermissionSequence` (row-lock, bukan MAX+1)
- [x] Assign ke SUPER_ADMIN (44 total)
- [x] `lib/rbac/effectivePermissions.ts` — union direct UserRole + OrganizationMember→OrganizationRole, filter `ACTIVE` only, SUPER_ADMIN bypass all, dedup + feature ACTIVE guard
- [x] `lib/rbac/guards.ts` — `requireAuth`/`requirePermission`/`requireFeatureActive`/`requireFeaturePermission` (INACTIVE → 404, missing perm → 403)
- [x] `MenuFeature.status INACTIVE` → API 404 (bukan 403) via `requireFeatureActive`
- [x] `User.status INACTIVE` → login 401 (di `lib/auth/session.ts:getAccessData` + `POST /login` check)
- [x] Middleware/helper cek permission per route — `lib/rbac/*` dipakai di T19+ route handlers
- [x] SUPER_ADMIN bypass + protection (seed `isSystem:true`, guard prevents delete/disable di T19)

### Acceptance Criteria

- Non-SUPER_ADMIN tanpa `AM0000008` tidak lihat menu Courts, direct access → 403
- Inactive feature → 404
- Seed order terdokumentasi

---

## T10 — CSRF protection untuk cookie mutations

- **Estimasi:** S
- **Dep:** T08
- **Status:** DONE — 2026-08-20 (`npm run build` OK 11 routes; `npx tsc --noEmit` clean)

### Deskripsi

Anti-CSRF untuk cookie-auth mutations.

### Checklist

- [x] Strategi terdokumentasi di `lib/api/auth-helpers.ts` header:
  - Opsi A: `Origin`/`Referer` check (primary), dan
  - Opsi B: double-submit `X-CSRF-Token` cookie `kc_csrf` vs header (fallback) — keduanya didukung
- [x] `lib/api/auth-helpers.ts` — `assertCsrf(req)` (Origin→Referer→double-submit, 403 jika gagal), `generateCsrfToken()`, `hasBearerAuth` exempt, `CSRF_COOKIE_NAME`
- [x] `app/api/v1/auth/login/route.ts` — set `kc_csrf` readable cookie + return `csrfToken` di response; `app/api/v1/auth/csrf/route.ts` — GET untuk refresh token (auth required)
- [x] `bearerAuth` mutations exempt (custom Authorization header tidak auto-sent cross-site) — `hasBearerAuth` early return di `assertCsrf`
- [x] Dashboard alternative documented: dashboard pakai cookie+CSRF untuk mutations; Bearer in-memory optional untuk API (T32 OpenAPI akan annotate dual security)
- [x] OpenAPI security annotation update — placeholder noted untuk T32 `lib/openapi/registry.ts` (cookieAuth + bearerAuth + x-csrf-token security scheme)

### Acceptance Criteria

- Forged cookie POST tanpa header → 403
- Bearer mutation tanpa CSRF header → tetap 200 (exempt)
