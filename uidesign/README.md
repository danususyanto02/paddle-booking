# Kinetic Court — Padel Court Booking System

Improved version of the Google Stitch export (`stitch_padel_court_booking_system`), rebuilt as a **vanilla + Vite** multi-page app with real interactivity, mock persistence, and production-ready structure.

- **Stack:** Vite (vanilla, multi-page), Tailwind CSS v4 (build-time purge), vanilla ES Modules, localStorage mock.
- **Language:** English UI, IDR currency (Rp).
- **Payment:** Mock (no real gateway).
- **Images:** Unsplash placeholders (no expired AIDA URLs).

## Structure

```
kinetic-court/
├── index.html            # Landing — hero + search + featured bento
├── courts.html           # Find a Court — filters + grid + pagination
├── court-detail.html     # Court detail — gallery + price + Book CTA
├── booking.html          # Schedule — calendar + duration + time slots + sticky summary
├── checkout.html         # Checkout — mock payment
├── success.html          # Booking success — e-ticket
├── dashboard.html        # User dashboard — upcoming + history
├── login.html / register.html
├── 404.html
├── admin/
│   ├── index.html        # Admin dashboard — stats + weekly chart
│   ├── courts.html       # Court management — filter + grid
│   ├── members.html      # Member management — search + tier filter + CSV export
│   ├── bookings.html     # All bookings
│   └── reports.html      # Revenue trends + income breakdown + CSV export
├── src/
│   ├── styles/globals.css   # Single source of design tokens (Serene Athleticism)
│   └── js/
│       ├── components/   # navbar, footer, adminLayout, courtCard, calendar, timeSlots, modal, toast
│       ├── data/         # courts, members, finance
│       ├── lib/          # pricing (IDR), slots, storage
│       └── stores/       # bookingStore, authStore (localStorage)
├── public/favicon.svg
└── vite.config.js        # multi-page rollupOptions.input
```

## Design System

Single source in `src/styles/globals.css` (`@theme` + `:root` vars) extracted from `stitch/.../serene_athleticism/DESIGN.md` — 30+ colors, typography scale, radii, spacing. Tailwind v4 reads them via `@import "tailwindcss"`. No more duplicated `tailwind.config` per page.

## How to Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview dist
```

## User Flow

Landing → Find Courts (filter price/type/amenities, sort, pagination) → Court Detail or Book Now → Booking (calendar month nav, duration, time slots with occupied states, live IDR total) → Checkout (mock payment method) → Success (e-ticket + code) → Dashboard (upcoming countdown + history, cancel).

## Admin

Sign in with Role = Admin (any name/email) → `/admin/index.html`. Guard redirects to login if not admin. Courts filter, Members search/tier/export, Bookings status filter, Reports revenue bars + donut + export.

## Improvements over Stitch

- No Tailwind CDN — build-time, purged, cached CSS.
- One design token source — no 7× duplication.
- Shared navbar/footer/admin sidebar — no copy-paste drift; admin sidebar mobile drawer with hamburger.
- Real routing between pages, query params, localStorage persistence.
- Functional calendar (month nav, disable past, keyboard), duration & slot selection, live pricing (IDR), occupied slot logic.
- New pages: court detail, checkout, success, admin bookings, 404.
- A11y: proper `alt`, `aria-*`, `disabled`, label association, focus ring.
- Currency `Rp` via `Intl.NumberFormat`, consistent English copy.
