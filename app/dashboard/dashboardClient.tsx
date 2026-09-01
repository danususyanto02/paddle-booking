"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { UpcomingSkeleton, HistorySkeleton } from "@/components/ui/skeleton";
import { formatIDRShort } from "@/lib/pricing";

type Booking = {
  id: string;
  code: string;
  date: string;
  start: string;
  end: string;
  duration: number;
  total: number;
  status: string;
  court: { name: string; location: string; type: string; image: string };
};

function isUpcoming(b: Booking): boolean {
  const dt = new Date(b.date.slice(0, 10) + "T" + b.start + ":00");
  return dt >= new Date() && b.status !== "CANCELLED" && b.status !== "COMPLETED";
}

function countdownText(b: Booking): string {
  const dt = new Date(b.date.slice(0, 10) + "T" + b.start + ":00");
  const diff = dt.getTime() - Date.now();
  if (diff <= 0) return "Starting now";
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  if (h > 24) { const d = Math.floor(h / 24); return `In ${d} day${d > 1 ? "s" : ""}`; }
  if (h > 0) return `Starts in ${h}h ${m}m`;
  return `Starts in ${m}m`;
}

export default function DashboardClient() {
  const [upcoming, setUpcoming] = useState<Booking[] | null>(null);
  const [history, setHistory] = useState<Booking[] | null>(null);
  const [played, setPlayed] = useState(0);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/v1/me/bookings?limit=100&sortBy=date&sortOrder=desc", { cache: "no-store", credentials: "include" });
    const json = (await res.json()) as { data: Booking[] };
    const all: Booking[] = (json.data ?? []) as never;
    const up = all.filter(isUpcoming).slice(0, 4);
    setUpcoming(up);
    setHistory(all);
    setPlayed(all.filter((b) => b.status === "COMPLETED" || b.status === "CONFIRMED").length);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, [fetchData]);

  const onCancel = async (id: string) => {
    if (!confirm("Cancel booking? This will free the slot.")) return;
    let csrf: string | null = null;
    try {
      const cr = await fetch("/api/v1/auth/csrf", { credentials: "include" });
      if (cr.ok) { const j = await cr.json() as { data?: { csrfToken?: string } }; csrf = j.data?.csrfToken ?? null; }
    } catch {}
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (csrf) headers["x-csrf-token"] = csrf;
    headers["Origin"] = window.location.origin;
    const res = await fetch(`/api/v1/bookings/${id}/cancel`, { method: "PATCH", credentials: "include", headers });
    if (res.ok) fetchData();
    else {
      const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
      alert(j.error?.message ?? "Cancel failed");
    }
  };

  const upcomingCount = upcoming?.length ?? 0;

  return (
    <div className="space-y-12">
      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 p-6 text-center">
          {/* eslint-disable @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80" alt="User" className="w-20 h-20 rounded-full object-cover mx-auto border-4 border-surface" width={80} height={80} />
          <h1 className="font-semibold mt-3">Welcome back</h1>
          <p className="text-sm text-on-surface-variant">Level: Advanced</p>
        </div>
        <div className="md:col-span-2 bg-primary text-on-primary rounded-xl p-8 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 text-primary-fixed text-xs font-semibold tracking-widest uppercase"><span className="material-symbols-outlined text-[18px]">stars</span> Current Tier</div>
            <h2 className="text-2xl font-bold mt-1">Pro Access Active</h2>
            <p className="text-sm text-white/80 mt-1">Your membership and bookings at a glance.</p>
            <div className="flex gap-6 mt-6">
              <div><div className="text-3xl font-bold">{played}</div><div className="text-xs text-primary-fixed">Matches Played</div></div>
              <div className="w-px bg-white/20" />
              <div><div className="text-3xl font-bold">{upcomingCount}</div><div className="text-xs text-primary-fixed">Upcoming</div></div>
              <Link href="/courts" className="ml-auto self-center bg-primary-container text-on-primary-container px-5 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90">Book Again</Link>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold inline-flex items-center gap-2"><span className="material-symbols-outlined text-primary">event_available</span> Next Up</h3>
          <span className="text-xs text-secondary">{upcomingCount ? `${upcomingCount} upcoming` : ""}</span>
        </div>
        {upcoming === null ? <UpcomingSkeleton count={2} /> : upcoming.length === 0 ? (
          <div className="text-center py-12 bg-surface-container-lowest border border-dashed border-outline-variant rounded-xl">
            <p className="text-sm text-on-surface-variant">No upcoming bookings. Ready to play?</p>
            <Link href="/courts" className="mt-3 inline-block px-5 py-2 rounded-full bg-primary text-on-primary text-sm font-semibold">Find a Court</Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {upcoming.map((b) => (
              <div key={b.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden flex flex-col sm:flex-row">
                <div className="sm:w-40 h-40 bg-surface-container shrink-0 overflow-hidden">
                  {/* eslint-disable @next/next/no-img-element */}
                  <img src={b.court.image} alt={b.court.name} width={300} height={300} className="w-full h-full object-cover img-fade is-loaded" loading="lazy" />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-semibold text-primary">{b.date.slice(0, 10)} · {b.start} – {b.end}</div>
                    <div className="font-semibold">{b.court.name}</div>
                    <div className="text-xs text-on-surface-variant">{b.court.location} · {b.court.type}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="px-3 py-1.5 rounded-lg bg-mint-glace text-on-primary-fixed-variant text-xs font-semibold">{countdownText(b)}</span>
                    <button onClick={() => onCancel(b.id)} className="text-xs font-semibold text-secondary hover:text-error">Cancel</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="font-semibold inline-flex items-center gap-2 mb-4"><span className="material-symbols-outlined text-secondary">history</span> History & Receipts</h3>
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden">
          <div className="hidden md:grid grid-cols-12 gap-4 p-3 bg-surface-container-low border-b border-outline-variant/30 text-xs font-semibold text-secondary">
            <div className="col-span-3">Date</div><div className="col-span-4">Court</div><div className="col-span-2">Duration</div><div className="col-span-2 text-right">Cost</div><div className="col-span-1 text-center">Status</div>
          </div>
          {history === null ? <HistorySkeleton count={3} /> : history.length === 0 ? <div className="p-8 text-center text-sm text-secondary">No history yet.</div> : (
            <div>
              {history.map((b) => (
                <div key={b.id} className="grid md:grid-cols-12 gap-2 p-4 border-b border-outline-variant/20 items-center hover:bg-surface text-sm">
                  <div className="md:col-span-3 font-medium">{b.date.slice(0, 10)}</div>
                  <div className="md:col-span-4 inline-flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-primary-container grid place-items-center"><span className="material-symbols-outlined text-[16px]">sports_tennis</span></span> {b.court.name}</div>
                  <div className="md:col-span-2 text-on-surface-variant">{b.duration} mins · {b.start}</div>
                  <div className="md:col-span-2 text-right font-semibold">{formatIDRShort(b.total)}</div>
                  <div className="md:col-span-1 text-center"><span className={`text-xs px-2 py-1 rounded-full ${b.status === "CANCELLED" ? "bg-error-container text-on-error-container" : "bg-mint-glace text-on-primary-fixed-variant"}`}>{b.status}</span></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
