/**
 * Skeleton primitives — single source of truth for loading states.
 * Spec: Shared UI / Skeleton Loading. Reuses .skeleton shimmer from app/globals.css.
 * All primitives render aria-hidden on skeleton nodes; container should set aria-busy.
 * No spinner/placeholder-text loading allowed — every loading.tsx / Suspense fallback must use these.
 */

// ── Base primitives ────────────────────────────────────────────────────

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`skeleton ${className}`} {...props} />;
}

export function SkeletonLine({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`skeleton-line ${className}`} {...props} />;
}

export function SkeletonAvatar({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`skeleton-avatar ${className}`} {...props} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`skeleton-line ${i === lines - 1 ? "w-5/6" : "w-full"} h-3`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`rounded-xl border border-surface-variant p-6 space-y-3 skeleton ${className}`} />;
}

export function SkeletonTableRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div aria-hidden="true" className="space-y-0">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center p-4 border-b border-surface-variant/20 gap-3">
          <span className="skeleton-avatar w-9 h-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-line w-32 h-4" />
            <div className="skeleton-line w-24 h-3" />
          </div>
          <span className="skeleton-line w-14 h-5 rounded-full hidden sm:block" />
          {Array.from({ length: Math.max(0, cols - 3) }).map((_, c) => (
            <span key={c} className="skeleton-line w-16 h-4 hidden md:block" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonForm({ fields = 4 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="skeleton-line w-20 h-3" />
          <div className="skeleton h-10 rounded-lg" />
        </div>
      ))}
      <div className="skeleton h-10 rounded-lg w-24" />
    </div>
  );
}

// ── Domain helpers (port of uidesign/src/js/components/skeleton.js 9 helpers) ──

export function CourtCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} aria-hidden="true" className="bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-variant flex flex-col">
          <div className="h-48 skeleton" />
          <div className="p-5 space-y-3">
            <div className="flex justify-between gap-4">
              <div className="skeleton-line w-32 h-4" />
              <div className="skeleton-line w-20 h-4" />
            </div>
            <div className="skeleton-line w-40 h-3" />
            <div className="skeleton-line w-32 h-3" />
            <div className="flex gap-2">
              <span className="skeleton-line w-12 h-5 rounded-full" />
              <span className="skeleton-line w-14 h-5 rounded-full" />
              <span className="skeleton-line w-10 h-5 rounded-full" />
            </div>
            <div className="skeleton h-10 rounded-lg" />
          </div>
        </article>
      ))}
    </div>
  );
}

export function FeaturedSkeleton() {
  return (
    <div aria-hidden="true" className="grid md:grid-cols-12 gap-6">
      <div className="md:col-span-8 rounded-2xl overflow-hidden border border-outline-variant/30 min-h-[380px] skeleton" />
      <div className="md:col-span-4 flex flex-col gap-6">
        <div className="rounded-2xl min-h-[180px] flex-1 border border-outline-variant/30 skeleton" />
        <div className="rounded-2xl min-h-[180px] flex-1 border border-outline-variant/30 skeleton" />
      </div>
    </div>
  );
}

export function CourtDetailSkeleton() {
  return (
    <div aria-hidden="true" className="grid lg:grid-cols-2 gap-8">
      <div className="w-full h-[420px] rounded-xl skeleton border border-surface-variant" />
      <div className="space-y-4">
        <div className="skeleton-line w-28 h-5 rounded-full" />
        <div className="skeleton-line w-48 h-7" />
        <div className="skeleton-line w-40 h-4" />
        <div className="skeleton-line w-32 h-4" />
        <div className="flex gap-2">
          <span className="skeleton-line w-14 h-6 rounded-full" />
          <span className="skeleton-line w-16 h-6 rounded-full" />
          <span className="skeleton-line w-12 h-6 rounded-full" />
        </div>
        <div className="h-20 rounded-xl skeleton border border-surface-variant" />
        <div className="space-y-2">
          <div className="skeleton-line w-full h-3" />
          <div className="skeleton-line w-5/6 h-3" />
        </div>
      </div>
    </div>
  );
}

export function SlotSkeleton() {
  const Row = ({ n }: { n: number }) => (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="h-10 rounded-lg skeleton" />
      ))}
    </>
  );
  return (
    <div aria-hidden="true" className="space-y-6">
      <div>
        <div className="skeleton-line w-20 h-4 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Row n={6} /></div>
      </div>
      <div>
        <div className="skeleton-line w-24 h-4 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Row n={6} /></div>
      </div>
      <div>
        <div className="skeleton-line w-20 h-4 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Row n={6} /></div>
      </div>
    </div>
  );
}

export function UpcomingSkeleton({ count = 2 }: { count?: number }) {
  return (
    <div aria-busy="true" className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} aria-hidden="true" className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden flex flex-col sm:flex-row">
          <div className="sm:w-40 h-40 skeleton shrink-0" />
          <div className="p-5 flex-1 space-y-3">
            <div className="skeleton-line w-32 h-3" />
            <div className="skeleton-line w-28 h-4" />
            <div className="skeleton-line w-40 h-3" />
            <div className="flex justify-between items-center pt-2">
              <span className="skeleton-line w-20 h-6 rounded-lg" />
              <span className="skeleton-line w-12 h-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function HistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-busy="true" className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} aria-hidden="true" className="grid md:grid-cols-12 gap-2 p-4 border-b border-outline-variant/20 items-center">
          <div className="md:col-span-3 skeleton-line h-4 w-24" />
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="skeleton-avatar w-8 h-8 shrink-0" />
            <span className="skeleton-line w-28 h-4" />
          </div>
          <div className="md:col-span-2 skeleton-line h-3 w-20" />
          <div className="md:col-span-2 skeleton-line h-4 w-16 ml-auto" />
          <div className="md:col-span-1 skeleton-line h-5 w-14 mx-auto rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function AdminStatSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-busy="true" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} aria-hidden="true" className="bg-surface-container-lowest rounded-xl border border-surface-variant p-6 space-y-3">
          <div className="w-10 h-10 rounded-lg skeleton" />
          <div className="skeleton-line w-20 h-3" />
          <div className="skeleton-line w-28 h-7" />
        </div>
      ))}
    </div>
  );
}

export function TableRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center p-4 border-b border-surface-variant/20 gap-3">
          <span className="skeleton-avatar w-9 h-9 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-line w-32 h-4" />
            <div className="skeleton-line w-24 h-3" />
          </div>
          <span className="skeleton-line w-14 h-5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function MemberRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="grid md:grid-cols-12 gap-2 p-4 border-b border-outline-variant/20 items-center">
          <div className="md:col-span-4 flex items-center gap-3">
            <span className="skeleton-avatar w-9 h-9 shrink-0" />
            <span className="skeleton-line w-28 h-4" />
          </div>
          <div className="md:col-span-3 skeleton-line h-4 w-28" />
          <div className="md:col-span-2 skeleton-line h-5 w-14 rounded-full" />
          <div className="md:col-span-3 skeleton-line h-3 w-20 ml-auto" />
        </div>
      ))}
    </div>
  );
}
