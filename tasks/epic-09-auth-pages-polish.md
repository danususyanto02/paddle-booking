# Epic E9 — Auth Pages & Polish

## Tujuan

Halaman autentikasi, 404, dan optimisasi loading/images.

---

## T33 — Login/Register/404 pages

- **Estimasi:** S
- **Dep:** T08
- **Status:** TODO

### Checklist

- [ ] Port `uidesign/login.html` → `app/(auth)/login/page.tsx`:
  - Form username + password, Zod validation, generic error "Invalid credentials"
  - `next` param redirect, `requireAuth`/`requireAdmin` guards → `useSession` (bukan `localStorage kc_auth`)
- [ ] Port `uidesign/register.html` → `app/(auth)/register/page.tsx`:
  - `PUBLIC_REGISTRATION_ENABLED=false` default → hidden/blocked, `true` → show form
  - Disabled → 403 + UI hidden, API `POST /api/v1/auth/register` cek flag
- [ ] Port `uidesign/404.html` → `app/not-found.tsx` — branded 404, link ke `/` + `/courts`
- [ ] Auth pages styling: Poppins, Serene Athleticism tokens, card-shadow
- [ ] Logout clears cookie + releases locks + revokes refresh tokens

### AC

- Register when flag false → 403 atau hidden
- Login error tidak bocorkan existence username

---

## T34 — Lazy loading & images

- **Estimasi:** S
- **Dep:** T12
- **Status:** TODO

### Checklist

- [ ] Route-level: `loading.tsx` + `React.Suspense` per segment (`dashboard/{users,roles,orgs,features,locked-records,audit-logs,external-api-demo}` + paddle routes) — fallback pakai `Skeleton*`
- [ ] Component-level: `next/dynamic` untuk `DataTable`, `Select`, `Modal`, `Calendar` — `Select` dengan `{ ssr: false }`
- [ ] Images: `next/image` dengan `loading="lazy"` (ganti `uidesign/src/js/lib/lazyLoad.js` IntersectionObserver), non-next images keep `img-fade`/`is-loaded` fallback
- [ ] Prefetch: `next/link` prefetch enabled, lazy hanya splits JS chunks
- [ ] Verify: tidak ada spinner fallback manapun

### AC

- `Suspense fallback` dan `loading.tsx` semua pakai `Skeleton*`
- Images fade in, portal Select tidak clip
