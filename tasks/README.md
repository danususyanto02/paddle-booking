# Kinetic Court — Task List

> Sumber: `starter-kit-spec.md` + `uidesign/` (Kinetic Court). Keputusan: 38 task / 10 epic, mock payment, external API demo tetap ada (0000006), paddle features 0000008–0000011.
> Detail lengkap: `C:\Users\Danu\.claude\plans\ok-saya-mau-buat-proud-pond.md`

## Legend

- Estimasi: `S` ≤ 1 hari, `M` 1–2 hari, `L` 2–3 hari (1 dev)
- Status: `TODO` → `DOING` → `DONE`
- `Dep` = task dependensi, `AC` = acceptance criteria ringkas

---

## E1 — Bootstrap & Foundation

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T01 | Init Next.js project dari starter-kit spec | S | — | DONE | `npm run dev/build` jalan, token Serene Athleticism ter-load |
| T02 | Env validation & config (`lib/env.ts`) | S | T01 | DONE | Boot log tanpa secret, exit 1 jika invalid |
| T03 | Prisma setup & soft-delete baseline | M | T02 | DONE | `prisma migrate dev` & `generate` sukses |
| T04 | Seed idempoten starter-kit (0000001–0000007) | M | T03 | DONE | Re-run seed tidak duplikat, SUPER_ADMIN dapat semua permission |

## E2 — Domain Padel — Data Model

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T05 | Model Court & Booking + ResourceType | M | T04 | DONE | Migration ok |
| T06 | Seed Courts (8 data) + Members finance mock | S | T05 | DONE | `GET /api/v1/courts` return 8 rows |
| T07 | Lib pricing & slots (port uidesign) | S | T05 | DONE | `calcTotal(180000,90)=285000`, `canFit` cegah >22:00 |

## E3 — Auth, RBAC, Keamanan

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T08 | Auth.js Credentials + JWT Bearer | M | T04 | DONE | Login generic 401, token tidak di localStorage |
| T09 | RBAC effective permissions + MenuFeature paddle (0000008–0000011) | M | T08 | DONE | Tanpa AM → 403, inactive feature → 404 |
| T10 | CSRF protection untuk cookie mutations | S | T08 | TODO | Forged cookie POST → 403 |

## E4 — Shared UI — Migrasi uidesign → Next.js

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T11 | Globals & layout shell | S | T01 | TODO | Visual 1:1 uidesign |
| T12 | Skeleton primitives | S | T11 | TODO | Semua loading pakai Skeleton, no spinner |
| T13 | DataTable (wajib) | M | T12 | TODO | `page` out-of-range → `data:[]` |
| T14 | Select (wajib, Select2-style) | M | T12 | TODO | Semua filter pakai Select |
| T15 | Button/CodeAccess & Access | S | T09 | TODO | Tanpa permission tombol tidak render |

## E5 — Public Flow

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T16 | Landing `/(public)/page.tsx` | M | T11,T12 | TODO | Search → `/courts?q=` |
| T17 | Courts listing `/(public)/courts` | M | T13,T14 | TODO | Filter & pagination preserve |
| T18 | Court Detail `/(public)/courts/[id]` | S | T17 | TODO | Soft-deleted → 404 |
| T19 | API Courts CRUD (admin) | M | T05,T09 | TODO | Bulk delete partial success |

## E6 — Booking Engine (Mock Payment)

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T20 | Slot availability API | M | T07,T19 | TODO | Conflict → occupied |
| T21 | Booking page `/(public)/booking` | M | T20,T07 | TODO | Total live IDR, occupied disabled |
| T22 | Checkout + Success (Mock) | M | T21 | TODO | Race → 409, success tampil BK-* |
| T23 | User Dashboard `/(public)/dashboard` | M | T22 | TODO | Cancel → slot free |

## E7 — Admin

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T24 | Admin Dashboard `/dashboard` | S | T19,T22 | TODO | Stats dari API |
| T25 | Admin Courts `/dashboard/courts` | S | T19 | TODO | Tanpa lock token → 423 |
| T26 | Admin Bookings `/dashboard/bookings` | S | T22 | TODO | Filter status & date |
| T27 | Admin Members `/dashboard/members` | S | T13 | TODO | CSV export |
| T28 | Admin Reports `/dashboard/reports` | S | T27 | TODO | growthPct & totalRevenue sesuai mock |

## E8 — Cross-Cutting

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T29 | Rate limiting (PostgreSQL) | S | T03 | TODO | 6th login → 429 |
| T30 | Record locking full | M | T03 | TODO | 2 tab → second read-only |
| T31 | Audit log | S | T30 | TODO | Bulk delete 1 row + per-id outcome |
| T32 | OpenAPI & Swagger | S | T19,T22 | TODO | Semua route terdokumentasi |

## E9 — Auth Pages & Polish

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T33 | Login/Register/404 pages | S | T08 | TODO | Register flag respected |
| T34 | Lazy loading & images | S | T12 | TODO | No spinner di fallback |

## E10 — Docker, Health, Tests, Docs

| # | Task | Est | Dep | Status | AC |
|---|---|---|---|---|---|
| T35 | Docker multi-stage | S | T01 | TODO | `docker build` sukses |
| T36 | Entrypoint & health | S | T35 | TODO | `HEALTHCHECK` grep ok |
| T37 | Unit tests (Vitest) | M | T07,T09,T30 | TODO | `npm run test` hijau |
| T38 | Docs & handover | S | T37 | TODO | Docs lengkap |

---

## Critical Path

```
T01 → T02 → T03 → T04 → T05 → T08 → T09 → T19 → T20 → T21 → T22
```

## MVP (2–3 minggu, 1 dev)

1. Foundation T01–T04
2. Domain T05–T07
3. Auth+RBAC T08–T10
4. Shared UI T11–T15
5. Public T16–T18 + T19
6. Booking T20–T23

Post-MVP: T24–T38.

## Seed Order (Permission Code)

```
Users               = 0000001
Roles               = 0000002
Organizations       = 0000003
Features            = 0000004
Locked Records      = 0000005
External API Demo   = 0000006  ← tetap ada
Audit Logs          = 0000007
Courts              = 0000008
Bookings            = 0000009
Members             = 0000010
Reports             = 0000011
```

Tiap feature → 4 codes: `AM/AD/ED/DD` + 7-digit.

## Cara Pakai

- Checklist per task: ganti `TODO` → `DOING` → `DONE` saat dikerjakan.
- Detail per epic: lihat `tasks/epic-*.md`.
- Verifikasi flow & API ada di plan file.
