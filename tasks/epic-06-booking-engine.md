# Epic E6 — Booking Engine — Inti Pemesanan (Mock Payment)

## Tujuan

Membangun alur inti: cek slot → pilih jadwal → checkout mock → success → dashboard user.

> Pembayaran: **Mock** (keputusan user 2026-08-20). Tidak ada gateway; `POST /api/v1/bookings` langsung `CONFIRMED`.

---

## T20 — Slot availability API

- **Estimasi:** M
- **Dep:** T07, T19
- **Status:** TODO

### Endpoint

```
GET /api/v1/bookings/slots?courtId&date  # e.g. ?courtId=clxxx&date=2026-08-25
Response: { data: [{ start, period, occupied, canFit }] }
```

### Checklist

- [ ] Zod: `courtId` CUID required, `date` ISO `YYYY-MM-DD`, validate court exists & not soft-deleted
- [ ] Query `Booking WHERE courtId + date + status != CANCELLED` — build occupied Set dari overlap interval
- [ ] Overlap: `startMin < other.endMin && endMin > other.startMin` — bukan hanya exact start
- [ ] `canFit(start, duration)` juga cek tidak exceed 22:00 dan tidak overlap booking existing untuk durasi penuh
- [ ] `periodOf` grouping info (Morning/Afternoon/Evening)
- [ ] Rate-limit: 120/min via `api:user` atau IP, health excluded

### AC

- 18:00 booking 90m → slot 18:00 & 18:30 occupied
- `canFit("21:00",90)=false`, `canFit("21:00",60)=true`

---

## T21 — Booking page `/(public)/booking`

- **Estimasi:** M
- **Dep:** T20, T07
- **Status:** TODO

### Checklist

- [ ] Port `booking.html` — 3 steps:
  1. Date: `Calendar` (month nav, disable past, `aria-selected`, keyboard Enter/Space)
  2. Duration: segmented 60/90/120 (re-evaluasi `canFit` → disable option yang tidak muat)
  3. TimeSlots: grouped Morning/Afternoon/Evening, occupied disabled + line-through, selected `bg-primary-fixed`
- [ ] Sticky summary (kanan): image, badge, date summary, courtFee/processingFee/total live `formatIDR`, Confirm disabled until slot
- [ ] State: `useSearchParams` (`?courtId=&date=&duration=&slot=`) + Zustand/memory fallback (bukan localStorage `kc_selection` sebagai source of truth)
- [ ] `slotSkeleton` saat availability loading, `toast` on error
- [ ] Guard: must login → redirect `/login?next=/booking?courtId=...`
- [ ] Komponen: `components/calendar.tsx` + `components/timeSlots.tsx` (port `calendar.js` + `timeSlots.js`)

### AC

- Duration change re-evaluasi `canFit`, slot yang tidak muat disabled
- Summary total live update IDR

---

## T22 — Checkout + Success (Mock)

- **Estimasi:** M
- **Dep:** T21
- **Status:** TODO

### Endpoints

```
POST /api/v1/bookings          # create booking — transactional
GET  /api/v1/bookings/:id      # single (owner atau admin)
```

### Checklist

#### Checkout `/(public)/checkout`

- [ ] Port `checkout.html` — summaryCard (image 96×96, type/surface, date long + slot–end + duration), mock payment method radios (Bank Transfer / QRIS / Cash at Venue — no gateway call), price breakdown, Pay Now
- [ ] Guard: missing `courtId/date/slot` → redirect `/courts`
- [ ] `Pay Now` → `POST /api/v1/bookings` body: `{ courtId, date, slot, duration, paymentMethod }` — server recomputes `endTime/canFit`, cek `Court.status != MAINTENANCE`, cek overlap di `prisma.$transaction` (FOR UPDATE), create Booking `code BK-YYYYMMDD-####`, `total = courtFee + 15000`, `status CONFIRMED` (mock langsung confirmed), audit `CREATE`
- [ ] Handle: `409 CONFLICT` (overlap race), `423 LOCKED` (locked by other), `422 VALIDATION_ERROR` (canFit fail)
- [ ] Success: `toast success` → `router.push(/booking/success?code=BK-...)`
- [ ] Idempotent retry safety (jangan double-create)

#### Success `/(public)/booking/success`

- [ ] Port `success.html` — reads `?code`, fetch `GET /api/v1/bookings/:code`, e-ticket (code, status, court, date long, time range, total IDR, mint-glace note), clear selection, CTA `Go to Dashboard / Book Another`
- [ ] Invalid code → "No booking found"

### AC

- Concurrent `POST` same slot → second caller `409` atau `423`
- Harga tidak trust client (server recalculate)

---

## T23 — User Dashboard `/(public)/dashboard` (atau `/dashboard`)

- **Estimasi:** M
- **Dep:** T22
- **Status:** TODO

### Endpoints

```
GET   /api/v1/me/bookings              # own bookings — page/limit/status/q/sortBy
PATCH /api/v1/bookings/:id/cancel      # owner cancel (atau via POST /delete)
```

### Checklist

- [ ] Port `dashboard.html` — profile bento, membership tier card, counts `Matches Played / Upcoming`, `Next Up` grid (countdown `In 3 days / Starts in 2h`), History & Receipts table
- [ ] Data: `GET /api/v1/me/bookings` (auth, `status` filter, `q` on court name, `sortBy date/createdAt`)
- [ ] Cancel: `modal` → `PATCH /api/v1/bookings/:id/cancel` (CONFIRMED→CANCELLED only, 24h policy opsional: `422` jika `date+start < now+24h`), audit `UPDATE` before/after, release lock
- [ ] Skeletons: `upcomingSkeleton`/`historySkeleton`
- [ ] Countdown refresh 60s, `isUpcoming = date+start >= now && status not Cancelled/Completed`
- [ ] History `DataTable` (date/court/duration/cost/status badge mint-glace vs error-container)
- [ ] Empty: "Find a Court" CTA

### AC

- Not-owner cancel → 403
- Cancelling COMPLETED/CANCELLED → 422
- Cancel membebaskan slot (availability update)
