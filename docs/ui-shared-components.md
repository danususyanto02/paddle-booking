# UI Shared Components — Kinetic Court

Single source of truth: `components/ui/*` — every dashboard/public list/filter must import from here.

## Skeleton
`components/ui/skeleton.tsx` — `Skeleton`, `SkeletonText`, `SkeletonAvatar`, `SkeletonCard`, `SkeletonTableRows`, `SkeletonForm` + helpers `CourtCardSkeleton`, `FeaturedSkeleton`, `CourtDetailSkeleton`, `SlotSkeleton`, `UpcomingSkeleton`, `HistorySkeleton`, `AdminStatSkeleton`, `TableRowSkeleton`, `MemberRowSkeleton`. Style from `app/globals.css` `.skeleton` shimmer 1.4s, `prefers-reduced-motion` disables.

## DataTable
`components/ui/data-table.tsx` — contract `{ data, columns, meta, sortBy, sortOrder, onSortChange, onPageChange, onLimitChange, onSearch, q, statusFilter, loading, emptyText, rowKey }`. Pagination, URL-sync, sorting via whitelist, `SkeletonTableRows` loading, empty state.

## Select
`components/ui/select.tsx` — searchable, async `loadOptions` with debounce & AbortController, single & multi chips, portal via `createPortal`, keyboard (ArrowUp/Down, Enter, Esc, Backspace), a11y `combobox`/`listbox`/`option`.

## Button & Access
`hooks/useAccess.ts` + `components/ui/button.tsx` + `components/ui/access.tsx` — `CodeAccess` gating via `GET /api/v1/me/access` fresh DB. `Button` hides or disables; `Access` conditionally renders. `SUPER_ADMIN` bypass handled server-side.
