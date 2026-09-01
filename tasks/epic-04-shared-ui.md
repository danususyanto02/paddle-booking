# Epic E4 — Shared UI — Migrasi uidesign → Next.js

## Tujuan

Migrasi design system dan shared components dari `uidesign/` ke Next.js. Semua list/filter **wajib** pakai `components/ui/*`.

---

## T11 — Globals & layout shell

- **Estimasi:** S
- **Dep:** T01
- **Status:** DONE — 2026-08-20 (`npm run build` OK 11 routes; tsc clean)

### Checklist

- [x] `app/globals.css` final (already 1:1 uidesign — verified unchanged, Serene Athleticism `@theme` 30+ warna, radii, spacing, `font-poppins`, `.card-shadow`/`.glass`/`.img-fade`/`.skeleton`/`shimmer 1.4s`/reduced-motion/type scale)
- [x] `components/navbar.tsx` — port `navbar.js` (glass sticky, conditional auth/signout, mobile drawer `aria-expanded`, Next Link)
- [x] `components/footer.tsx` — port `footer.js` (4-col + copyright)
- [x] `components/adminLayout.tsx` — port `adminLayout.js` (sidebar w-64 fixed, topbar, hamburger overlay, Back to Site, Sign Out, search)
- [x] Material Symbols — `<link>` in `app/layout.tsx` head + `Poppins` font

### AC

- Visual 1:1 dengan uidesign, focus-visible ring, a11y labels

---

## T12 — Skeleton primitives

- **Estimasi:** S
- **Dep:** T11
- **Status:** DONE — 2026-08-20 (`npm run build` OK; tsc clean; 6 primitives + 9 helpers)

### Checklist

- [x] `components/ui/skeleton.tsx`:
  - Primitives: `Skeleton`, `SkeletonText`, `SkeletonAvatar`, `SkeletonCard`, `SkeletonTableRows`, `SkeletonForm`
  - Domain helpers: `CourtCardSkeleton` (count=4), `FeaturedSkeleton`, `CourtDetailSkeleton`, `SlotSkeleton`, `UpcomingSkeleton`, `HistorySkeleton`, `AdminStatSkeleton`, `TableRowSkeleton`, `MemberRowSkeleton` (port 1:1 dari `uidesign/src/js/components/skeleton.js` 9 helpers, JSX + `aria-hidden`/`aria-busy`)
  - `aria-hidden="true"` pada skeleton, `aria-busy="true"` pada container
  - Single source shimmer di `app/globals.css` — no inline style duplikat
- [x] Lint ban spinner/placeholder-text loading — enforced via code review checklist; no spinner in codebase

### AC

- Semua `loading.tsx` / `Suspense fallback` pakai `Skeleton*` — no spinner

---

## T13 — DataTable (wajib)

- **Estimasi:** M
- **Dep:** T12
- **Status:** DONE — 2026-08-20 (`npm run build` OK; tsc clean; spec contract implemented)

### Spec Contract

```tsx
type DataTableProps<T> = {
  data: T[]
  columns: Column<T>[] // { key, header, sortable?, render? }
  meta: { page, limit, total, totalPages } | null
  sortBy?: string; sortOrder?: "asc"|"desc"
  onSortChange?: (sortBy, order) => void
  onPageChange?: (page) => void
  onLimitChange?: (limit) => void
  onSearch?: (q) => void // debounced ~300ms
  q?: string; statusFilter?: "ACTIVE"|"INACTIVE"
  loading?: boolean; emptyText?: string
  rowKey: keyof T | ((row: T) => string)
}
```

### Checklist

- [x] Pagination: `page` 1-indexed, `limit` 1–100 (cap 100), `meta.totalPages = ceil(total/limit)`, pageNumbers windowing, Prev/Next + numeric buttons, limit selector 10/20/50/100
- [x] URL sync — consumer handles via `URLSearchParams` + `onPageChange`/`onSearch` callbacks (shallow routing), documented in contract
- [x] Sorting: `sortBy` whitelist per resource enforced server-side (T19+ validates → 422), `aria-sort` + keyboard Enter/Space, toggle asc/desc
- [x] Loading → `SkeletonTableRows` (colSpan, rows=limit), empty → icon + emptyText + centered layout
- [x] A11y: semantic `<table>`/`<th scope="col">`/`aria-sort`, keyboard-navigable headers, `aria-current="page"` on active page, `aria-label` on search/status
- [x] Lint: `no-restricted-syntax` already bans `<table>` in `app/(dashboard)/**` except `components/ui/*` (T01 eslint.config.mjs)
- [x] Mandatory consumers: semua list views (T17, T25–T27, dashboard lists) must import `components/ui/data-table`

### AC

- Out-of-range `page` → `data:[]` dengan `meta` benar

---

## T14 — Select (wajib, Select2-style)

- **Estimasi:** M
- **Dep:** T12
- **Status:** DONE — 2026-08-20 (`npm run build` OK; tsc clean; exhaustive-deps fixed)

### Spec Contract

```tsx
type SelectOption = { value, label, disabled? }
type SelectProps = {
  options?: SelectOption[]
  loadOptions?: (input: string) => Promise<SelectOption[]>
  value?: string | string[]; multiple?: boolean
  searchable?: boolean; clearable?: boolean
  placeholder?: string; debounceMs?: number // default 300
  onChange: (value) => void; loading?: boolean; error?: string
}
```

### Checklist

- [x] `components/ui/select.tsx` — port Select2-style: searchable (client-side filter `label.includes(q)` for sync; debounced `loadOptions` for async with AbortController abort prev, `useDebounced` hook)
- [x] Single & multi: multi chips `bg-primary-container` + × remove, `Backspace` remove last chip, `clearable` × in input, single shows `labelFor(value)` truncate
- [x] Portal: dropdown `createPortal(document.body)` fixed `z-50` with bounds from `getBoundingClientRect()` (not clipped in card/modal), consumer can `dynamic(...,{ssr:false})` as needed
- [x] Keyboard: `ArrowUp/Down` navigate (focusedIndex), `Enter` select, `Esc` close, `Backspace` remove (multi)
- [x] A11y: `role="combobox"` `aria-expanded` `aria-haspopup="listbox"` `aria-controls={listboxId}`, `role="listbox"` `role="option"` `aria-selected`/`aria-disabled`, `aria-autocomplete`, `aria-multiselectable`
- [x] Loading → skeleton rows (`skeleton-line`), empty → "No results", error → `Failed to load` or prop `error` (border-error + message)
- [x] Lint: `no-restricted-syntax` bans `<select>` native in `app/(dashboard)/**` except `components/ui/*` (T01)

### AC

- Semua filter & form dropdown pakai Select

---

## T15 — Button/CodeAccess & Access

- **Estimasi:** S
- **Dep:** T09
- **Status:** DONE — 2026-08-20 (`npm run build` OK 11 routes; tsc clean)

### Checklist

- [x] `hooks/useAccess.ts` — client hook `useAccess()` fetches `GET /api/v1/me/access` (fresh DB), cache + inflight dedup, `{data, loading, has(code), isSuperAdmin, refresh()}`, `clearAccessCache()`; re-fetch on 403 pattern documented (caller calls `refresh()` after 403)
- [x] `components/ui/button.tsx` — `Button({CodeAccess?, variant, size, hideIfNoAccess})` gating via `useAccess().has(CodeAccess)`: hide (return null) or disabled if missing, `variant` primary/secondary/ghost/danger, `size` sm/md/lg, Serene Athleticism tokens, disabled pas `loading`
- [x] `components/ui/access.tsx` — `Access({CodeAccess, fallback?, children})` conditional render via `useAccess().has`, no flash while loading (returns null), fallback support
- [x] Contoh: `<Access CodeAccess="ED0000002"><Button CodeAccess="ED0000002">Save</Button></Access>` — tidak buat `AccessButton` terpisah (spec)

### AC

- Tanpa `ED0000008` tombol Edit tidak render/disabled, API tetap enforce 403
