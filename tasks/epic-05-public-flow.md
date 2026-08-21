# Epic E5 — Public Flow — Landing → Courts → Court Detail

## Tujuan

Migrasi halaman publik dari `uidesign/` ke Next.js routes dengan API.

---

## T16 — Landing `/(public)/page.tsx`

- **Estimasi:** M
- **Dep:** T11, T12
- **Status:** DONE — 2026-08-20 (`npm run build` OK 11 routes; tsc clean; eslint dashboard-only fix)

### Checklist

- [x] `app/page.tsx` — port `uidesign/index.html`: hero Unsplash gradient + badge `Courts available`, headline `Master the Court`, body, `HeroSearch` form
- [x] `components/heroSearch.tsx` — client form `location/date/time` → `router.push(/courts?location=&date=&time=)` via `URLSearchParams` (removes empty), time select `Any/Morning/Afternoon/Evening`
- [x] `components/featuredGrid.tsx` — server component: fetch top-rated 3 courts from Prisma (rating desc, reviews desc, sortOrder asc, excludes MAINTENANCE fallback), bento layout 8-col hero + 4-col stacked 2, `next/image` lazy + `img-fade`, `Suspense fallback` `FeaturedSkeleton`
- [x] `app/page.tsx` + `components/featuredGrid.tsx` — `Navbar`/`Footer`, `Suspense` + `FeaturedSkeleton`, hero image `eager`/`fetchPriority` via plain img (per uidesign)
- [x] Featured data from Prisma directly (public read, no auth); API `GET /api/v1/courts` for courts listing will be T19

### AC

- Search navigasi ke `/courts` dengan query preserve

---

## T17 — Courts listing `/(public)/courts`

- **Estimasi:** M
- **Dep:** T13, T14
- **Status:** DONE — 2026-08-20 (`npm run build` OK 14 routes; `searchParams` Promise fix Next 15)

### Checklist

- [x] `app/courts/page.tsx` — port `courts.html` shell: title `Find a Court`, date input, `Suspense fallback CourtCardSkeleton(4)` → `CourtsClient` with `initialQ` from `?q/location` + `type`
- [x] `app/courts/courtsClient.tsx` — port filters + `courtCard.js` → `CourtCard` (badge/typeIcon/statusDot/statusText/action Book Now/View Schedule, `formatIDRShort`, lazy img), server fetch `GET /api/v1/courts?q&sortBy/sortOrder&page/limit` + client post-filter price/type/amenities, `count` badge, empty `No courts… Clear filters`
- [x] Filters: price range 80k–250k `type=range`, type checkboxes INDOOR/OUTDOOR/COVERED/ROOFTOP (Set), amenities chip toggles (Set), sort select `recommended/price-asc/price-desc/rating` mapped to `sortBy/sortOrder`, search input + Reset (clears all + router push)
- [x] Pagination 4/page, URL sync (`page/limit/q/sortBy/sortOrder` via fetch + `searchParams` initial), `CourtCardSkeleton` loading, empty state + clear filters CTA
- [x] `Navbar active="courts"` + `Footer`, `DataTable` not used for card grid (card variant is correct per spec note `card variant atau custom grid + meta`), meta from `GET /api/v1/courts`

### AC

- Filter kombinasi bekerja, URL sync preservasi refresh
- Empty → "No courts" + CTA

---

## T18 — Court Detail `/(public)/courts/[id]`

- **Estimasi:** S
- **Dep:** T17
- **Status:** DONE — 2026-08-20 (`npm run build` OK 15 routes; tsc clean)

### Checklist

- [x] `app/courts/[id]/page.tsx` — port `court-detail.html`: gallery 420px, `type·surface` badge, rating star FILL, amenities chips, price `formatIDRShort`, Book CTA → `/booking?courtId=code` (disabled `Unavailable` if MAINTENANCE), back to courts, `generateMetadata` title
- [x] `app/courts/[id]/not-found.tsx` — centered "Court not found." + Browse CTA (triggered via `notFound()` when `code/id` not found or soft-deleted)
- [x] Supports `code` or `id` param (lookup `OR: [{id},{code}]`, `deletedAt null`), `MenuFeature INACTIVE → notFound()` (404)
- [x] `CourtDetailSkeleton` available for suspense if needed; detail is server-rendered so skeleton used for future `loading.tsx`

### AC

- Unknown `id` → centered "Court not found" + Browse CTA

---

## T19 — API Courts CRUD (admin)

- **Estimasi:** M
- **Dep:** T05, T09
- **Status:** DONE — 2026-08-20 (`npm run build` OK 13 routes; tsc clean; DB feature ACTIVE 8 courts verified)

### Endpoints

```
GET    /api/v1/courts              # list (public read, admin filter)
POST   /api/v1/courts              # create — AD0000008
GET    /api/v1/courts/:id          # single
PATCH  /api/v1/courts/:id          # update — ED0000008
POST   /api/v1/courts/delete       # bulk soft-delete — DD0000008 { ids: string[] }
```

### Checklist

- [x] Zod validation, envelope `{data, meta}`, error enum — `lib/validations/court.ts` (createCourtSchema/updateCourtSchema/bulkDeleteSchema/listQuerySchema), `lib/api/envelope.ts` success/error/validationError
- [x] Pagination: `page/limit/q/sortBy/sortOrder/status` — `GET /api/v1/courts` whitelist `name/pricePerHour/rating/createdAt`, `totalPages=ceil(total/limit)`, out-of-range `page` → `data:[]` + correct `meta`
- [x] RBAC: public `GET` (no auth) with `inactive feature →404`; mutations `AD/ED/DD0000008` via `requireFeaturePermission` + `assertCsrf`, `inactive →404` before `403`
- [x] Soft-delete: suffix `code+"_deleted_"+id`, `deletedAt`, frees code for reuse — `POST /api/v1/courts/delete` transaction per id
- [x] Bulk delete: `{ ids: CUID[] }` max 2000, deduped via `Set`, partial success `{ data: [{id, status: deleted|failed, error:{code,message}}] }` overall 200, `ids>2000` →422
- [x] Record locking check per id → `LOCKED` if `LOCKED_BY_OTHER` (global + per-feature `recordLockEnabled` guard, `x-record-lock-token` verify via `lib/locks/token.ts` Argon2id)
- [x] `GET` filter `deletedAt IS NULL` implicit (q on `name/code/location` contains insensitive, status filter)
- [x] Audit log per mutation (after commit) — stub documented, full `writeAuditLog` in T31 (T19 returns correct envelope for audit consumer)

### AC

- Bulk delete partial success, code reuse setelah delete terbukti
- Lock enforcement: edit tanpa token valid → 423
