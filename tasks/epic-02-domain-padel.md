# Epic E2 — Domain Padel — Data Model

## Tujuan

Memetakan domain paddle (Court, Booking) ke Prisma dan seed data dari `uidesign/`.

---

## T05 — Model Court & Booking

- **Estimasi:** M
- **Dep:** T04
- **Status:** TODO

### Deskripsi

Tambah model `Court` dan `Booking` ke Prisma schema, extend `ResourceType` enum.

### Checklist

- [ ] `Court` model:
  - `id` CUID PK, `code` unique (untuk reuse via soft-delete suffix)
  - `name`, `location`, `type` enum `INDOOR/OUTDOOR/ROOFTOP/COVERED`
  - `surface` String, `pricePerHour` Int (IDR), `rating` Float, `reviews` Int
  - `badge` String? (Premium/Pro Size/Rooftop/null)
  - `amenities` String[] (Cafe/Parking/Showers/Pro Shop)
  - `image` String (Unsplash URL), `status` enum `AVAILABLE/MAINTENANCE/OCCUPIED`
  - `sortOrder` Int, `deletedAt` DateTime?, `createdAt`/`updatedAt`
  - `recordLockEnabled` Boolean (per-feature toggle)
  - `@@index([deletedAt])`, `@@index([status])`
- [ ] `Booking` model:
  - `id` CUID PK, `code` String unique (`BK-YYYYMMDD-XXXX`)
  - `userId` FK → User, `courtId` FK → Court
  - `date` DateTime (ISO date), `start`/`end` String `HH:mm`, `duration` Int (60/90/120)
  - `total` Int, `courtFee` Int, `processingFee` Int (default 15000)
  - `status` enum `PENDING/CONFIRMED/CANCELLED/COMPLETED`
  - `paymentMethod` String? (mock: TRANSFER/CASH/QRIS)
  - `createdAt`/`updatedAt`
  - `@@index([courtId, date])`, `@@index([userId])`, `@@index([status])`
- [ ] Extend `ResourceType` enum: tambah `COURT`, `BOOKING` (total 11 values)
- [ ] Migration + generate

### Acceptance Criteria

- `prisma migrate dev` sukses, FK constraint verified
- `Court.status` OCCUPIED derived di API (tidak hardcode semua available)

---

## T06 — Seed Courts (8 data) + Members finance mock

- **Estimasi:** S
- **Dep:** T05
- **Status:** TODO

### Deskripsi

Port mock data dari `uidesign/src/js/data/` ke seed.

### Checklist

- [ ] Port `courts.js` 8 courts (alpha, panoramic, center, east, velocity, skyline, beta, gamma) dengan field lengkap (harga IDR, amenities, rating, image, badge, status)
- [ ] Port `members.js` 8 members → buat User tambahan dengan tier Gold/Silver/Basic (field `tier` opsional di User atau join table)
- [ ] Port `finance.js` monthlyRevenue + incomeBreakdown sebagai referensi reports (tidak perlu table baru, cukup seed helper)
- [ ] Upsert (idempoten) — re-run tidak duplikat

### Acceptance Criteria

- `GET /api/v1/courts` return 8 rows dengan harga IDR sesuai uidesign
- Court `east` status MAINTENANCE, `beta` occupied logic ready

---

## T07 — Lib pricing & slots (port uidesign)

- **Estimasi:** S
- **Dep:** T05
- **Status:** TODO

### Deskripsi

Port utility pricing & slot dari `uidesign/src/js/lib/` ke `lib/`.

### Checklist

- [ ] `lib/pricing.ts`:
  - `PROCESSING_FEE = 15000`
  - `formatIDR(n)` via `Intl.NumberFormat id-ID currency IDR maxFractionDigits 0`
  - `formatIDRShort(n)` → `Rp150.000`
  - `calcTotal(pricePerHour, duration)` → `{ courtFee, processingFee, total }`
  - `formatDateLong(iso)` / `formatDateShort(iso)` — pakai `T12:00:00` trick hindari UTC shift
- [ ] `lib/slots.ts`:
  - `SLOT_STARTS` 27 slots `08:00–21:00` (30-min cadence)
  - `periodOf(time)` → Morning/Afternoon/Evening
  - `toMinutes/fromMinutes/endTime/canFit` (`canFit` cek ≤22:00)
  - `slotsFor(courtId, date)` DB-backed (bukan hash) — butuh T20 untuk occupancy real; untuk sekarang return all available
- [ ] Unit tests: `calcTotal(180000,90)=285000`, `canFit("21:00",90)=false`, `canFit("21:00",60)=true`

### Acceptance Criteria

- Semua helper pure function, reusable server & client
- Tests hijau, format IDR konsisten `Rp`
