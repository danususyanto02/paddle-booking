# Next Starter Admin - Implementation Specification

## Purpose

Production-oriented Next.js starter kit for a web dashboard and mobile-ready REST API. It provides username/password authentication, PostgreSQL persistence, RBAC, menu-based permissions, record locking, OpenAPI documentation, external API integration patterns, and Docker deployment.

## Non-Negotiable Security Rules

- Do not commit `.env` files, database URLs, API keys, JWT secrets, or production passwords.
- Keep server credentials in environment variables without `NEXT_PUBLIC_` prefix.
- Browser dashboard must not store access tokens in `localStorage` or `sessionStorage`.
- Dashboard session uses Auth.js `HttpOnly` cookies, `Secure` in production, and `SameSite=Lax` (see CSRF Protection for cookie-auth API mutations).
- Mobile clients use bearer access tokens and opaque refresh tokens stored in OS secure storage.
- Passwords use Argon2id hashes (argon2 library). Never persist plaintext passwords.
- Refresh tokens are stored only as hashes and rotate on refresh.
- Seed account `superadmin/superadmin` exists only for local development. Production startup must reject this default password (fail-fast; see Configuration).
- Rotate all credentials previously shared outside local secret storage before production use.
- `PUBLIC_REGISTRATION_ENABLED` defaults to `false` (opt-in). Enabling it in production must be intentional.
- `AUTH_SECRET` and `JWT_SECRET` must be distinct values; production validation rejects them if equal.

## Technology

- Next.js App Router and TypeScript.
- Tailwind CSS 4. UI component library is chosen via an explicit user prompt at kit initialization:
  - Ask the user for UI preference first. If the user opts for the kit's recommendation or has no preference, use FlyonUI with Tailwind CSS 4 (recommended default).
  - If the user provides a specific UI direction (component library, design system, or custom styles), follow the user's direction and do not require FlyonUI.
- PostgreSQL through Prisma.
- Auth.js Credentials provider for dashboard web sessions.
- Zod for API validation.
- `@asteasolutions/zod-to-openapi` and Swagger UI for OpenAPI 3.1 documentation.
- Argon2 for password and opaque-token hashing.
- Vitest for optional unit tests.
- Docker multi-stage deployment using Next.js `output: "standalone"`.

## Configuration

Use one replaceable PostgreSQL connection string. Application code must only read `DATABASE_URL`.

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=disable"
AUTH_SECRET="replace-with-long-random-secret-at-least-32-chars"
JWT_SECRET="replace-with-different-long-random-secret-at-least-32-chars"
PUBLIC_REGISTRATION_ENABLED=false
SUPER_ADMIN_USERNAME=superadmin
SUPER_ADMIN_PASSWORD=superadmin
RATE_LIMIT_ENABLED=true
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW_SECONDS=900
RATE_LIMIT_REGISTER_MAX=5
RATE_LIMIT_REGISTER_WINDOW_SECONDS=3600
RATE_LIMIT_API_MAX=120
RATE_LIMIT_API_WINDOW_SECONDS=60
RESTFUL_API_DEV_BASE_URL=https://api.restful-api.dev
RESTFUL_API_DEV_API_KEY="replace-with-provider-key"
RESTFUL_API_DEV_TIMEOUT_MS=5000
TRUST_PROXY=false
```

> Production defaults are secure. For local development, set `PUBLIC_REGISTRATION_ENABLED=true` and `SUPER_ADMIN_PASSWORD=superadmin` in `.env.local` (never commit). The `.env.example` below shows secure production defaults; dev overrides belong in `.env.local`.

Env defaults and production rules:

| Variable | Default (when unset) | Production Rule |
| --- | --- | --- |
| `DATABASE_URL` | *(required, no default)* | Must be present; use `sslmode=require` in production |
| `AUTH_SECRET` | *(required)* | >= 32 chars; fail-fast if missing or weak |
| `JWT_SECRET` | *(required)* | >= 32 chars; must differ from `AUTH_SECRET`; fail-fast if equal |
| `PUBLIC_REGISTRATION_ENABLED` | `false` | Explicit `true` must be intentional |
| `SUPER_ADMIN_USERNAME` | `superadmin` | — |
| `SUPER_ADMIN_PASSWORD` | `superadmin` | Must NOT be `superadmin` / `password` / `admin` when `NODE_ENV=production`; fail-fast |
| `RATE_LIMIT_ENABLED` | `true` | — |
| `RESTFUL_API_DEV_BASE_URL` | `https://api.restful-api.dev` | Must be valid URL if set |
| `RESTFUL_API_DEV_TIMEOUT_MS` | `5000` | — |
| `TRUST_PROXY` | `false` | Set `true` when behind reverse proxy / Docker |
| `NODE_ENV` | `development` | `production` enables all strict checks |

Required production validation (fail-fast at startup in `lib/env.ts` using Zod, before Prisma init):

- `AUTH_SECRET` and `JWT_SECRET` must each be >= 32 chars and must not be equal. On failure: `throw new Error("[env] Invalid AUTH_SECRET/JWT_SECRET")` and process exits 1.
- `SUPER_ADMIN_PASSWORD` must be >= 8 chars if provided; when `NODE_ENV=production` it must not be `superadmin`, `password`, or `admin`. If missing in production, throw and abort boot (do not fallback to superadmin).
- `PUBLIC_REGISTRATION_ENABLED` defaults to `false` if unset. No throw, but log effective value.
- `DATABASE_URL` must be present and should use `sslmode=require` in production (warn if `sslmode=disable` in production).
- `RESTFUL_API_DEV_BASE_URL` must be a valid URL if set.
- On any validation failure: throw before Prisma initialization so the process exits 1. Docker entrypoint restart policy handles it.
- Log effective config (without secrets) on boot for debugging.
- Keep `.env` out of Git and provide placeholders only in `.env.example`. The example file must not contain real secrets.
- `sslmode=disable` is only for the local-dev example; production docs instruct `sslmode=require`.

## Authentication

### Dashboard Web

- Login uses username and password through Auth.js Credentials provider.
- Auth.js session is cookie-based for browser dashboard requests.
- All authenticated users can access `/dashboard`.
- Public registration defaults to disabled (`PUBLIC_REGISTRATION_ENABLED=false`). Explicit `true` opts in.
- Disabled public registration returns a consistent error and hides or blocks registration UI.

### Credential Rules

#### Username Rules

- 3-32 characters, pattern `^[a-zA-Z0-9_.-]+$` (letters, digits, underscore, dot, hyphen), trimmed.
- Must not be empty after trim; violation -> `422 VALIDATION_ERROR`.
- Case-sensitive uniqueness via DB unique index on `username` (no `citext`; `SuperAdmin` and `superadmin` are distinct, seed uses lowercase `superadmin`).
- Username cannot be changed after creation (rename would break audit and lock ownership; keep immutable for starter kit).
- Zod: `z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/)`

#### Password Rules

- 8-128 characters, at least 1 letter and 1 number.
- Stored only as Argon2id hash via `argon2` library (use library defaults; e.g. `m=65536, t=3, p=4` or documented defaults).
- UTF-8 allowed; printable chars; do not trim (spaces are part of password if user typed them).
- The `password` field is write-only; it is never returned in any API response.
- Password change revokes all refresh tokens for that user in the same transaction and requires re-login.
- Login error messages must not reveal whether the username exists; always return generic `401 { error: { code: "UNAUTHENTICATED", message: "Invalid credentials" } }`.

### Mobile and External Clients

Use versioned API endpoints:

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
GET  /api/v1/me/access
```

- Login returns a JWT access token, opaque refresh token, `tokenType: "Bearer"`, and expiry metadata.
- Access token lifetime: 15 minutes.
- Refresh token lifetime: 30 days.
- Refresh tokens rotate atomically. Old token is revoked when replacement token is created.
- Logout, disabled user, password change, and user removal revoke user refresh tokens.
- All `/api/v1` protected resource endpoints accept `Authorization: Bearer <access-token>`.
- Permission must be queried from database for every protected request. JWT claims are not permanent permission authority.

#### JWT and Session Contract

JWT access token (HS256, signed with `JWT_SECRET` only; never `AUTH_SECRET`):

| Claim | Value | Notes |
| --- | --- | --- |
| `sub` | `user.id` (CUID) | Subject |
| `jti` | unique token ID (CUID/UUID) | For log tracing |
| `iat` | issued-at (seconds since epoch) | — |
| `exp` | `iat + 900` (15 minutes) | — |
| `iss` | app origin (e.g. `https://example.com`) | Must be validated on every request |
| `aud` | `api` | Must be validated on every request |

Additional rules:

- JWT contains identity only (`sub`, `jti`, `iat`, `exp`, `iss`, `aud`, and `username` for display if needed). It MUST NOT contain permissions or roles. Storing permissions in JWT is forbidden.
- Auth.js session (dashboard web) uses a separate `AUTH_SECRET` in an HttpOnly cookie; it does not contain the Bearer JWT. The two secrets and token types are independent.
- Every protected `/api/v1/*` request: middleware verifies JWT signature and expiry, then loads the user and effective permissions from the database. If the JWT is valid but the user is inactive, the request is still rejected (`401`).
- `GET /api/v1/auth/me` (Bearer) and `GET /api/v1/me/access` (cookie or Bearer) always read fresh data from the database and return `{ user, roles, effectivePermissions, organizations }`. This is the source of truth for UI `Access` / `Button` `CodeAccess` checks. The frontend must not cache permissions beyond the session and must re-fetch on `403`.
- Clock skew tolerance: 30 seconds for `exp` verification.
- Refresh token: opaque random 32+ bytes, stored as Argon2id hash, never a JWT.

## RBAC

### Roles

System roles:

- `SUPER_ADMIN`
- `ADMIN`
- `USER`

Additional roles are managed through role CRUD.

`SUPER_ADMIN` bypasses permission checks. Its role and seed user cannot be deleted, disabled, or downgraded through the application UI or API.

### Status Values

```prisma
enum UserStatus { ACTIVE INACTIVE }
enum RoleStatus { ACTIVE INACTIVE }
enum OrganizationStatus { ACTIVE INACTIVE }
enum FeatureStatus { ACTIVE INACTIVE }
```

- `User.status == INACTIVE` -> cannot login (`401`), all refresh tokens revoked, `GET /api/v1/auth/me` returns `401`, no effective permissions evaluated.
- `Role.status == INACTIVE` -> the role's permissions are ignored in the effective union, even if still assigned to a user or organization. The role still exists for audit and can be re-activated.
- `Organization.status == INACTIVE` -> all `OrganizationRole` and `OrganizationMember` contributions from that organization are ignored. Membership rows remain but grant no permissions from it.
- `MenuFeature.status == INACTIVE` -> menu is hidden regardless of `AM` permission; direct route/API access returns `404` (hide existence rather than `403`).
- `SUPER_ADMIN` bypasses status filtering for permission checks (by definition it has all permissions), but `User.status == INACTIVE` still blocks login even for superadmin.

### Permission Codes

Each menu feature generates four permissions. Format is prefix plus seven-digit feature sequence, nine characters total:

```text
AM0000001  View menu or feature
AD0000001  Add data
ED0000001  Edit data
DD0000001  Delete data
```

When a menu feature is created, its four permission records are generated atomically and assigned to `SUPER_ADMIN`.

#### Sequence Generation

- The 7-digit sequence is allocated via a DB sequence or a locked counter inside `prisma.$transaction`.
  - Recommended: dedicated table `PermissionSequence { id Int @id @default(1), nextVal Int }` with `update ... set nextVal = nextVal + 1` inside the transaction, or a PostgreSQL `SEQUENCE permission_seq`.
  - Do NOT use bare `MAX(code)+1` without a row-level lock; it races under concurrent feature creation.
- Format: ` `${prefix}${String(seq).padStart(7, "0")}` ` where `prefix` is one of `AM`, `AD`, `ED`, `DD`. Total length is always 9.
- Unique constraint on `Permission.code` (`@@unique([code])`).

#### Lifecycle Rules

- Code is immutable after creation. Renaming a `MenuFeature` (name, route, icon, sort order) does not change its four codes.
- Deleting (soft-deleting) a `MenuFeature` soft-deletes the feature row (suffix + `deletedAt`) and hard-deletes its four `Permission` rows and related `RolePermission` links (cascade inside the transaction). Deleted permission codes (`AM/AD/ED/DD`) are NEVER reused. The next feature gets the next sequence value; a gap is expected and correct. The feature's `route` is freed for reuse after soft delete.
- Seed ordering determines initial sequence values. Document seed order explicitly (recommended: Users=0000001, Roles=0000002, Organizations=0000003, Features=0000004, Locked Records=0000005, External API Demo=0000006).

### Effective Permissions

A user receives permissions from:

- Roles directly assigned to user.
- Roles assigned to every organization where user is a member.

User may belong to zero, one, or many organizations.

#### Status Filtering

Effective permissions are a duplicate-free union filtered by status:

- Only `UserRole` rows where `Role.status == ACTIVE` contribute.
- Only `OrganizationMember` rows where `Organization.status == ACTIVE` contribute, and only their `OrganizationRole` rows where `Role.status == ACTIVE` contribute.
- Inactive role or inactive organization contributes zero permissions (filtered before union).
- `User.status == INACTIVE` is rejected at the auth layer before any permission evaluation.
- `MenuFeature.status == INACTIVE` does not affect the code itself, but the menu is hidden and direct access returns `404`.

There is no active organization selector.

### UI and Backend Enforcement

- Sidebar displays only menu features for which user has relevant `AM` permission and `MenuFeature.status == ACTIVE`.
- Direct route access without required permission returns a 403 page or API 403 response. Access to an inactive feature returns 404.
- API mutations require corresponding `AD`, `ED`, or `DD` permissions.
- UI checks are only presentation. API and server-side code always enforce access.
- UI `Button` accepts `CodeAccess?: string` and does not render or enables according to permission policy.
- UI `Access` accepts `CodeAccess` and conditionally renders children:

```tsx
<Access CodeAccess="ED0000002">
  <Button CodeAccess="ED0000002">Save</Button>
</Access>
```

Do not introduce a separate `AccessButton` component.

## Data Model

All business models and assignment relations include:

```prisma
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
```

Core models:

- `User`: username (unique, immutable), password hash (Argon2id, write-only), display details, `status: UserStatus`, system protection flag (`isSystem`).
- `Role`: name, code, system-role marker, `status: RoleStatus`.
- `Permission`: code (9 chars, unique), action (`MENU`, `ADD`, `EDIT`, `DELETE`), feature relation.
- `MenuFeature`: name, route path, icon, sort order, parent relation, `status: FeatureStatus`, system lock marker, `recordLockEnabled`.
- `UserRole`: direct user-to-role assignment.
- `RolePermission`: role-to-permission assignment.
- `Organization`: name, code, `status: OrganizationStatus`.
- `OrganizationRole`: role assigned to organization.
- `OrganizationMember`: user membership in organization.
- `RefreshToken`: hashed token (Argon2id), expiry, revoke and replacement metadata.
- `RateLimitEntry`: persistent counter state (see Rate Limiting).
- `PermissionSequence`: singleton counter for feature code generation (see Permission Codes).
- `SystemSetting`: global record locking settings.
- `RecordLock`: current lock state per resource record (with `ResourceType` enum; see Record Locking).
- `AuditLog`: append-only CRUD audit trail capturing `authMethod` (`BEARER` vs `COOKIE`) for every mutation (see Audit Log).

Prisma migrations and idempotent seed must create system roles, super admin, initial menu features, access codes, and `SUPER_ADMIN` permission assignments.

### Soft Delete

Business entities that support reuse of `code`/`username` use soft delete via `deletedAt`.

```prisma
// Add to soft-deletable models: User, Role, Organization, MenuFeature
deletedAt DateTime? @db.Timestamptz
@@index([deletedAt])
```

Scope:

| Model | Soft Delete | `code`/`username` Reuse |
| --- | --- | --- |
| `User` | Yes | `username` freed on soft delete (see rule below) |
| `Role` | Yes | `code` freed on soft delete |
| `Organization` | Yes | `code` freed on soft delete |
| `MenuFeature` | Yes | `route` freed; `Permission.code` (AM/AD/ED/DD) is NOT freed — see RBAC Lifecycle Rules |
| `Permission` | No (hard deleted with `MenuFeature`) | Never reused (gap is correct) |
| `RecordLock` / `RefreshToken` / `RateLimitEntry` | No | N/A |

Reuse rule (suffix on soft delete):

- `POST /api/v1/<resource>/delete` with `{ ids: string[] }` is the sole delete entrypoint (no `DELETE /:id`). Single delete is `{ ids: ["<one-id>"] }`. It does NOT hard-delete rows. For each id, inside a `prisma.$transaction` (partial success — failing ids do not roll back successful ones; `ids` is capped at **2000** — `422 VALIDATION_ERROR` if > 2000):
  1. Set `deletedAt = now()`.
  2. Suffix the unique field to free the original value: `code = code + "_deleted_" + id` (or `username = username + "_deleted_" + id` for `User`). This keeps `@@unique([code])` satisfied and allows a new row to reuse the original `code`/`username`.
  3. For `User`: also revoke all refresh tokens and release all record locks held by that user in the same transaction.
  4. For `MenuFeature`: soft-delete the feature row and hard-delete its 4 `Permission` + `RolePermission` links (permissions are never reused; see RBAC).
- Alternative: partial unique index `WHERE "deletedAt" IS NULL` (PostgreSQL `CREATE UNIQUE INDEX ... WHERE "deletedAt" IS NULL`). If adopted, suffix is not needed; document which approach is chosen. Recommended for starter kit: **suffix approach** (works with Prisma `@@unique` without raw SQL).

Query filtering:

- All list and single-resource reads (`GET /api/v1/*`, dashboard queries) implicitly filter `deletedAt IS NULL`. Soft-deleted rows are invisible to normal reads.
- `GET /api/v1/<resource>/:id` on a soft-deleted id returns `404 NOT_FOUND`.
- `POST /api/v1/<resource>` with a `code`/`username` that is only used by a soft-deleted row succeeds (slot is free after suffix).
- Restore (if needed later): `POST /api/v1/<resource>/:id/restore` clears `deletedAt` and restores the original `code`/`username` after checking for conflicts; out of scope for MVP but the suffix makes it possible.

What is NOT soft-deleted:

- `Permission` rows are hard-deleted with their `MenuFeature`; their `AM/AD/ED/DD` codes are never reused.
- Assignment tables (`UserRole`, `RolePermission`, `OrganizationRole`, `OrganizationMember`) are hard-deleted.
- `RecordLock` rows are hard-deleted (TTL/force).


## Dashboard

Initial protected dashboard pages:

```text
/dashboard
/dashboard/users
/dashboard/roles
/dashboard/organizations
/dashboard/features
/dashboard/locked-records
/dashboard/audit-logs
/dashboard/external-api-demo
```

Functional scope:

- User CRUD, direct role assignment, active status management, and system-user protections.
- Role CRUD and role permission assignment.
- Organization CRUD, organization role assignment, and organization member management.
- Menu/feature CRUD with automatic access-code generation (delete is soft delete; code reuse via suffix).
- Locked Records list and force unlock action.
- Audit Logs list with auth-method visibility (`BEARER` vs `COOKIE`), filtering, and detail view (see Audit Log).
- External API Demo CRUD through internal proxy endpoints.

## REST API

API resources use `/api/v1`. Dashboard can consume these endpoints; mobile clients use same contract.

```text
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id
POST   /api/v1/users/delete            # bulk delete (replaces DELETE /:id); body { ids: string[] }
PUT    /api/v1/users/:id/roles

GET    /api/v1/roles
POST   /api/v1/roles
GET    /api/v1/roles/:id
PATCH  /api/v1/roles/:id
POST   /api/v1/roles/delete            # bulk delete; body { ids: string[] }
PUT    /api/v1/roles/:id/permissions

GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:id
PATCH  /api/v1/organizations/:id
POST   /api/v1/organizations/delete    # bulk delete; body { ids: string[] }
PUT    /api/v1/organizations/:id/roles
PUT    /api/v1/organizations/:id/members

GET    /api/v1/features
POST   /api/v1/features
GET    /api/v1/features/:id
PATCH  /api/v1/features/:id
POST   /api/v1/features/delete         # bulk delete; body { ids: string[] }

GET    /api/v1/locks
POST   /api/v1/locks/acquire
GET    /api/v1/locks/status
POST   /api/v1/locks/:id/heartbeat
DELETE /api/v1/locks/:id               # hard delete (single lock; not bulk)
DELETE /api/v1/locks/:id/force         # force unlock (single lock; not bulk)

GET    /api/v1/audit-logs               # read-only; AM on Audit Logs required
GET    /api/v1/audit-logs/:id

GET    /api/v1/integrations/restful-api-dev/objects
POST   /api/v1/integrations/restful-api-dev/objects
GET    /api/v1/integrations/restful-api-dev/objects/:id
PUT    /api/v1/integrations/restful-api-dev/objects/:id
PATCH  /api/v1/integrations/restful-api-dev/objects/:id
DELETE /api/v1/integrations/restful-api-dev/objects/:id

GET    /api/v1/health
GET    /api/openapi.json
GET    /api/docs
```

Delete is bulk-only (no `DELETE /:id` single route). `POST /api/v1/<resource>/delete` with body `{ ids: string[] }` is the sole delete entrypoint for `users`, `roles`, `organizations`, and `features`; a single deletion is `{ ids: ["<one-id>"] }`. All four are soft deletes (see Data Model / Soft Delete). `GET` excludes soft-deleted rows; `POST` with the same `code`/`username` after soft delete succeeds. `RecordLock` (`DELETE /api/v1/locks/:id` / `/force`) and `integrations` deletes remain single hard deletes.

Bulk delete contract:

```text
POST /api/v1/<resource>/delete
Body: { ids: string[] }   # Zod: min 1, max 2000, unique CUIDs; deduped server-side
```

- Auth + RBAC: caller must hold `DD` for the resource's feature (e.g. `DD` on Features for `/features/delete`); checked once per request.
- Validation: `422 VALIDATION_ERROR` if `ids` is empty, `ids.length > 2000`, contains duplicates after trim, or contains non-CUID values.
- Semantics: partial success. Each id is soft-deleted transactionally (see Reuse rule); failing ids do not roll back successful ones. Response uses the success envelope with per-item status:

```json
{ "data": [
  { "id": "cuid1", "status": "deleted" },
  { "id": "cuid2", "status": "failed", "error": { "code": "LOCKED", "message": "Resource is locked by another user" } },
  { "id": "cuid3", "status": "failed", "error": { "code": "NOT_FOUND", "message": "Not found" } }
]}
```

  Overall HTTP is `200` when the request was processed (even if some items failed); `401`/`403`/`422`/`429` still apply to the whole request. Per-item `error.code` uses the Error Code Enum (`NOT_FOUND` → `404` equivalent, `LOCKED` → `423`, `FORBIDDEN` → `403`).
- Record locking: when global and per-feature locking is enabled, each id that is currently `LOCKED_BY_OTHER` returns `LOCKED` for that id; owned/expired ids proceed. Bulk delete does not acquire locks itself — it enforces existing locks per id.
- Rate limiting: one rate-limit hit per bulk request (not per id).

Every route uses Zod input validation and the API Conventions below (envelopes, error codes, pagination). Relevant status codes: `400`, `401`, `403`, `404`, `409`, `422`, `423`, `429`, `502`, and `504`.

> **Bulk delete DoS guard:** `ids` is hard-capped at `2000` by Zod (`ids.length > 2000` → `422`). This bounds transaction time and DB load. If a caller needs to delete more than 2000 rows, they must chunk into multiple bulk requests. Infra should also enforce `bodyLimit ~1MB` and DB `statement_timeout` as a defense-in-depth layer.

### CSRF Protection for Cookie-Auth Mutations

Dashboard mutations that rely on `cookieAuth` (Auth.js `HttpOnly` cookie, `SameSite=Lax`, `Secure` in production — see `lib/auth/config.ts`) are vulnerable to cross-site forged requests if the API accepts cookie auth for `POST/PATCH/PUT/DELETE`. Mitigation required for production:

- Default: enforce an anti-CSRF check on every cookie-authenticated mutation (`POST`, `PATCH`, `PUT`, `DELETE` via `cookieAuth`): require either (a) `Origin`/`Referer` header matching the app origin, or (b) a double-submit CSRF token (`X-CSRF-Token` header vs cookie). `bearerAuth` mutations are not CSRF-vulnerable (custom `Authorization` header is not auto-sent cross-site) and are exempt.
- Alternative allowed by spec: make the dashboard call `/api/v1/*` mutations via `bearerAuth` (`Authorization: Bearer <access-token>` from an in-memory short-lived token) instead of cookie. If this alternative is adopted, cookie auth is only for page navigation (`/dashboard`), not for API mutations, and the CSRF requirement above does not apply to API routes.
- Document which approach is chosen in `lib/api/auth-helpers.ts` / middleware and in `lib/openapi/registry.ts` security annotations so Swagger reflects the real requirement.

## API Conventions

### Success Envelope

All `2xx` JSON responses use:

```json
{
  "data": "<resource | resource[] | null>",
  "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

- `meta` is only present on paginated list endpoints (see Pagination below). Single-resource and mutation responses omit `meta` (or set it to `null`).
- `204 No Content` has no body.
- All responses include a `requestId` header (`x-request-id`) for tracing; optional to also include it in `meta.requestId`.

### Error Envelope

All `4xx`/`5xx` JSON responses use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": [{ "field": "username", "message": "Already taken" }]
  }
}
```

- `details` is present only for validation errors (Zod field errors) or when additional context is needed.
- `message` is human-readable and safe to display; never leak secrets, stack traces, or provider keys.

### Error Code Enum

| HTTP | `error.code` | When |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Malformed JSON, invalid query param type coercion |
| 401 | `UNAUTHENTICATED` | Missing, invalid, or expired token/session |
| 401 | `TOKEN_EXPIRED` | Access token expired (client should call refresh) |
| 403 | `FORBIDDEN` | Authenticated but missing required permission code |
| 404 | `NOT_FOUND` | Resource or route not found |
| 409 | `CONFLICT` | Unique constraint violation (username, role code, feature code) |
| 422 | `VALIDATION_ERROR` | Zod validation failure on body, query, or path params |
| 423 | `LOCKED` | Record locked by another user (response includes lock owner info) |
| 429 | `RATE_LIMITED` | Rate limit exceeded (includes `Retry-After` header) |
| 502 | `BAD_GATEWAY` | Provider returned invalid response or 4xx/5xx |
| 504 | `GATEWAY_TIMEOUT` | Provider timeout (AbortError) |
| 500 | `INTERNAL_ERROR` | Unhandled server error (never leak stack) |

Rules:

- Zod validation failures always map to `422 VALIDATION_ERROR`, never `400`.
- Malformed JSON or type coercion failures (e.g. `?page=abc`) map to `400 BAD_REQUEST`.
- All error responses must include `error.code` from this enum. No ad-hoc strings.

### Pagination, Filtering, and Sorting

Applies to all list endpoints: `GET /api/v1/users`, `/roles`, `/organizations`, `/features`, `/locks`, and `GET /api/v1/integrations/restful-api-dev/objects` (proxy passthrough may use provider pagination where applicable). Single-resource `GET` and mutations do not paginate.

Query parameters (Zod-validated; unknown params may be ignored or rejected with `422` — pick one and document in OpenAPI):

| Param | Type | Default | Constraints | Description |
| --- | --- | --- | --- | --- |
| `page` | int | `1` | >= 1 | 1-indexed page number |
| `limit` | int | `20` | 1-100 (hard cap 100) | Items per page |
| `q` | string | — | 0-100 chars, trimmed | Case-insensitive partial match across searchable fields (`username`/`displayName` for users, `name`/`code` for roles/orgs/features) |
| `sortBy` | string | `createdAt` | Whitelist per resource | Sort field |
| `sortOrder` | enum | `desc` | `asc` | `desc` | Sort direction |
| `status` | enum | — | `ACTIVE` | `INACTIVE` | Filter by status (where applicable) |

Per-resource `sortBy` whitelist:

| Resource | Allowed `sortBy` values |
| --- | --- |
| users | `username`, `createdAt`, `updatedAt`, `status` |
| roles | `name`, `code`, `createdAt` |
| organizations | `name`, `code`, `createdAt` |
| features | `name`, `sortOrder`, `createdAt` |
| locks | `acquiredAt`, `expiresAt`, `resourceType` |

Behavior:

- `meta` in the success envelope is always present for these endpoints, with `total` from `COUNT(*)` using the same filters and `totalPages = ceil(total / limit)`.
- Out-of-range `page` returns `data: []` with correct `meta`, not `404`.
- Empty `q` means no filter; `q` is escaped for Prisma `contains` mode with `mode: "insensitive"`.
- Invalid `sortBy` -> `422 VALIDATION_ERROR`; never fall back silently to a default.
- `orderBy` is applied via a Prisma whitelist only; never interpolate raw strings.

## OpenAPI and Swagger

- Generate OpenAPI 3.1 document from Zod schemas using `@asteasolutions/zod-to-openapi`.
- Serve spec at `GET /api/openapi.json`.
- Serve interactive Swagger UI at `GET /api/docs`.
- Document cookie session auth and bearer auth schemes.
- Document required RBAC code, request schemas, response schemas, and standardized errors for each endpoint.
- Document the success and error envelopes and the pagination query parameters as reusable components.
- Keep route validation and OpenAPI schemas in same source of truth.

## Audit Log

Purpose: make every CRUD mutation traceable by **who** executed it and **via which auth method** (`bearerAuth` vs `cookieAuth`). Without this, a `POST /api/v1/features/delete { ids: [...] }` via a leaked `Bearer` token is indistinguishable from a legitimate Dashboard action.

### Data Model

Append-only, never updated or soft-deleted:

```prisma
enum AuthMethod { BEARER COOKIE NONE }
enum AuditAction { CREATE UPDATE DELETE ROLE_ASSIGN PERMISSION_ASSIGN MEMBER_ASSIGN LOCK_ACQUIRE LOCK_HEARTBEAT LOCK_RELEASE LOCK_FORCE }

model AuditLog {
  id             String      @id @default(cuid())
  createdAt      DateTime    @default(now())
  actorUserId    String?
  actorUsername  String?
  authMethod     AuthMethod
  ip             String?
  userAgent      String?
  requestId      String?     // x-request-id
  action         AuditAction
  resourceType   ResourceType
  resourceId     String?     // single-target mutations
  resourceIds    String[]    // bulk delete: all ids in the request
  permissionCode String?     // RBAC code that gated the action (e.g. DD0000004)
  before         Json?       // redacted snapshot; never store passwordHash, lockTokenHash, or x-api-key
  after          Json?
  status         String      // SUCCESS | FAILED
  errorCode      String?     // FORBIDDEN, LOCKED, NOT_FOUND, etc.

  @@index([createdAt])
  @@index([actorUserId])
  @@index([resourceType, resourceId])
  @@index([authMethod])
  @@index([action])
}
```

- `ResourceType` reuses the Record Locking enum (`USER`, `ROLE`, `ORGANIZATION`, `FEATURE`, `ORGANIZATION_ROLE`, `ORGANIZATION_MEMBER`, `USER_ROLE`, `ROLE_PERMISSION`, `LOCK`) plus `AUDIT_LOG` for reads if needed.
- `authMethod` is derived from the actual auth path in `lib/api/auth-helpers.ts`: `Authorization: Bearer` verified → `BEARER`; `auth()` cookie verified → `COOKIE`; unauthenticated/system → `NONE`.
- `AuditLog` is **not** soft-deleted and is excluded from record locking.

### What Is Logged

Only state-changing mutations; `GET` is not logged to keep volume manageable. **Every new `MenuFeature` with CRUD is required to be audited** — add its mutations to this table and, if it introduces a new domain, extend `ResourceType` and the mapping below (single shared `AuditLog` table for all features; do not create per-feature audit tables):

| Endpoint | `action` |
| --- | --- |
| `POST /api/v1/users` | `CREATE` |
| `PATCH /api/v1/users/:id` | `UPDATE` |
| `POST /api/v1/users/delete` | `DELETE` (one row per bulk request; `resourceIds` holds all ids, per-id outcome in `after`) |
| `PUT /api/v1/users/:id/roles` | `ROLE_ASSIGN` |
| `POST /api/v1/roles`, `PATCH /api/v1/roles/:id`, `POST /api/v1/roles/delete` | `CREATE` / `UPDATE` / `DELETE` |
| `PUT /api/v1/roles/:id/permissions` | `PERMISSION_ASSIGN` |
| `POST /api/v1/organizations`, `PATCH ...`, `POST .../delete` | `CREATE` / `UPDATE` / `DELETE` |
| `PUT /api/v1/organizations/:id/roles` | `PERMISSION_ASSIGN` |
| `PUT /api/v1/organizations/:id/members` | `MEMBER_ASSIGN` |
| `POST /api/v1/features`, `PATCH ...`, `POST .../delete` | `CREATE` / `UPDATE` / `DELETE` |
| `POST /api/v1/locks/acquire`, `/heartbeat`, `DELETE /locks/:id`, `DELETE /locks/:id/force` | `LOCK_ACQUIRE` / `LOCK_HEARTBEAT` / `LOCK_RELEASE` / `LOCK_FORCE` |
| *Any new feature* `POST /api/v1/<feature>` | `CREATE` |
| *Any new feature* `PATCH /api/v1/<feature>/:id` | `UPDATE` |
| *Any new feature* `POST /api/v1/<feature>/delete` | `DELETE` |
| *Any new feature assignment* `PUT /api/v1/<feature>/:id/...` | `ROLE_ASSIGN` / `PERMISSION_ASSIGN` / `MEMBER_ASSIGN` as applicable |

New feature rule:

- Creating a `MenuFeature` that exposes `POST`, `PATCH`, or `POST .../delete` (bulk) **must** emit an `AuditLog` row per mutation via the shared helper (e.g. `writeAuditLog()`), with `authMethod` derived from `lib/api/auth-helpers.ts`, `resourceType` set to the feature's `ResourceType` (extend the enum when introducing a new domain, otherwise reuse `FEATURE`), and the gating `permissionCode` (`AD`/`ED`/`DD`) recorded.
- Bulk deletes for new features follow the same single-row-per-bulk-request convention (`resourceIds` + per-id outcomes in `after`).

- Failed mutations are also logged (`status: FAILED`) with `errorCode` from the Error Code Enum so brute-force or permission-probe attempts are auditable.
- Sensitive fields (`passwordHash`, `lockTokenHash`, `x-api-key`, raw provider bodies) are never written to `before`/`after`.

### Write Semantics

- Audit writes happen **after** the business `prisma.$transaction` commits (or fails), in a separate write so the business transaction's rollback does not erase the audit trail.
- Never block the business response on audit write failure — log the failure server-side and still return the business result; a background retry or best-effort write is acceptable.
- Bulk delete: one `AuditLog` row per bulk request (not one per id) to keep the table lean; per-id success/failure is stored in `after` JSON. If per-id granularity is required later, a child `AuditLogItem` table can be added.

### Read API

```text
GET /api/v1/audit-logs
GET /api/v1/audit-logs/:id
```

- Auth: `AM` on the `Audit Logs` menu feature is required (seed `Audit Logs` as `MenuFeature` with `AM/AD/ED/DD`; only `AM` is used initially — `AD/ED/DD` reserved). `SUPER_ADMIN` bypasses as usual.
- Query params (Zod-validated, reuse pagination conventions): `page`, `limit`, `q` (matches `actorUsername` / `resourceId`), `sortBy` (`createdAt`), `sortOrder`, plus filters: `authMethod` (`BEARER`|`COOKIE`|`NONE`), `action`, `resourceType`, `actorUserId`, `status`, `from`/`to` (ISO datetime range on `createdAt`).
- Response uses the standard success envelope with `meta` pagination; single-resource `GET /:id` omits `meta`.
- `AuditLog` rows are read-only — no `POST`/`PATCH`/`DELETE` endpoints.

### Dashboard

- `GET /dashboard/audit-logs` lists logs with columns: Time, Actor, Method (badge `COOKIE`/`BEARER`/`NONE`), Action, Resource, Permission, IP, Request ID, Status.
- Filters: auth method, action, resource type, actor, date range. Method filter is the primary audit use case (e.g. flag `DELETE` via `BEARER` when actor normally uses `COOKIE`).
- Detail drawer/page shows `before`/`after` diff, `resourceIds` for bulk deletes, and per-id outcomes.

### Retention

- Table grows monotonically; add a retention policy (e.g. 90 days) via a periodic hard-delete of `createdAt < now() - interval` — out of scope for MVP but document the expectation and keep indexes for efficient range deletes.

### RBAC Seed

- Seed `Audit Logs` feature after `External API Demo` in the established seed order (Users=0000001, Roles=0000002, Organizations=0000003, Features=0000004, Locked Records=0000005, External API Demo=0000006, **Audit Logs=0000007**). Its `AM/AD/ED/DD` codes follow the sequence; `SUPER_ADMIN` gets all four.

## Transactions and Rollbacks

Use `prisma.$transaction()` for all multi-table mutations. Throwing inside callback rolls back automatically; successful callback commits automatically.

Transaction-required operations:

- Public registration and default `USER` role assignment.
- Admin user creation and initial role assignment.
- Password/status changes and refresh-token revocation.
- Bulk user soft deletion (per-id suffix + `deletedAt` in partial-success transactions) and related token/assignment cleanup.
- Menu feature creation, four permission creation, and `SUPER_ADMIN` assignment (including sequence generation).
- Bulk menu feature soft deletion (per-id suffix + `deletedAt`) and per-feature permission relation hard-delete.
- Role-permission replacement.
- User-role and organization-role assignments.
- Organization membership changes.
- Refresh-token rotation.
- Record lock acquire, heartbeat, release, and force release when multiple queries apply.
- Persistent rate-limit counter update.

Use database constraints alongside transactions for correctness. Feature permission codes are unique. Record locks use a unique resource constraint. Sequence generation uses a locked counter or DB sequence (see RBAC / Permission Codes). Soft delete reuses `code`/`username` via suffix (see Data Model / Soft Delete); deleted permission codes are never reused.

External systems cannot participate in PostgreSQL transactions. For external create plus local persistence, use a compensating action such as provider delete if local transaction fails after external success. The initial external sample is proxy-only and has no local persistence after provider calls.

## Rate Limiting

Persist rate-limit state in PostgreSQL so it works across multiple Docker instances.

Default rules:

| Target | Limit | Key |
| --- | --- | --- |
| Login | 5 per 15 minutes | IP plus username |
| Register | 5 per hour | IP |
| Refresh | 20 per 15 minutes | IP plus refresh token |
| Protected API | 120 per minute | User ID, fallback IP |
| Health | Unrestricted | None |
| API docs/spec | 60 per minute | IP |

Exceeded limit returns `429 Too Many Requests` with `Retry-After` and error code `RATE_LIMITED`. `RATE_LIMIT_ENABLED=false` disables rate limiting for development.

### RateLimitEntry Schema

```prisma
model RateLimitEntry {
  id          String   @id @default(cuid())
  key         String   @unique
  count       Int      @default(1)
  windowStart DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([windowStart])
}
```

- `key` format examples: `login:ip:1.2.3.4:username:alice`, `register:ip:1.2.3.4`, `api:user:clxxxxx`, `api:ip:1.2.3.4`
- All increments happen inside `prisma.$transaction`.

### IP Extraction and Window

- IP is extracted from the first value of `x-forwarded-for` (split by `,`, trimmed) when `TRUST_PROXY=true`; otherwise from the direct socket/connection IP. Fallback to `x-real-ip` if `x-forwarded-for` is absent. Default `TRUST_PROXY=false` for safety.
- In Docker behind a reverse proxy or ingress, set `TRUST_PROXY=true`.
- Document `TRUST_PROXY` in Configuration.

### Window Type

- Fixed window (simpler, PostgreSQL-friendly). On each request: if `now - windowStart > windowSeconds`, reset `count = 1` and `windowStart = now()`; otherwise increment `count`.
- On exceed: return `429` with `Retry-After: <seconds until window reset>` and optional `X-RateLimit-*` headers.
- Cleanup: expired entries are pruned lazily on next hit or via a periodic job (not required for MVP; the index on `windowStart` keeps queries fast).

## Record Locking

### Goal

Prevent concurrent input and mutation of same resource. Read-only views do not acquire locks. Any page or detail action that begins input, assignment, edit, delete, or another mutation must acquire a lock when locking is enabled for that feature.

### RecordLock Table

```prisma
enum ResourceType {
  USER
  ROLE
  ORGANIZATION
  FEATURE
  ORGANIZATION_ROLE
  ORGANIZATION_MEMBER
  USER_ROLE
  ROLE_PERMISSION
  LOCK
}

model RecordLock {
  id            String       @id @default(cuid())
  resourceType  ResourceType
  resourceId    String
  lockTokenHash String
  ownerUserId   String
  acquiredAt    DateTime     @default(now())
  heartbeatAt   DateTime     @default(now())
  expiresAt     DateTime
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  ownerUser User @relation(fields: [ownerUserId], references: [id], onDelete: Cascade)

  @@unique([resourceType, resourceId])
  @@index([ownerUserId])
  @@index([expiresAt])
}
```

`@@unique([resourceType, resourceId])` is required to prevent two active editors from acquiring same record simultaneously. One user opening same record in a second tab also gets read-only mode.

### resourceType Enum

Allowed values (uppercase, validated by Zod enum):

| `resourceType` | API Resource | Example `resourceId` |
| --- | --- | --- |
| `USER` | `/api/v1/users/:id` | user CUID |
| `ROLE` | `/api/v1/roles/:id` | role CUID |
| `ORGANIZATION` | `/api/v1/organizations/:id` | org CUID |
| `FEATURE` | `/api/v1/features/:id` | feature CUID |
| `USER_ROLE` | `/api/v1/users/:id/roles` assignment | parent user CUID |
| `ROLE_PERMISSION` | `/api/v1/roles/:id/permissions` assignment | parent role CUID |
| `ORGANIZATION_ROLE` | `/api/v1/organizations/:id/roles` assignment | parent org CUID |
| `ORGANIZATION_MEMBER` | `/api/v1/organizations/:id/members` assignment | parent org CUID |
| `LOCK` | `/api/v1/locks/:id` (force unlock audit) | lock CUID |

- Unknown `resourceType` -> `422 VALIDATION_ERROR`; never accept a free-form string.
- `resourceId` existence is validated (return `404` if the target does not exist) before lock creation.
- For assignment mutations (e.g. `PUT /api/v1/users/:id/roles`), the lock is on the parent resource (`USER` with `resourceId = :id`) for MVP. Separate assignment-level types (`USER_ROLE`, etc.) may be used when finer granularity is needed; document the chosen mapping.
- `GET /api/v1/locks?resourceType=USER` filters by enum; `GET /api/v1/locks/status?resourceType=USER&resourceId=...` checks a specific resource.

### Lifecycle

- `POST /api/v1/locks/acquire` creates lock transactionally when no valid lock exists. Body: `{ resourceType, resourceId }` (Zod-validated enum + CUID). Returns `{ data: { id, resourceType, resourceId, expiresAt, heartbeatAt }, lockToken }` where `lockToken` is plaintext and returned only once.
- `GET /api/v1/locks/status` returns lock state for frontend read-only handling. Query: `?resourceType=&resourceId=`. Returns `{ data: { locked: boolean, owner?: { id, username }, expiresAt? } }`.
- Server returns opaque plaintext lock token only once to lock owner. Database stores only its hash (`lockTokenHash`).
- Client keeps token only in page memory and sends `X-Record-Lock-Token` with mutations.
- Client sends heartbeat every 30 seconds (`POST /api/v1/locks/:id/heartbeat` with `X-Record-Lock-Token`).
- Lock TTL is 2 minutes. Heartbeat extends `expiresAt` to `now + 2 minutes`.
- Custom Back button releases lock (`DELETE /api/v1/locks/:id` with token) before navigation.
- `pagehide` uses best-effort release via `navigator.sendBeacon` with `DELETE`.
- Crashes, closed tabs, and network failures rely on TTL expiry.
- Logout releases all locks held by the user (`DELETE` all `RecordLock` where `ownerUserId == user.id`).
- Other users can view resource while lock exists but inputs and mutating actions are read-only/disabled (see Frontend State Machine).
- Backend must return `423 Locked` for any mutation without a matching active lock token when locking is enabled for that feature. Response: `{ error: { code: "LOCKED", message: "Resource is locked by another user", details: { owner, expiresAt } } }`.
- Expired locks: if `expiresAt < now()`, the lock is considered expired. `GET /status` reports it as unlocked; next `POST /acquire` succeeds and overwrites it. A periodic cleanup may delete expired rows but is not required for correctness.

### Frontend State Machine

State managed by `hooks/useRecordLock.ts`:

| State | Condition | UI Behavior |
| --- | --- | --- |
| `UNLOCKED` | No `RecordLock` row or `expiresAt < now()` | Acquire on entering edit mode; show editable or "Click Edit to acquire lock" |
| `LOCKED_BY_SELF` | Lock exists, `ownerUserId == currentUser`, not expired | Inputs enabled; heartbeat active every 30s; release on Back / `pagehide` / logout; show "You are editing" + countdown to `expiresAt` |
| `LOCKED_BY_OTHER` | Lock exists, owner is another user, not expired | All inputs and mutating buttons disabled; show "Locked by {username} until {expiresAt}"; poll `GET /locks/status` every 30s |
| `EXPIRED` | Own lock's `expiresAt < now()` (heartbeat missed) | Show modal "Lock expired, reacquire?" with Reacquire button; treat as `UNLOCKED` for next acquire |

Transitions:

| From | Event | To | Action |
| --- | --- | --- | --- |
| `UNLOCKED` | `acquire()` returns 200 | `LOCKED_BY_SELF` | Store token in memory, start heartbeat interval (30s) |
| `UNLOCKED` | `acquire()` returns 423 | `LOCKED_BY_OTHER` | Show owner info from response |
| `LOCKED_BY_SELF` | heartbeat 200 | `LOCKED_BY_SELF` | Update `expiresAt` |
| `LOCKED_BY_SELF` | heartbeat 423/401 | `EXPIRED` / `UNLOCKED` | Stop heartbeat, set read-only |
| `LOCKED_BY_SELF` | `release()` / unmount / Back button | `UNLOCKED` | `DELETE /locks/:id` with `X-Record-Lock-Token` (await before `router.push`) |
| `LOCKED_BY_SELF` | `pagehide` | `UNLOCKED` (best-effort) | `navigator.sendBeacon` `DELETE` |
| `LOCKED_BY_OTHER` | poll shows expired | `UNLOCKED` | Enable Reacquire button |
| `LOCKED_BY_OTHER` | `force` by authorized user (`DD` on Locked Records) | `UNLOCKED` | Admin action via `DELETE /locks/:id/force` |

Additional rules:

- Read-only views (detail `GET` without edit intent) do NOT acquire a lock.
- Acquire is triggered on: clicking Edit, opening an assignment drawer, clicking Delete (confirm dialog acquires first), or entering a create form for an assignment.
- Heartbeat failure 2x consecutively -> show warning banner "Connection lost, lock may expire" but do NOT auto-release.
- Token is never stored in `localStorage`/`sessionStorage`; only in hook/component memory. A page refresh loses the token and must reacquire.
- Same user in a second tab -> second tab sees `LOCKED_BY_OTHER` (enforced by `@@unique([resourceType, resourceId])`).

Hook contract (`hooks/useRecordLock.ts`):

```ts
function useRecordLock(resourceType: ResourceType, resourceId: string): {
  state: "UNLOCKED" | "LOCKED_BY_SELF" | "LOCKED_BY_OTHER" | "EXPIRED";
  token: string | null; // memory only
  owner: { id: string; username: string } | null;
  expiresAt: Date | null;
  acquire: () => Promise<void>;
  release: () => Promise<void>;
}
```

### Controls

- `SystemSetting.recordLockEnabled` controls global enable or disable.
- `MenuFeature.recordLockEnabled` controls per-feature enable or disable.
- Global off bypasses all lock checks.
- Global on plus feature off bypasses that resource lock check.
- Default enabled for User, Role, Organization, Feature/Menu, and related assignment mutations.
- `SystemSetting.recordLockEnabled` can only be changed by `SUPER_ADMIN` or a role with `ED` on the relevant system feature (document which permission code gates it; recommend `ED` on a `System Settings` feature or `SUPER_ADMIN` only).

### Locked Records Menu

Feature `Locked Records` is seeded with standard AM/AD/ED/DD permissions.

- `AM`: show locked record list.
- `DD`: force unlock button (`DELETE /api/v1/locks/:id/force`).
- `AD` and `ED`: unused initially.

`SUPER_ADMIN` and users granted `DD` for `Locked Records` can force unlock. Force unlock deletes only `RecordLock`; it never deletes original resource data.

## External API Integration Sample

Provide server-side sample integration for `https://restful-api.dev/`.

Structure:

```text
lib/integrations/
  http-client.ts
  restful-api-dev/
    client.ts
    schemas.ts
    service.ts
    types.ts
```

Rules:

- Use `RESTFUL_API_DEV_API_KEY` only in server-side client as `x-api-key`. Only send the header when the env var is non-empty; if empty, omit it (provider public endpoints still work for demo; do not send `x-api-key: ""`).
- Browser and mobile clients call application proxy endpoints, never provider endpoint with provider key.
- Use authenticated provider collection such as `starter-demo` for sample CRUD (if the provider supports collections; otherwise use the `objects` root).
- Seed `External API Demo` feature and its AM/AD/ED/DD permissions. Sequence value follows actual seed order (see RBAC seed order).
- Dashboard page `/dashboard/external-api-demo` has list, JSON data form, create, edit, delete, loading, empty, timeout, and provider-error states.
- Include internal proxy routes in Swagger.
- Unit tests mock provider fetch; no test makes real provider request.
- Provider quota is suitable for demo/testing, not critical production workload.

### Client Configuration

- Timeout: 5000ms per request via `AbortController` + `setTimeout`, wrapping `fetch(..., { signal })` in `lib/integrations/http-client.ts`. Configurable via `RESTFUL_API_DEV_TIMEOUT_MS` (default `5000`). No request may hang beyond the timeout.
- No-store caching: `fetch(..., { cache: "no-store" })` for all proxy calls.
- `x-api-key` handling: server-only, never exposed in client bundles or OpenAPI doc examples.
- Base URL: `RESTFUL_API_DEV_BASE_URL` (default `https://api.restful-api.dev`), validated as a URL at boot.
- When `RESTFUL_API_DEV_API_KEY` is empty or missing: log a warning at startup and every proxy endpoint returns `503 { error: { code: "UPSTREAM_NOT_CONFIGURED", message: "External integration not configured" } }` without attempting the provider fetch. Alternatively, allow the proxy to still try without the key if the provider supports public access; document the chosen behavior.

### Retry and Error Mapping

- Retry: 0 retries for non-idempotent `POST`/`PUT`/`PATCH`/`DELETE`. Optional 1 retry for idempotent `GET` on network error only, not on `4xx`. No exponential backoff needed for the demo; document that retry is intentionally minimal to avoid duplicate provider objects.
- Zod validates every provider response before returning to the client; invalid shape is treated as a provider error.

| Provider Outcome | App Status | `error.code` | Notes |
| --- | --- | --- | --- |
| Timeout (`AbortError` after 5000ms) | `504` | `GATEWAY_TIMEOUT` | — |
| `4xx` from provider | `502` | `BAD_GATEWAY` | Do not leak provider raw body; log it server-side |
| `5xx` from provider | `502` | `BAD_GATEWAY` | Provider down |
| Invalid JSON / Zod validation fail on provider response | `502` | `BAD_GATEWAY` | Log raw body server-side, return sanitized message |
| Missing API key (when required) | `503` | `UPSTREAM_NOT_CONFIGURED` | Fail before fetch |

- Provider error responses must not leak `x-api-key` or internal stack traces.
- All proxy routes must document `502`/`504`/`503` errors in OpenAPI.

## Unit Tests

Vitest is optional support tooling:

```text
npm run test
npm run test:watch
```

- Do not run tests during `npm run dev`, `npm run build`, or Docker image build.
- Use mocks or in-memory fixtures. Tests must not connect to configured PostgreSQL server or external provider.

Required coverage:

- Access-code generation and uniqueness (including sequence generation and no-reuse after delete).
- Direct and organization-derived effective permissions, including inactive status filtering.
- `SUPER_ADMIN` bypass and protection against removal, downgrade, disable, or deletion.
- Public registration flag (`false` default, `true` opt-in).
- Password and token login failures (including generic error message for invalid credentials).
- Access-token expiry, refresh rotation, logout revocation, disabled user rejection, and permission change impact.
- Rate-limit counter, window reset, `429` result, and `TRUST_PROXY` / `Retry-After` behavior.
- Transaction rollback behavior for registration, feature generation (with sequence), and role assignments.
- Concurrent record lock acquire, heartbeat, expiry, release, force unlock permission, and `423` enforcement; global and per-feature lock disable.
- Audit log append on every mutation (including bulk delete per-id outcomes), `authMethod` (`BEARER` vs `COOKIE`) correctness, read access gated by `AM` on Audit Logs, and retention/index behavior.
- External integration client headers, timeout (AbortController), invalid response, error mapping (`502`/`504`/`503`), and key non-disclosure.

## Docker Deployment

- Docker contains only Next.js application. PostgreSQL remains external and uses `DATABASE_URL`.
- Next.js configuration uses `output: "standalone"`.
- Use multi-stage Dockerfile (`deps` -> `builder` -> `runner`).
- Runtime image contains only standalone output, static assets, required public assets, and generated Prisma client.
- Run as non-root user.
- Expose port 3000 with `HOSTNAME=0.0.0.0`.
- Add health check using `GET /api/v1/health`.

### Entrypoint and Migration

Provide `docker/entrypoint.sh` (executable):

```sh
#!/bin/sh
set -e
echo "Waiting for database..."
until npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1" 2>/dev/null; do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done
echo "Running migrations..."
npx prisma migrate deploy
echo "Seeding (idempotent)..."
npx prisma db seed || node prisma/seed.js || true
exec node server.js
```

- `migrate deploy` is mandatory in the runner; never `migrate dev` in production.
- Seed must be idempotent (upsert). See Data Model seed requirements.
- If `SUPER_ADMIN_USERNAME` env differs from the existing seed user, do not create a second superadmin; log a warning.
- `DATABASE_URL` must be reachable at entrypoint; otherwise the container exits non-zero (orchestrator restart policy handles it).

### Health Check

- Dockerfile: `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/v1/health | grep -q '"status":"ok"' || exit 1`
- `GET /api/v1/health` implementation: try `prisma.$queryRaw` ``SELECT 1`` with a 2s timeout.
  - DB reachable -> `200 { "status": "ok", "db": "up" }`
  - DB unreachable -> `503 { "status": "error", "db": "down" }` with `Retry-After: 10`.
  - Health is never `500`.
- `GET /api/v1/health` is excluded from rate limiting and does not require auth (already in Rate Limiting).

### Standalone Output

- `next.config.js` must have `output: "standalone"`.
- `docker/Dockerfile` runner stage copies: `.next/standalone`, `.next/static`, `public`, `prisma/migrations`, Prisma generated client (`node_modules/.prisma` or equivalent).

### Compose

- `docker-compose.yml` contains application service only and reads runtime values from environment or `.env`.
- `.dockerignore` excludes `.env`, `node_modules`, `.next` (except standalone output copied in runner).

## Shared UI Components

All UI primitives below are **shared components** (`components/ui/*`) — single source of truth. Every dashboard page and CRUD view **must** import from `components/ui/*`; duplicating table, select, or skeleton markup inline is forbidden (enforced via lint rule `no-restricted-syntax` and code-review checklist). Changing one file in `components/ui/*` must propagate to all consumers.

### Skeleton Loading (Mandatory — All States)

Spinner/placeholder-text loading states are forbidden. Every loading state **must** use skeleton:

- **Primitives** (`components/ui/skeleton.tsx`): `Skeleton`, `SkeletonText` (multi-line), `SkeletonAvatar`, `SkeletonCard`, `SkeletonTableRows`, `SkeletonForm`. Each renders `aria-hidden="true"` on the skeleton and `aria-busy="true"` on the container.
- **Style**: reuse `.skeleton`, `.skeleton-line`, `.skeleton-avatar` + `@keyframes shimmer 1.4s` (single source of truth in `app/globals.css`, migrated from `uidesign/src/styles/globals.css`). `prefers-reduced-motion: reduce` disables shimmer.
- **Coverage**: DataTable rows, card grids, form fields, detail views, stat cards, and every `loading.tsx` / `Suspense fallback`. No `loading.tsx` or `Suspense fallback` may render a spinner.
- **Composition**: page-level `loading.tsx` and component-level `Suspense fallback` both use the same `Skeleton*` primitives — no ad-hoc skeleton markup outside `components/ui/skeleton.tsx`.
- **Reference**: `uidesign/src/js/components/skeleton.js` (9 helpers: `courtCardSkeleton`, `tableRowSkeleton`, `adminStatSkeleton`, etc.) is the visual reference to migrate to JSX primitives — do not copy raw HTML strings.

### Lazy Loading (Mandatory — Route + Heavy Components)

- **Route-level**: every `app/(dashboard)/dashboard/{users,roles,organizations,features,locked-records,audit-logs,external-api-demo}/page.tsx` is loaded via `next/dynamic` or a `loading.tsx` + `React.Suspense` boundary per segment. The `loading.tsx` / `fallback` **must** be a `Skeleton*` component.
- **Component-level**: heavy components (`DataTable`, `Select`, `Modal`, `Calendar`, etc.) are `next/dynamic`-imported where they are used. `Select` uses `dynamic(..., { ssr: false })` because its dropdown renders via portal/positioning.
- **Images**: use `next/image` with `loading="lazy"` (replaces `uidesign/src/js/lib/lazyLoad.js` IntersectionObserver `img[data-src]`). Non-`next/image` assets keep the `img-fade` / `is-loaded` fallback pattern.
- **Prefetch**: `next/link` prefetch remains enabled; lazy splits JS chunks only, not data fetching. All `Suspense fallback` and `loading.tsx` use `Skeleton*` — never a spinner.

### DataTable (Mandatory — Always Use, Spec-Integrated)

Every list view **must** use the shared `components/ui/data-table.tsx`. Ad-hoc `<table>` markup outside this file is forbidden.

Contract:

```tsx
type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[] // { key, header, sortable?, render? }
  meta: { page: number; limit: number; total: number; totalPages: number } | null
  sortBy?: string; sortOrder?: "asc" | "desc"
  onSortChange?: (sortBy: string, order: "asc"|"desc") => void
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  onSearch?: (q: string) => void // debounced ~300ms
  q?: string
  statusFilter?: "ACTIVE" | "INACTIVE"
  loading?: boolean
  emptyText?: string
  rowKey: keyof T | ((row: T) => string)
}
```

- **Pagination / Sorting / Filtering**: fully integrated with `## API Conventions > Pagination, Filtering, and Sorting` and `## Success Envelope`. Emits `page` (1-indexed, default `1`, `>=1`), `limit` (default `20`, `1-100` hard cap), `q` (`0-100` chars trimmed, `mode: "insensitive"` server-side), `sortBy` (whitelist per resource — `users: username/createdAt/updatedAt/status`, `roles: name/code/createdAt`, `organizations: name/code/createdAt`, `features: name/sortOrder/createdAt`, `locks: acquiredAt/expiresAt/resourceType`), `sortOrder` (`asc`|`desc`), `status` (`ACTIVE`|`INACTIVE`). Invalid `sortBy` must surface `422 VALIDATION_ERROR` (never silent fallback). Out-of-range `page` renders `data: []` with correct `meta` and `totalPages = ceil(total/limit)`.
- **URL sync**: `page/limit/q/sortBy/sortOrder/status` are synced to `URLSearchParams` (shallow routing) so refresh/share preserves state. Server validates with Zod: coercion failures → `400 BAD_REQUEST`, Zod failures → `422 VALIDATION_ERROR`, both with standardized `error.code`.
- **States**: `loading` → `SkeletonTableRows` (`rows={limit}`, `cols={columns.length}`); `data.length===0 && !loading` → empty state (icon + `emptyText` + CTA); fetch errors are handled at the page level, not inside DataTable.
- **A11y**: semantic `<table>`, `aria-sort` on sortable `<th>`, keyboard-navigable headers.
- **Mandatory consumers**: `app/(dashboard)/dashboard/{users,roles,organizations,features,locked-records,audit-logs,external-api-demo}/page.tsx` and `app/(dashboard)/dashboard/page.tsx` stats — no page may render a list without `DataTable`.

### Select — Select2-Style (Mandatory — Always Use)

Every dropdown/select **must** use the shared `components/ui/select.tsx` (FlyonUI-styled, headless logic). Native `<select>` outside this file is forbidden.

Contract:

```tsx
type SelectOption = { value: string; label: string; disabled?: boolean }
type SelectProps = {
  options?: SelectOption[]                 // sync
  loadOptions?: (input: string) => Promise<SelectOption[]> // async
  value?: string | string[]                // single vs multi via `multiple`
  multiple?: boolean
  searchable?: boolean                     // default true (select2)
  clearable?: boolean
  placeholder?: string
  debounceMs?: number                      // default 300 for async
  onChange: (value: string | string[] | null) => void
  loading?: boolean
  error?: string
}
```

- **Searchable** (select2): client-side filter for `options`, debounced `loadOptions` for async (aborts previous request). Dropdown shows skeleton rows while `loading`, `"No results"` when empty, and `"Failed to load"` on error.
- **Single & multi**: multi renders chips with `×` remove; `Backspace` removes last chip; `clearable` shows `×` in the input.
- **Portal**: dropdown renders via fixed portal so it is not clipped inside cards/modals; loaded with `ssr: false`.
- **Keyboard**: `ArrowUp/Down` navigate, `Enter` select, `Esc` close, `Backspace` remove (multi).
- **A11y**: `role="combobox"`, `aria-expanded`, `aria-controls`, `role="listbox"` / `role="option"`.
- **Usage**: all filters (`status`, `role`, `organization`, `sortBy`, etc.) and form selects — replaces every native `<select>` (e.g. `uidesign/courts.html` filter selects).

### Shared Enforcement

- Lint: `no-restricted-syntax` bans `<table>` and `<select>` in `app/(dashboard)/**` except inside `components/ui/*`.
- Review checklist: any PR introducing a list or dropdown outside `components/ui/*` is rejected.
- `components/ui/button.tsx` (`CodeAccess?`) and `components/ui/access.tsx` (`CodeAccess`) from `## RBAC > UI and Backend Enforcement` are also shared — row actions and form submits in `DataTable` must use them.

## Folder Layout

```text
app/
  (auth)/
  (dashboard)/dashboard/
  api/auth/[...nextauth]/
  api/docs/
  api/openapi.json/
  api/v1/
  api/v1/audit-logs/
  globals.css
components/
  auth/
  dashboard/
  features/
  organizations/
  roles/
  users/
  ui/
    access.tsx
    button.tsx
    data-table.tsx
    select.tsx
    skeleton.tsx
    lazy.tsx
hooks/
  useRecordLock.ts
lib/
  api/
  auth/
  integrations/
  openapi/
  rate-limit/
  rbac/
  env.ts
  prisma.ts
prisma/
  migrations/
  schema.prisma
  seed.ts
tests/unit/
  data-table.test.tsx
  select.test.tsx
  skeleton.test.tsx
types/
docs/
  ui-shared-components.md
tasks/
```
