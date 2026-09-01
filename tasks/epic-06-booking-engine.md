# Epic E6 — Booking Engine — Inti Pemesanan (Mock Payment)

## Tujuan

Membangun alur inti: cek slot → pilih jadwal → checkout mock → success → dashboard user.

> Pembayaran: **Mock** (keputusan user 2026-08-20). Tidak ada gateway; `POST /api/v1/bookings` langsung `CONFIRMED`.

---

## T20 — Slot availability API

- **Estimasi:** M
- **Dep:** T07, T19
- **Status:** DONE — 2026-08-20 (`npm run build` OK 16 routes; overlap logic verified via lib/slots)

### Endpoint

```
GET /api/v1/bookings/slots?courtId&date  # e.g. ?courtId=clxxx&date=2026-08-25
Response: { data: [{ start, period, occupied, canFit }] }
```

### Checklist

- [x] `app/api/v1/bookings/slots/route.ts` — Zod `courtId` + `date YYYY-MM-DD` + `duration` (default 60), court exists check (`code` or `id`, `deletedAt null` → 404)
- [x] Query `Booking WHERE courtId + date + status IN PENDING/CONFIRMED` — build `occupiedSet` dari overlap interval `sMin < ex.endMin && eMin > ex.startMin`
- [x] Overlap interval (not just exact start) verified: 18:00 90m → 18:00 & 18:30 occupied, 17:30→ true overlap, 19:30→ false
- [x] `canFit(start, duration)` ≤22:00 per slot, returned per row alongside `occupied`
- [x] `periodOf` grouping Morning/Afternoon/Evening
- [x] Rate-limit stub documented for T29 (120/min `api:user` via `lib/rate-limit`); health excluded already via `RateLimitEntry` logic

### AC

- 18:00 booking 90m → slot 18:00 & 18:30 occupied
- `canFit("21:00",90)=false`, `canFit("21:00",60)=true`

---

## T21 — Booking page `/(public)/booking`

- **Estimasi:** M
- **Dep:** T20, T07
- **Status:** DONE — 2026-08-20 (`npm run build` OK 16 routes; tsc clean)

### Checklist

- [x] `app/booking/page.tsx` — server guard `must login` (cookie `getSessionUserId` + Bearer fallback → `redirect /login?next=`), court resolve `id/code` + fallback, `Suspense fallback CourtDetailSkeleton`
- [x] `app/booking/bookingClient.tsx` — port `booking.html` 3 steps: fetch `GET /api/v1/bookings/slots?courtId&date&duration`, duration segmented 60/90/120 re-evaluasi `canFit` + occupied clear, slot grouped Morning/Afternoon/Evening via `TimeSlots`, sticky summary live IDR `calcTotal`/`formatIDRShort`, Confirm → `router.push(/checkout?courtId&date&slot&duration)`
- [x] `components/calendar.tsx` — port `calendar.js`: month nav, disable past, `aria-selected`/`role=grid`, keyboard Enter/Space, `onMonthChange`/`onSelect`
- [x] `components/timeSlots.tsx` — port `timeSlots.js`: `periodOf` grouping, occupied + `!canFit` disabled `line-through`, selected `bg-primary-fixed`, `aria-pressed`/`aria-disabled`
- [x] `SlotSkeleton` loading, `Back to Courts` via `next/link`

### AC

- Duration change re-evaluasi `canFit`, slot yang tidak muat disabled
- Summary total live update IDR

---

## T22 — Checkout + Success (Mock)

- **Estimasi:** M
- **Dep:** T21
- **Status:** DONE — 2026-08-20 (`npm run build` OK 19 routes; tsc clean; APIs transactional)

### Endpoints

```
POST /api/v1/bookings          # create booking — transactional
GET  /api/v1/bookings/:id      # single (owner atau admin)
```

### Checklist

#### Checkout + Booking APIs

- [x] `lib/validations/booking.ts` — `createBookingSchema` (`courtId/date YYYY-MM-DD/slot HH:mm/duration 60|90|120/paymentMethod`)
- [x] `app/api/v1/bookings/route.ts` — `POST /api/v1/bookings` `requireAuth` + `assertCsrf`, `canFit` →422, court `id/code` resolve + `MAINTENANCE`→423, server `calcTotal` (no trust client), `endTime`, `prisma.$transaction` overlap check (`sMin < bEnd && eMin > bStart` interval) →409, code `BK-YYYYMMDD-####` unique retry, `CONFIRMED` mock
- [x] `app/api/v1/bookings/[id]/route.ts` — `GET /api/v1/bookings/:id` owner check via `getEffectivePermissions` SUPER_ADMIN bypass else 403

#### Checkout `/(public)/checkout` (routed as `/checkout`)

- [x] Port `checkout.html` → `app/checkout/page.tsx` (server guard `courtId/date/slot` → redirect, auth check session/Bearer, court fetch) + `app/checkout/checkoutClient.tsx` (summary 96×96 type/surface/date long+slot–end+duration, payment radios Bank/QRIS/Cash, breakdown `formatIDRShort`, `Pay Now` → CSRF `GET /api/v1/auth/csrf` + `Origin` header + `POST /api/v1/bookings` → `router.push(/booking/success?code=BK-...)`, error 409/422 display)

#### Success `/(public)/booking/success`

- [x] Port `success.html` → `app/booking/success/page.tsx` (server): `?code` reads `Booking`+`court` include, auth required, invalid code → "No booking found" + Browse CTA, valid → e-ticket `BK-*` mint-glace note, totals `formatIDRShort`, date long, time range, CTA `Go to Dashboard / Book Another`

### AC

- Concurrent `POST` same slot → second caller `409` atau `423`
- Harga tidak trust client (server recalculate)

---

## T23 — User Dashboard `/(public)/dashboard` (routed as `/dashboard`)

- **Estimasi:** M
- **Dep:** T22
- **Status:** DONE — 2026-08-20 (`npm run build` OK 21 routes; tsc clean)

### Endpoints

```
GET   /api/v1/me/bookings              # own bookings — page/limit/status/q/sortBy
PATCH /api/v1/bookings/:id/cancel      # owner cancel (atau via POST /delete)
```

### Checklist

- [x] `app/api/v1/me/bookings/route.ts` — `GET /api/v1/me/bookings` `requireAuth`, `page/limit/status/q/sortBy=date|createdAt`, q on `court.name`, `meta`
- [x] `app/api/v1/bookings/[id]/cancel/route.ts` — `PATCH /api/v1/bookings/:id/cancel` `assertCsrf` + `requireAuth`, owner `id/code` check else 403 (SUPER_ADMIN bypass), `CANCELLED/COMPLETED→422`, 24h policy commented optional, `CANCELLED` update
- [x] `app/dashboard/page.tsx` — server guard auth (cookie + Bearer) → `redirect /login?next=/dashboard` if not authed, `Navbar active="dashboard"`, `Footer`
- [x] `app/dashboard/dashboardClient.tsx` — port `dashboard.html`: profile bento + tier card (`Matches Played`/`Upcoming` counts), `Next Up` grid `isUpcoming = date+start >= now && status not Cancelled/Completed` + `countdownText` (In N days / Starts in h/m), `confirm` → cancel `GET /api/v1/auth/csrf` + `PATCH /api/v1/bookings/:id/cancel` with `x-csrf-token`+`Origin`, refresh on success, empty CTA, `UpcomingSkeleton`/`HistorySkeleton` loading, 60s countdown `setInterval`

### AC

- Not-owner cancel → 403
- Cancelling COMPLETED/CANCELLED → 422
- Cancel membebaskan slot (availability update)
