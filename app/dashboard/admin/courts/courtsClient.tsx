"use client";

import { useEffect, useState, useCallback } from "react";
import { CourtCardSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { formatIDRShort } from "@/lib/pricing";
import { useRecordLock } from "@/hooks/useRecordLock";

type Court = { id: string; code: string; name: string; location: string; type: string; pricePerHour: number; rating: number; status: string; image: string; badge: string | null };

export default function AdminCourtsClient() {
  const [filter, setFilter] = useState<string>("All");
  const [courts, setCourts] = useState<Court[] | null>(null);
  const [editing, setEditing] = useState<Court | null>(null);
  const lock = useRecordLock(editing ? "COURT" : "COURT", editing?.id ?? "__none");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Court> & { code?: string }>({ code: "", name: "", location: "", type: "INDOOR", pricePerHour: 100000, image: "", status: "AVAILABLE" });

  const fetchCourts = useCallback(async () => {
    const qs = filter === "All" ? "" : `?status=${filter}`;
    const r = await fetch(`/api/v1/courts${qs}`, { credentials: "include" });
    const j = await r.json().catch(() => ({ data: [] }));
    setCourts((j.data as Court[]) ?? []);
  }, [filter]);

  useEffect(() => { fetchCourts(); }, [fetchCourts]);
  useEffect(() => { if (editing) lock.acquire().catch(() => {}); }, [editing]);

  const onSave = async () => {
    const method = editing ? "PATCH" : "POST";
    const url = editing ? `/api/v1/courts/${editing.id}` : "/api/v1/courts";
    const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
    const csrf = csrfRes.ok ? (await csrfRes.json() as { data?: { csrfToken?: string } }).data?.csrfToken : null;
    const headers: Record<string, string> = { "Content-Type": "application/json", Origin: window.location.origin };
    if (csrf) headers["x-csrf-token"] = csrf;
    if (editing && lock.token) headers["x-record-lock-token"] = lock.token;
    const body = editing ? { ...form, code: undefined } : form;
    const res = await fetch(url, { method, credentials: "include", headers, body: JSON.stringify(body) });
    if (res.status === 423) { alert("Locked by another user"); return; }
    if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: { message?: string } }; alert(j.error?.message ?? "Save failed"); return; }
    setShowForm(false); setEditing(null); await lock.release(); fetchCourts();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Archive this court?")) return;
    const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
    const csrf = csrfRes.ok ? (await csrfRes.json() as { data?: { csrfToken?: string } }).data?.csrfToken : null;
    const headers: Record<string, string> = { "Content-Type": "application/json", Origin: window.location.origin };
    if (csrf) headers["x-csrf-token"] = csrf;
    const res = await fetch("/api/v1/courts/delete", { method: "POST", credentials: "include", headers, body: JSON.stringify({ ids: [id] }) });
    const j = await res.json().catch(() => ({})) as { data?: { status?: string }[] };
    if (Array.isArray(j.data) && j.data[0]?.status === "deleted") fetchCourts();
    else alert("Delete failed");
  };

  if (courts === null) return <div className="mt-8"><CourtCardSkeleton count={4} /></div>;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-6">
        {["All", "AVAILABLE", "OCCUPIED", "MAINTENANCE"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full border text-sm font-medium ${filter === f ? "bg-primary text-on-primary border-primary" : "border-outline-variant bg-surface"}`}>{f}</button>
        ))}
        <button onClick={() => { setEditing(null); setForm({ code: "", name: "", location: "", type: "INDOOR", pricePerHour: 100000, image: "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=600&q=80", status: "AVAILABLE" }); setShowForm(true); }} className="ml-auto px-4 py-1.5 rounded-full bg-primary text-on-primary text-sm font-semibold">New Court</button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {courts.map((c) => {
          const badgeCls = c.status === "AVAILABLE" ? "bg-mint-glace text-on-primary-fixed-variant" : c.status === "OCCUPIED" ? "bg-surface-variant text-on-surface" : "bg-error-container text-on-error-container";
          return (
            <div key={c.id} className={`bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-variant card-shadow ${c.status === "MAINTENANCE" ? "grayscale" : ""}`}>
              <div className="h-40 overflow-hidden bg-surface-container"><img src={c.image} alt={c.name} className="w-full h-full object-cover" loading="lazy" /></div>
              <div className="p-4">
                <div className="flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${badgeCls}`}>{c.status}</span><span className="text-xs text-secondary">{c.code}</span></div>
                <h3 className="font-semibold mt-2">{c.name}</h3>
                <p className="text-xs text-secondary">{c.location} · {c.type}</p>
                <p className="text-sm font-semibold text-primary mt-1">{formatIDRShort(c.pricePerHour)}/hr · ★ {c.rating}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => { setEditing(c); setForm({ name: c.name, location: c.location, type: c.type, pricePerHour: c.pricePerHour, image: c.image, status: c.status }); setShowForm(true); }} className="flex-1 py-2 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-surface">Edit</button>
                  <button onClick={() => onDelete(c.id)} className="flex-1 py-2 rounded-lg bg-error-container text-on-error-container text-sm font-semibold">Archive</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowForm(false); setEditing(null); lock.release(); }} />
          <div className="relative bg-surface-container-lowest rounded-xl p-6 w-full max-w-lg card-shadow space-y-4">
            <h3 className="font-semibold">{editing ? "Edit Court" : "New Court"}</h3>
            {editing && lock.state === "LOCKED_BY_OTHER" && <p className="text-sm text-error">Locked by {lock.owner?.username} until {lock.expiresAt ? new Date(lock.expiresAt).toLocaleString() : ""} — read only.</p>}
            {editing && lock.state === "EXPIRED" && <p className="text-sm text-error">Lock expired. <button onClick={() => lock.acquire()} className="underline">Reacquire</button></p>}
            <input placeholder="Code (e.g. zeta)" value={form.code ?? ""} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm disabled:opacity-50" />
            <input placeholder="Name" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={editing ? lock.state !== "LOCKED_BY_SELF" : false} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Location" value={form.location ?? ""} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm" />
            <select value={form.type ?? "INDOOR"} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm">
              <option>INDOOR</option><option>OUTDOOR</option><option>COVERED</option><option>ROOFTOP</option>
            </select>
            <input type="number" placeholder="Price per hour" value={form.pricePerHour ?? 100000} onChange={(e) => setForm({ ...form, pricePerHour: Number(e.target.value) })} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Image URL" value={form.image ?? ""} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm" />
            <select value={form.status ?? "AVAILABLE"} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm">
              <option>AVAILABLE</option><option>OCCUPIED</option><option>MAINTENANCE</option>
            </select>
            <div className="flex gap-2">
              <button onClick={onSave} disabled={editing ? lock.state !== "LOCKED_BY_SELF" : false} className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold disabled:opacity-40">Save</button>
              <button onClick={() => { setShowForm(false); setEditing(null); lock.release(); }} className="flex-1 py-2 rounded-lg border border-outline-variant text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
