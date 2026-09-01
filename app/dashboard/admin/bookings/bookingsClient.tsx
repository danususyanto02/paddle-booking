"use client";

import { useEffect, useState, useCallback } from "react";
import { formatIDRShort } from "@/lib/pricing";
import { TableRowSkeleton } from "@/components/ui/skeleton";

type Booking = { id: string; code: string; date: string; start: string; end: string; duration: number; total: number; status: string; court: { name: string; location: string } | null; user: { username: string } | null };

export default function AdminBookingsClient() {
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Booking[] | null>(null);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);

  const fetchData = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    const r = await fetch(`/api/v1/bookings?${qs.toString()}`, { credentials: "include" });
    const j = await r.json().catch(() => ({ data: [] }));
    if (r.status === 401 || r.status === 403) { setData([]); return; }
    setData((j.data as Booking[]) ?? []);
    setMeta((j.meta as never) ?? null);
  }, [page, status, q]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const badge = (s: string) => s === "CANCELLED" ? "bg-error-container text-on-error-container" : s === "COMPLETED" ? "bg-surface-variant text-on-surface" : "bg-mint-glace text-on-primary-fixed-variant";

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code..." className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm">
          <option value="">All</option><option value="CONFIRMED">Confirmed</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="PENDING">Pending</option>
        </select>
      </div>
      <div className="mt-6 bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 p-3 bg-surface-container-low text-xs font-semibold text-secondary">
          <div className="col-span-2">Code</div><div className="col-span-4">Court / User</div><div className="col-span-3">Date & Time</div><div className="col-span-2 text-right">Cost</div><div className="col-span-1 text-center">Status</div>
        </div>
        {data === null ? <TableRowSkeleton count={4} /> : data.length === 0 ? <div className="p-8 text-center text-sm text-secondary">No bookings found.</div> : data.map((b) => (
          <div key={b.id} className="grid md:grid-cols-12 gap-2 p-4 border-b border-surface-variant/20 items-center text-sm hover:bg-surface">
            <div className="md:col-span-2 font-mono text-xs">{b.code}</div>
            <div className="md:col-span-4"><div className="font-medium">{b.court?.name ?? "—"}</div><div className="text-xs text-secondary">{b.user?.username ?? ""}</div></div>
            <div className="md:col-span-3 text-xs">{b.date.slice(0, 10)} · {b.start}–{b.end} · {b.duration}m</div>
            <div className="md:col-span-2 text-right font-semibold">{formatIDRShort(b.total)}</div>
            <div className="md:col-span-1 text-center"><span className={`text-xs px-2 py-1 rounded-full ${badge(b.status)}`}>{b.status}</span></div>
          </div>
        ))}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 p-3">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">Prev</button>
            <span className="text-sm py-1">{page} / {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </>
  );
}
