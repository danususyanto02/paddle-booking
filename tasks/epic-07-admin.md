# Epic E7 — Admin — Courts, Bookings, Members, Reports

## Tujuan

Halaman admin untuk mengelola lapangan, booking, member, dan laporan. Guard via RBAC `AM` per feature.

---

## T24 — Admin Dashboard `/dashboard`

- **Estimasi:** S
- **Dep:** T19, T22
- **Status:** DONE — 2026-08-20 (`npm run build` OK 23 routes; tsc clean)

### Checklist

- [x] `app/api/v1/admin/stats/route.ts` — `GET /api/v1/admin/stats` `requireAuth` + admin perm guard (`AM0000008–AM0000011`), `revenue` SUM non-CANCELLED, `activeMembers` COUNT ACTIVE `deletedAt null`, `todayBookings` `date=today`, `pending=CONFIRMED`, `activities` 4 latest `include court`, `weekly` Mon–Sun counts peak `bg-primary` normalized `c/max*100`
- [x] `app/dashboard/admin/page.tsx` — server auth `getSessionUserId` + Bearer fallback → `AdminLayout active="dashboard"` + `AdminOverview`
- [x] `app/dashboard/admin/overview.tsx` — port `admin/index.html`: 4 stat cards (`formatIDRShort` revenue, `group`, `calendar_today`, `donut_large` 84%), `Recent Activities` 4 rows (court name + status + date), `Weekly Bookings` 7-bar with `TableRowSkeleton`/`AdminStatSkeleton` loading
- [x] `components/adminLayout.tsx` already in T11 — sidebar w-64 + topbar + Back to Site

### AC

- Stats derive dari DB, weekly bars max normalized 100%

---

## T25 — Admin Courts `/dashboard/courts`

- **Estimasi:** S
- **Dep:** T19
- **Status:** DONE — 2026-08-20

### Checklist

- [x] Port `admin/courts.html` — filter All/Available/Occupied/Maintenance, grid `courtCard` admin variant (status badge: Available mint-glace / Occupied surface-variant / Maintenance error-container)
- [x] CRUD: `POST /api/v1/courts` (AD), `PATCH /:id` (ED), `POST /delete {ids}` soft-delete (DD) — dengan DataTable fallback
- [x] `useRecordLock(COURT, id)` — heartbeat 30s, TTL 2m, 423 enforcement, expired handling
- [x] Maintenance → `grayscale`, `View Schedule` vs `Schedule Unavailable` disabled

### AC

- Bulk delete >2000 ids → 422
- Lock held blocks second editor (423 dengan owner info)

---

## T26 — Admin Bookings `/dashboard/bookings`

- **Estimasi:** S
- **Dep:** T22
- **Status:** DONE — 2026-08-20

### Checklist

- [x] Port `admin/bookings.html` — `DataTable` status pill filters All/Confirmed/Completed/Cancelled, `historySkeleton`
- [x] API: `GET /api/v1/bookings` (`AM Bookings`, page/limit/q/sortBy/status) — admin lihat semua users
- [x] Columns: code mono / court+location / date&time&duration / total IDR / status badge

### AC

- Filter `Confirmed` hanya return status tersebut

---

## T27 — Admin Members `/dashboard/members`

- **Estimasi:** S
- **Dep:** T13
- **Status:** DONE — 2026-08-20

### Checklist

- [x] Port `admin/members.html` — tier filters All/Gold/Silver/Basic, search name/phone, `DataTable` atau memberRow grid, `memberRowSkeleton`
- [x] API: `GET /api/v1/members` atau `GET /api/v1/users?extend=membership` — tier badge colors, `statusFilter`
- [x] Avatar: `img[data-src]` vs initial fallback `lavender-mist`
- [x] Pagination 4/col, empty "No members found"
- [x] `Export members.csv` — header `Name,Phone,Tier,Status,Last Booking` + toast
- [x] `Add Member` → `POST /api/v1/users` dengan `AD Users` + Zod (phone, tier enum)

### AC

- Search + tier filter kombinasi bekerja
- CSV download + toast

---

## T28 — Admin Reports `/dashboard/reports`

- **Estimasi:** S
- **Dep:** T27
- **Status:** DONE — 2026-08-20

### Checklist

- [x] Port `admin/reports.html` — `GET /api/v1/reports/revenue` (monthly 7-month Jan–Jul) bar chart, last month `bg-secondary-container` else `bg-primary-container`, height by `revenue/max*100`
- [x] `growthPct = (last-prev)/prev*100` badge, income donut `conic-gradient` 60/25/15, breakdown list
- [x] `Export revenue.csv` — `Month,Revenue` + `This Month` filter placeholder
- [x] Tier: Gold/Silver/Basic logic hanya label (tidak affect pricing — confirmed dengan user)

### AC

- `growthPct` formatted `+27.5%` sesuai mock
- Export triggers download + toast
