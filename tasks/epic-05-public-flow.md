# Epic E5 — Public Flow — Landing → Courts → Court Detail

## Tujuan

Migrasi halaman publik dari `uidesign/` ke Next.js routes dengan API.

---

## T16 — Landing `/(public)/page.tsx`

- **Estimasi:** M
- **Dep:** T11, T12
- **Status:** TODO

### Checklist

- [ ] Port `uidesign/index.html` — hero (Unsplash gradient, badge), search bar (location/date/time), featured bento (1 large 8-col + 2 stacked 4-col)
- [ ] `next/image` dengan `loading="lazy"` + `img-fade` fallback
- [ ] Skeleton: `featuredSkeleton` saat fetch
- [ ] Search → `router.push(/courts?location=&date=&time=)` via `URLSearchParams`
- [ ] Featured data dari `GET /api/v1/courts?featured=3` atau top-rated

### AC

- Search navigasi ke `/courts` dengan query preserve

---

## T17 — Courts listing `/(public)/courts`

- **Estimasi:** M
- **Dep:** T13, T14
- **Status:** TODO

### Checklist

- [ ] Port `courts.html` — filter sidebar: price range 80k–250k, type (Indoor/Outdoor/Covered/Rooftop), amenities (Cafe/Showers/Parking/Pro Shop), sort (Recommended/Price/Rating)
- [ ] `courtCard` grid — badge, typeIcon, status dot, `formatIDRShort`, lazy image
- [ ] Pagination 4/page, URL sync (`page/limit/q/sortBy/sortOrder`)
- [ ] `courtCardSkeleton` saat loading, empty state + clear filters CTA
- [ ] Menggunakan `DataTable` (card variant atau custom grid + meta) + `Select` untuk filter

### AC

- Filter kombinasi bekerja, URL sync preservasi refresh
- Empty → "No courts" + CTA

---

## T18 — Court Detail `/(public)/courts/[id]`

- **Estimasi:** S
- **Dep:** T17
- **Status:** TODO

### Checklist

- [ ] Port `court-detail.html` — gallery 420px, badge, rating, amenities, price `Rp`, Book CTA → `/booking?courtId=`
- [ ] `courtDetailSkeleton` saat loading
- [ ] `GET /api/v1/courts/:id` — 404 jika soft-deleted atau `MenuFeature INACTIVE` (404, bukan 403)
- [ ] Metadata: `title = "{name} — Kinetic Court"`

### AC

- Unknown `id` → centered "Court not found" + Browse CTA

---

## T19 — API Courts CRUD (admin)

- **Estimasi:** M
- **Dep:** T05, T09
- **Status:** TODO

### Endpoints

```
GET    /api/v1/courts              # list (public read, admin filter)
POST   /api/v1/courts              # create — AD0000008
GET    /api/v1/courts/:id          # single
PATCH  /api/v1/courts/:id          # update — ED0000008
POST   /api/v1/courts/delete       # bulk soft-delete — DD0000008 { ids: string[] }
```

### Checklist

- [ ] Zod validation, envelope `{data, meta}`, error enum
- [ ] Pagination: `page/limit/q/sortBy/sortOrder/status` (whitelist `name/pricePerHour/rating/createdAt`)
- [ ] RBAC: `AM` untuk list, `AD/ED/DD` untuk mutations, `inactive feature` → 404
- [ ] Soft-delete: suffix `code+"_deleted_"+id`, `deletedAt`, frees code for reuse
- [ ] Bulk delete: `{ ids: CUID[] }` max 2000, deduped, partial success `{ data: [{id, status: deleted|failed, error}] }`, overall 200
- [ ] Record locking check per id → `LOCKED` if `LOCKED_BY_OTHER`
- [ ] `GET` filter `deletedAt IS NULL` implicit
- [ ] Audit log per mutation (after commit)

### AC

- Bulk delete partial success, code reuse setelah delete terbukti
- Lock enforcement: edit tanpa token valid → 423
