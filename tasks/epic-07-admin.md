# Epic E7 — Admin — Courts, Bookings, Members, Reports

## Tujuan

Halaman admin untuk mengelola lapangan, booking, member, dan laporan. Guard via RBAC `AM` per feature.

---

## T24 — Admin Dashboard `/dashboard`

- **Estimasi:** S
- **Dep:** T19, T22
- **Status:** TODO

### Checklist

- [ ] Port `admin/index.html` — 4 stat cards: Total Revenue (SUM non-cancelled), Active Members (COUNT ACTIVE), Today's Bookings (COUNT date=today), Occupancy (%)
- [ ] Recent Activities 4 rows (booking id + court + status + date)
- [ ] Weekly Bookings 7-bar Mon–Sun (count per weekday, peak `bg-primary` vs `bg-mint-glace`)
- [ ] `adminStatSkeleton` / `tableRowSkeleton` saat loading
- [ ] API: `GET /api/v1/admin/stats` atau derive dari `GET /api/v1/bookings` + `GET /api/v1/courts`

### AC

- Stats derive dari DB, weekly bars max normalized 100%

---

## T25 — Admin Courts `/dashboard/courts`

- **Estimasi:** S
- **Dep:** T19
- **Status:** TODO

### Checklist

- [ ] Port `admin/courts.html` — filter All/Available/Occupied/Maintenance, grid `courtCard` admin variant (status badge: Available mint-glace / Occupied surface-variant / Maintenance error-container)
- [ ] CRUD: `POST /api/v1/courts` (AD), `PATCH /:id` (ED), `POST /delete {ids}` soft-delete (DD) — dengan DataTable fallback
- [ ] `useRecordLock(COURT, id)` — heartbeat 30s, TTL 2m, 423 enforcement, expired handling
- [ ] Maintenance → `grayscale`, `View Schedule` vs `Schedule Unavailable` disabled

### AC

- Bulk delete >2000 ids → 422
- Lock held blocks second editor (423 dengan owner info)

---

## T26 — Admin Bookings `/dashboard/bookings`

- **Estimasi:** S
- **Dep:** T22
- **Status:** TODO

### Checklist

- [ ] Port `admin/bookings.html` — `DataTable` status pill filters All/Confirmed/Completed/Cancelled, `historySkeleton`
- [ ] API: `GET /api/v1/bookings` (`AM Bookings`, page/limit/q/sortBy/status) — admin lihat semua users
- [ ] Columns: code mono / court+location / date&time&duration / total IDR / status badge

### AC

- Filter `Confirmed` hanya return status tersebut

---

## T27 — Admin Members `/dashboard/members`

- **Estimasi:** S
- **Dep:** T13
- **Status:** TODO

### Checklist

- [ ] Port `admin/members.html` — tier filters All/Gold/Silver/Basic, search name/phone, `DataTable` atau memberRow grid, `memberRowSkeleton`
- [ ] API: `GET /api/v1/members` atau `GET /api/v1/users?extend=membership` — tier badge colors, `statusFilter`
- [ ] Avatar: `img[data-src]` vs initial fallback `lavender-mist`
- [ ] Pagination 4/col, empty "No members found"
- [ ] `Export members.csv` — header `Name,Phone,Tier,Status,Last Booking` + toast
- [ ] `Add Member` → `POST /api/v1/users` dengan `AD Users` + Zod (phone, tier enum)

### AC

- Search + tier filter kombinasi bekerja
- CSV download + toast

---

## T28 — Admin Reports `/dashboard/reports`

- **Estimasi:** S
- **Dep:** T27
- **Status:** TODO

### Checklist

- [ ] Port `admin/reports.html` — `GET /api/v1/reports/revenue` (monthly 7-month Jan–Jul) bar chart, last month `bg-secondary-container` else `bg-primary-container`, height by `revenue/max*100`
- [ ] `growthPct = (last-prev)/prev*100` badge, income donut `conic-gradient` 60/25/15, breakdown list
- [ ] `Export revenue.csv` — `Month,Revenue` + `This Month` filter placeholder
- [ ] Tier: Gold/Silver/Basic logic hanya label (tidak affect pricing — confirmed dengan user)

### AC

- `growthPct` formatted `+27.5%` sesuai mock
- Export triggers download + toast
