# Epic E1 — Bootstrap & Foundation

## Tujuan

Menyiapkan fondasi project Next.js sesuai `starter-kit-spec.md` agar semua epic berikutnya bisa dibangun di atasnya.

---

## T01 — Init Next.js project dari starter-kit spec

- **Estimasi:** S (≤1 hari)
- **Dep:** —
- **Status:** DONE

### Deskripsi

Inisialisasi project Next.js App Router + TypeScript strict + Tailwind CSS 4 + struktur folder sesuai spec.

### Checklist

- [x] `npx create-next-app` atau manual setup (App Router, TS, ESLint, `src` dir opsional tapi prefer `app/` di root sesuai spec)
- [x] `next.config.js` → `output: "standalone"`
- [x] `tailwind.config` / Tailwind 4 setup (via `@tailwindcss/postcss` atau sesuai versi)
- [x] `app/globals.css` — copy & adapt dari `uidesign/src/styles/globals.css` (Serene Athleticism: `@theme`, `.skeleton`, `shimmer 1.4s`, `prefers-reduced-motion`, `.card-shadow`, `.glass`, `.img-fade`)
- [x] Buat struktur folder: `app/`, `components/`, `lib/`, `prisma/`, `hooks/`, `types/`, `docs/`, `tasks/`
- [x] ESLint + `no-restricted-syntax` ban `<table>`/`<select>` di `app/(dashboard)/**` kecuali `components/ui/*`
- [x] `.env.example` dengan placeholder aman (no real secret, `sslmode=disable` untuk dev example saja)
- [x] `.gitignore` (`.env`, `node_modules`, `.next`, `dist`)

### Acceptance Criteria

- `npm run dev` dan `npm run build` sukses tanpa error
- Token Serene Athleticism ter-load (cek landing placeholder)

---

## T02 — Env validation & config

- **Estimasi:** S
- **Dep:** T01
- **Status:** DONE

### Deskripsi

Implementasi `lib/env.ts` dengan Zod fail-fast sebelum Prisma init.

### Checklist

- [x] `lib/env.ts` — Zod schema untuk: `DATABASE_URL` (required), `AUTH_SECRET`/`JWT_SECRET` (>=32 chars & must differ), `SUPER_ADMIN_USERNAME/PASSWORD` (anti-default di production), `PUBLIC_REGISTRATION_ENABLED` (default false), `RATE_LIMIT_*`, `RESTFUL_API_DEV_BASE_URL/TIMEOUT_MS/API_KEY`, `TRUST_PROXY`
- [x] Throw `Error("[env] Invalid ...")` dan exit 1 jika invalid — sebelum Prisma init
- [x] Log effective config tanpa secret (redacted)
- [x] `DATABASE_URL` warn jika `sslmode=disable` di production

### Acceptance Criteria

- Invalid secret → boot exit 1
- Log tidak bocorkan secret
- `.env.example` hanya placeholder

---

## T03 — Prisma setup & soft-delete baseline

- **Estimasi:** M (1–2 hari)
- **Dep:** T02
- **Status:** DONE

### Deskripsi

Setup Prisma + PostgreSQL + semua model inti dari spec.

### Checklist

- [x] `prisma/schema.prisma` — datasource `postgresql`, generator `prisma-client-js`
- [x] Models: `User`, `Role`, `Permission`, `MenuFeature`, `UserRole`, `RolePermission`, `Organization`, `OrganizationRole`, `OrganizationMember`, `RefreshToken`, `RateLimitEntry`, `PermissionSequence`, `SystemSetting`, `RecordLock`, `AuditLog`
- [x] Enums: `UserStatus`, `RoleStatus`, `OrganizationStatus`, `FeatureStatus`, `AuthMethod`, `AuditAction`, `ResourceType` (9 values spec)
- [x] Soft-delete: `deletedAt DateTime?` + `@@index([deletedAt])` pada User/Role/Organization/MenuFeature
- [x] `Permission.code` `@@unique([code])` (9 chars)
- [x] `RecordLock @@unique([resourceType, resourceId])`
- [x] `lib/prisma.ts` singleton
- [x] `prisma migrate dev` + `prisma generate` — perlu `! npm install` dulu (auto mode block), lalu `! npx prisma migrate dev --name init` & `! npx prisma generate`

### Acceptance Criteria

- `npx prisma migrate dev` & `generate` sukses
- Semua unique/index constraint sesuai spec

---

## T04 — Seed idempoten starter-kit

- **Estimasi:** M
- **Dep:** T03
- **Status:** DONE — verified 2026-08-20 (`npx prisma migrate dev --name init` + `generate` + `db seed` 2x idempoten OK; 28 permissions, nextVal=8)

### Deskripsi

Seed data awal yang idempoten (upsert, re-run aman).

### Checklist

- [x] `prisma/seed.ts` — upsert `PermissionSequence` (singleton nextVal)
- [x] Seed 3 roles: `SUPER_ADMIN`, `ADMIN`, `USER` (SUPER_ADMIN protected)
- [x] Seed superadmin user (`superadmin/superadmin` Argon2id hash, dev only)
- [x] Seed 7 MenuFeature: Users 0000001, Roles 0000002, Organizations 0000003, Features 0000004, Locked Records 0000005, External API Demo 0000006, Audit Logs 0000007 — tiap feature generate 4 permission via sequence
- [x] Assign semua permission ke SUPER_ADMIN
- [x] `SystemSetting` (recordLockEnabled, dll)
- [x] Verifikasi idempotency: `npx prisma db seed` 2x tidak duplikat

### Acceptance Criteria

- Re-run seed tidak buat duplikat
- SUPER_ADMIN memiliki semua `AM/AD/ED/DD` 0000001–0000007
- Sequence `nextVal` lanjut dengan benar
