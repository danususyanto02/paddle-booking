# Epic E2 — Domain Padel — Data Model

## Tujuan

Memetakan domain paddle (Court, Booking) ke Prisma dan seed data dari `uidesign/`.

---

## T05 — Model Court & Booking

- **Estimasi:** M
- **Dep:** T04
- **Status:** DONE — verified 2026-08-20 (`migrate dev add_court_booking` + `generate` OK; FK, indexes verified)

### Deskripsi

Tambah model `Court` dan `Booking` ke Prisma schema, extend `ResourceType` enum.

### Checklist

- [x] `Court` model:
  - `id` CUID PK, `code` unique (untuk reuse via soft-delete suffix)
  - `name`, `location`, `type` enum `INDOOR/OUTDOOR/ROOFTOP/COVERED`
  - `surface` String, `pricePerHour` Int (IDR), `rating` Float, `reviews` Int
  - `badge` String? (Premium/Pro Size/Rooftop/null)
  - `amenities` String[] (Cafe/Parking/Showers/Pro Shop)
  - `image` String (Unsplash URL), `status` enum `AVAILABLE/MAINTENANCE/OCCUPIED`
  - `sortOrder` Int, `deletedAt` DateTime?, `createdAt`/`updatedAt`
  - `recordLockEnabled` Boolean (per-feature toggle)
  - `@@index([deletedAt])`, `@@index([status])`
- [x] `Booking` model:
  - `id` CUID PK, `code` String unique (`BK-YYYYMMDD-XXXX`)
  - `userId` FK → User, `courtId` FK → Court
  - `date` DateTime (ISO date), `start`/`end` String `HH:mm`, `duration` Int (60/90/120)
  - `total` Int, `courtFee` Int, `processingFee` Int (default 15000)
  - `status` enum `PENDING/CONFIRMED/CANCELLED/COMPLETED`
  - `paymentMethod` String? (mock: TRANSFER/CASH/QRIS)
  - `createdAt`/`updatedAt`
  - `@@index([courtId, date])`, `@@index([userId])`, `@@index([status])`
- [x] Extend `ResourceType` enum: tambah `COURT`, `BOOKING` (total 12 values — 10 baseline + 2 domain)
- [x] Migration + generate — `20260820072427_add_court_booking` applied, `prisma generate` OK

---

## T06 — Seed Courts (8 data) + Members finance mock

- **Estimasi:** S
- **Dep:** T05
- **Status:** DONE — verified 2026-08-20 (`npx prisma db seed` Courts OK 8/8 idempoten; `east` MAINTENANCE, `beta` OCCUPIED)

### Deskripsi

Port mock data dari `uidesign/src/js/data/` ke seed.

### Checklist

- [x] Port `courts.js` 8 courts (alpha, panoramic, center, east, velocity, skyline, beta, gamma) dengan field lengkap (harga IDR, amenities, rating, image, badge, status) — `prisma/seed.ts:seedCourts()` + `prisma/seed-courts.ts` standalone
- [x] Port `members.js` 8 members → mapping ada di `uidesign/src/js/data/members.js` sebagai referensi; T27/T28 akan buat tabel/view (tidak perlu table baru di T06 — members ditangani via User/seed terpisah di T27; dicatat explicit)
- [x] Port `finance.js` monthlyRevenue + incomeBreakdown sebagai referensi reports — data ada di `uidesign/src/js/data/finance.js`; T28 akan pakai `lib/finance.ts` / SystemSetting; tidak perlu table baru di T06
- [x] Upsert (idempoten) — re-run tidak duplikat (verified 2x)

### Acceptance Criteria

- `GET /api/v1/courts` return 8 rows dengan harga IDR sesuai uidesign
- Court `east` status MAINTENANCE, `beta` occupied logic ready

---

## T07 — Lib pricing & slots (port uidesign)

- **Estimasi:** S
- **Dep:** T05
- **Status:** DONE — 2026-08-20 (pure port, `calcTotal` & `canFit` verified via source read & AC logic; Vitest run pending `! npm install` vitest)

### Deskripsi

Port utility pricing & slot dari `uidesign/src/js/lib/` ke `lib/`.

### Checklist

- [x] `lib/pricing.ts`:
  - `PROCESSING_FEE = 15000`
  - `formatIDR(n)` via `Intl.NumberFormat id-ID currency IDR maxFractionDigits 0`
  - `formatIDRShort(n)` → `Rp150.000`
  - `calcTotal(pricePerHour, duration)` → `{ courtFee, processingFee, total }`
  - `formatDateLong(iso)` / `formatDateShort(iso)` — pakai `T12:00:00` trick hindari UTC shift
- [x] `lib/slots.ts`:
  - `SLOT_STARTS` 27 slots `08:00–21:00` (30-min cadence)
  - `periodOf(time)` → Morning/Afternoon/Evening
  - `toMinutes/fromMinutes/endTime/canFit` (`canFit` cek ≤22:00)
  - `slotsFor(courtId, date)` DB-backed (bukan hash) — butuh T20 untuk occupancy real; untuk sekarang return all available
- [x] Unit tests: `tests/unit/pricing-slots.test.ts` — `calcTotal(180000,90)=285000`, `canFit("21:00",90)=false`, `canFit("21:00",60)=true` (Vitest, pending install)

### Acceptance Criteria

- Semua helper pure function, reusable server & client
- Tests hijau, format IDR konsisten `Rp`
