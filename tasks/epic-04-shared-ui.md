# Epic E4 — Shared UI — Migrasi uidesign → Next.js

## Tujuan

Migrasi design system dan shared components dari `uidesign/` ke Next.js. Semua list/filter **wajib** pakai `components/ui/*`.

---

## T11 — Globals & layout shell

- **Estimasi:** S
- **Dep:** T01
- **Status:** TODO

### Checklist

- [ ] `app/globals.css` final:
  - `@theme` Serene Athleticism (30+ warna), radii, spacing, `font-poppins`
  - `.card-shadow`, `.glass`, `.img-fade`/`.is-loaded`
  - `.skeleton`/`.skeleton-line`/`.skeleton-avatar` + `@keyframes shimmer 1.4s`
  - `prefers-reduced-motion: reduce` disable shimmer
  - Typography utilities (`.font-display-lg` dsb) jika dipakai
- [ ] `components/navbar.tsx` — port `navbar.js` (glass sticky, auth conditional, mobile drawer `aria-expanded`)
- [ ] `components/footer.tsx` — port `footer.js` (4-col + copyright)
- [ ] `components/adminLayout.tsx` — port `adminLayout.js` (sidebar 64w fixed, topbar, hamburger overlay, Back to Site, Sign Out)
- [ ] Material Symbols / icons setup

### AC

- Visual 1:1 dengan uidesign, focus-visible ring, a11y labels

---

## T12 — Skeleton primitives

- **Estimasi:** S
- **Dep:** T11
- **Status:** TODO

### Checklist

- [ ] `components/ui/skeleton.tsx`:
  - Primitives: `Skeleton`, `SkeletonText`, `SkeletonAvatar`, `SkeletonCard`, `SkeletonTableRows`, `SkeletonForm`
  - Domain helpers: `CourtCardSkeleton`, `FeaturedSkeleton`, `CourtDetailSkeleton`, `SlotSkeleton`, `UpcomingSkeleton`, `HistorySkeleton`, `AdminStatSkeleton`, `TableRowSkeleton`, `MemberRowSkeleton` (port dari `skeleton.js` 9 helpers)
  - `aria-hidden="true"` pada skeleton, `aria-busy="true"` pada container
  - Single source shimmer di `app/globals.css` — no inline style duplikat
- [ ] Lint ban spinner/placeholder-text loading

### AC

- Semua `loading.tsx` / `Suspense fallback` pakai `Skeleton*` — no spinner

---

## T13 — DataTable (wajib)

- **Estimasi:** M
- **Dep:** T12
- **Status:** TODO

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

- [ ] Pagination: `page` 1-indexed, `limit` 1–100 (cap 100), `meta.totalPages = ceil(total/limit)`
- [ ] URL sync via `URLSearchParams` (shallow routing), preservasi refresh/share
- [ ] Sorting: `sortBy` whitelist per resource, `aria-sort`, invalid → 422
- [ ] Loading → `SkeletonTableRows`, empty → icon + emptyText + CTA
- [ ] A11y: semantic `<table>`, keyboard-navigable headers
- [ ] Lint: ban `<table>` di `app/(dashboard)/**` kecuali `components/ui/*`
- [ ] Mandatory consumers: semua list views

### AC

- Out-of-range `page` → `data:[]` dengan `meta` benar

---

## T14 — Select (wajib, Select2-style)

- **Estimasi:** M
- **Dep:** T12
- **Status:** TODO

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

- [ ] Searchable: client-side filter (sync) + debounced `loadOptions` (async, abort prev)
- [ ] Single & multi: chips + × remove, Backspace remove last
- [ ] Portal: dropdown fixed portal (tidak clip di card/modal), `ssr:false`
- [ ] Keyboard: ArrowUp/Down, Enter, Esc, Backspace
- [ ] A11y: `combobox`/`listbox`/`option`, `aria-expanded`/`aria-controls`
- [ ] Loading → skeleton rows, empty → "No results", error → "Failed to load"
- [ ] Lint: ban `<select>` native

### AC

- Semua filter & form dropdown pakai Select

---

## T15 — Button/CodeAccess & Access

- **Estimasi:** S
- **Dep:** T09
- **Status:** TODO

### Checklist

- [ ] `components/ui/button.tsx` — prop `CodeAccess?: string`, gating via effective permissions
- [ ] `components/ui/access.tsx` — conditional render children via `CodeAccess`
- [ ] Contoh: `<Access CodeAccess="ED0000002"><Button CodeAccess="ED0000002">Save</Button></Access>`
- [ ] Jangan buat `AccessButton` terpisah

### AC

- Tanpa `ED0000008` tombol Edit tidak render/disabled, API tetap enforce 403
