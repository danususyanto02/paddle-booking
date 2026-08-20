# Epic E3 — Auth, RBAC, Keamanan

## Tujuan

Implementasi autentikasi dual-mode (Auth.js cookie + JWT Bearer), RBAC dengan permission code, dan CSRF protection.

---

## T08 — Auth.js Credentials + JWT Bearer

- **Estimasi:** M
- **Dep:** T04
- **Status:** TODO

### Deskripsi

Dual auth: Dashboard via Auth.js cookie, mobile/external via Bearer JWT.

### Checklist

- [ ] `lib/auth/config.ts` — Auth.js Credentials provider, Argon2id verify
- [ ] Username validation: `^[a-zA-Z0-9_.-]+$` 3–32 chars, trim, immutable
- [ ] Password rules: 8–128 chars, ≥1 letter+≥1 number, Argon2id hash, write-only
- [ ] Cookie: `HttpOnly`, `Secure` (production), `SameSite=Lax`
- [ ] Endpoints: `POST /api/v1/auth/register`, `/login`, `/refresh`, `/logout`, `GET /api/v1/auth/me`, `GET /api/v1/me/access`
- [ ] JWT: HS256 via `JWT_SECRET`, 15m (`sub/jti/iat/exp/iss/aud`), no permissions in JWT, 30s skew
- [ ] Refresh: opaque 32+ bytes, Argon2 hash, 30d, rotation atomik
- [ ] `PUBLIC_REGISTRATION_ENABLED` flag (default false)
- [ ] Generic 401 — tidak bocorkan ada/tidaknya username
- [ ] Password change → revoke semua refresh tokens (transaction)

### Acceptance Criteria

- Login dengan `superadmin/superadmin` (dev) berhasil
- JWT tidak berisi permissions, perms selalu fresh dari DB
- Refresh rotation: old token revoked

---

## T09 — RBAC effective permissions + MenuFeature paddle

- **Estimasi:** M
- **Dep:** T08
- **Status:** TODO

### Deskripsi

Seed 4 MenuFeature paddle lanjutan dan logic effective permissions.

### Checklist

- [ ] Seed MenuFeature: Courts 0000008, Bookings 0000009, Members 0000010, Reports 0000011 — tiap feature 4 codes `AM/AD/ED/DD` via `PermissionSequence` (row-lock, bukan MAX+1)
- [ ] Assign ke SUPER_ADMIN
- [ ] `lib/rbac/effectivePermissions.ts` — union direct UserRole + OrganizationMember→OrganizationRole, filter `ACTIVE` only
- [ ] `MenuFeature.status INACTIVE` → API 404 (bukan 403)
- [ ] `User.status INACTIVE` → login 401
- [ ] Middleware/helper cek permission per route
- [ ] SUPER_ADMIN bypass + protection (tidak bisa di-delete/disable)

### Acceptance Criteria

- Non-SUPER_ADMIN tanpa `AM0000008` tidak lihat menu Courts, direct access → 403
- Inactive feature → 404
- Seed order terdokumentasi

---

## T10 — CSRF protection untuk cookie mutations

- **Estimasi:** S
- **Dep:** T08
- **Status:** TODO

### Deskripsi

Anti-CSRF untuk cookie-auth mutations.

### Checklist

- [ ] Pilih strategi & dokumentasi di `lib/api/auth-helpers.ts`:
  - Opsi A: `Origin`/`Referer` check, atau
  - Opsi B: double-submit `X-CSRF-Token` (cookie vs header)
- [ ] `bearerAuth` mutations exempt (custom Authorization header tidak auto-sent cross-site)
- [ ] Alternatif: dashboard pakai Bearer in-memory (cookie hanya untuk page nav) — jika dipilih, dokumentasikan
- [ ] OpenAPI security annotation update

### Acceptance Criteria

- Forged cookie POST tanpa header → 403
- Bearer mutation tanpa CSRF header → tetap 200 (exempt)
