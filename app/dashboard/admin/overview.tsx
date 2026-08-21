"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminStatSkeleton, TableRowSkeleton } from "@/components/ui/skeleton";
import { formatIDRShort } from "@/lib/pricing";

type StatsData = {
  revenue: number;
  activeMembers: number;
  todayBookings: number;
  pending: number;
  activities: { id: string; code: string; date: string; start: string; end: string; status: string; court: { name: string } }[];
  weekly: number[];
};

export default function AdminOverview() {
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    fetch("/api/v1/admin/stats", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setData((j.data as StatsData) ?? null))
      .catch(() => setData({ revenue: 0, activeMembers: 0, todayBookings: 0, pending: 0, activities: [], weekly: Array(7).fill(0) }));
  }, []);

  if (!data) return <div className="mt-8"><AdminStatSkeleton count={4} /></div>;

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const max = Math.max(1, ...data.weekly);

  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-6 relative overflow-hidden"><div className="absolute -right-6 -top-6 w-24 h-24 bg-mint-glace rounded-full opacity-50" /><div className="relative"><div className="w-10 h-10 rounded-lg bg-mint-glace grid place-items-center text-primary"><span className="material-symbols-outlined">payments</span></div><div className="text-xs text-on-surface-variant mt-3 uppercase tracking-widest">Total Revenue</div><div className="text-2xl font-bold">{formatIDRShort(data.revenue)}</div></div></div>
        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-6 relative overflow-hidden"><div className="absolute -right-6 -top-6 w-24 h-24 bg-sky-tint rounded-full opacity-50" /><div className="relative"><div className="w-10 h-10 rounded-lg bg-sky-tint grid place-items-center text-tertiary"><span className="material-symbols-outlined">group</span></div><div className="text-xs text-on-surface-variant mt-3 uppercase tracking-widest">Active Members</div><div className="text-2xl font-bold">{data.activeMembers}</div></div></div>
        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-6 relative overflow-hidden"><div className="absolute -right-6 -top-6 w-24 h-24 bg-surface-cream rounded-full opacity-60" /><div className="relative"><div className="w-10 h-10 rounded-lg bg-surface-container grid place-items-center"><span className="material-symbols-outlined">calendar_today</span></div><div className="text-xs text-on-surface-variant mt-3 uppercase tracking-widest">Today&apos;s Bookings</div><div className="text-2xl font-bold">{data.todayBookings} <span className="text-xs font-normal text-on-surface-variant">({data.pending} pending)</span></div></div></div>
        <div className="bg-surface-container-lowest rounded-xl border border-surface-variant p-6 relative overflow-hidden"><div className="absolute -right-6 -top-6 w-24 h-24 bg-lavender-mist rounded-full opacity-50" /><div className="relative"><div className="w-10 h-10 rounded-lg bg-lavender-mist grid place-items-center text-secondary"><span className="material-symbols-outlined">donut_large</span></div><div className="text-xs text-on-surface-variant mt-3 uppercase tracking-widest">Court Occupancy</div><div className="text-2xl font-bold">84% <span className="text-xs font-normal text-secondary">Peak Hours</span></div></div></div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        <section className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden">
          <div className="p-4 border-b border-surface-variant/50 flex justify-between items-center bg-surface-cream/30">
            <h3 className="font-semibold">Recent Activities</h3>
            <Link href="/dashboard/admin/bookings" className="text-xs font-semibold text-primary hover:underline">View All</Link>
          </div>
          {data.activities.length === 0 ? <div className="p-8 text-center text-sm text-secondary">No activities yet.</div> : data.activities.map((b) => (
            <div key={b.id} className="flex items-center p-4 border-b border-surface-variant/20 hover:bg-surface-cream">
              <div className="w-9 h-9 rounded-full bg-mint-glace grid place-items-center text-primary"><span className="material-symbols-outlined text-[18px]">sports_tennis</span></div>
              <div className="ml-3 flex-1"><div className="text-sm"><span className="font-semibold">{b.court?.name ?? b.code}</span> — {b.status} · {b.start}–{b.end}</div><div className="text-xs text-on-surface-variant">{b.date.slice(0, 10)}</div></div>
              <span className="text-xs text-on-surface-variant">{b.code}</span>
            </div>
          ))}
        </section>
        <section className="bg-surface-container-lowest rounded-xl border border-surface-variant p-6">
          <h3 className="font-semibold">Weekly Bookings</h3>
          <div className="mt-4 h-48 flex items-end gap-2">
            {data.weekly.map((c, i) => {
              const h = Math.round((c / max) * 100);
              const isPeak = c === max && c > 0;
              return <div key={i} className="flex-1 flex flex-col items-center gap-2"><div className={`w-full rounded-t-md ${isPeak ? "bg-primary" : "bg-mint-glace"}`} style={{ height: `${Math.max(8, h)}%` }} /><span className={`text-xs ${isPeak ? "font-semibold text-primary" : "text-on-surface-variant"}`}>{days[i]}</span></div>;
            })}
          </div>
        </section>
      </div>
    </>
  );
}
