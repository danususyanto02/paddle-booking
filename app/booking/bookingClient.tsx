"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/calendar";
import { TimeSlots } from "@/components/timeSlots";
import { SlotSkeleton } from "@/components/ui/skeleton";
import { calcTotal, formatIDRShort } from "@/lib/pricing";
import { endTime, canFit } from "@/lib/slots";

type Court = { id: string; code: string; name: string; type: string; surface: string; pricePerHour: number; image: string; status: string; badge: string | null; location: string; amenities: string[]; rating: number; reviews: number };

type SlotRow = { start: string; period: string; occupied: boolean; canFit: boolean };

export default function BookingClient({ court }: { court: Court }) {
  const router = useRouter();
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedISO, setSelectedISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState<60 | 90 | 120>(90);
  const [slot, setSlot] = useState<string | null>(null);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const subtitle = useMemo(() => `Select your preferred date, duration, and time slot for ${court.name}.`, [court.name]);

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/v1/bookings/slots?courtId=${court.id}&date=${selectedISO}&duration=${duration}`, { cache: "no-store" });
      const json = (await res.json()) as { data: SlotRow[] };
      setSlots(json.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [court.id, selectedISO, duration]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Duration change may invalidate current slot if new duration doesn't fit or overlaps
  useEffect(() => {
    if (slot && !canFit(slot, duration)) setSlot(null);
    // also if slot now occupied under new duration (overlap widened), clear
    if (slot) {
      const row = slots.find((s) => s.start === slot);
      if (row?.occupied) setSlot(null);
    }
  }, [duration, slot, slots]);

  const confirmHref = slot
    ? `/checkout?courtId=${court.code}&date=${selectedISO}&slot=${encodeURIComponent(slot)}&duration=${duration}`
    : null;

  const totals = slot ? calcTotal(court.pricePerHour, duration) : null;

  const onConfirm = () => {
    if (!slot || !confirmHref) return;
    router.push(confirmHref);
  };

  const durations: (60 | 90 | 120)[] = [60, 90, 120];

  return (
    <div>
      <Link href="/courts" className="inline-flex items-center gap-1 text-sm font-medium text-on-surface-variant hover:text-primary">
        <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Courts
      </Link>

      <div className="grid lg:grid-cols-12 gap-8 mt-8">
        <div className="lg:col-span-8 space-y-10">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg">Schedule Session</h1>
            <p className="text-sm text-on-surface-variant mt-1">{subtitle}</p>
          </div>

          <section>
            <div className="flex items-center gap-3 mb-4"><span className="w-7 h-7 rounded-full bg-primary-fixed grid place-items-center text-xs font-bold">1</span><h2 className="font-semibold">Select Date</h2></div>
            <Calendar
              year={calYear}
              month={calMonth}
              selectedISO={selectedISO}
              onSelect={(iso) => { setSelectedISO(iso); setSlot(null); }}
              onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
            />
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4"><span className="w-7 h-7 rounded-full bg-primary-fixed grid place-items-center text-xs font-bold">2</span><h2 className="font-semibold">Duration</h2></div>
            <div className="grid grid-cols-3 gap-3">
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  aria-pressed={duration === d}
                  className={`py-6 rounded-xl border text-center ${duration === d ? "border-2 border-primary-fixed bg-surface shadow" : "border-outline-variant bg-surface-container-lowest hover:border-primary-fixed"}`}
                >
                  <div className="text-xl font-semibold">{d}</div>
                  <div className="text-xs text-secondary">MINUTES</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4"><span className="w-7 h-7 rounded-full bg-primary-fixed grid place-items-center text-xs font-bold">3</span><h2 className="font-semibold">Time Slot</h2></div>
            {slotsLoading ? <SlotSkeleton /> : <TimeSlots slots={slots} selected={slot} onSelect={setSlot} />}
          </section>
        </div>

        {/* Sticky summary */}
        <div className="lg:col-span-4">
          <div className="sticky top-24 bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden card-shadow">
            <div className="h-32 relative">
              {/* eslint-disable @next/next/no-img-element */}
              <img src={court.image} alt={court.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <span className="text-xs px-2 py-1 rounded-full bg-white/20 backdrop-blur border border-white/20">{court.type}</span>
                <div className="font-semibold">{court.name}</div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 text-sm">
                <span className="material-symbols-outlined text-secondary">calendar_month</span>
                <div>
                  <div className="font-semibold">{(() => { const d = new Date(selectedISO + "T12:00:00"); return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }); })()}</div>
                  <div className="text-xs text-secondary">{new Date(selectedISO + "T12:00:00").getFullYear()}</div>
                </div>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <span className="material-symbols-outlined text-secondary">schedule</span>
                <div>
                  <div className="font-semibold">{slot ? `${slot} – ${endTime(slot, duration)}` : "Select a time slot"}</div>
                  <div className="text-xs text-secondary">{slot ? `${duration} Minutes` : ""}</div>
                </div>
              </div>
              <div className="h-px bg-outline-variant/40" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-on-surface-variant"><span>Court Fee</span><span>{totals ? formatIDRShort(totals.courtFee) : "—"}</span></div>
                <div className="flex justify-between text-on-surface-variant"><span>Processing Fee</span><span>{totals ? formatIDRShort(totals.processingFee) : "—"}</span></div>
              </div>
              <div className="bg-surface-container p-3 rounded-lg flex justify-between items-center"><span className="font-semibold">Total</span><span className="font-semibold text-primary">{totals ? formatIDRShort(totals.total) : "—"}</span></div>
              <button onClick={onConfirm} disabled={!slot || !confirmHref} className="w-full py-3 rounded-lg bg-primary-fixed text-on-primary-fixed text-sm font-semibold inline-flex justify-center items-center gap-2 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                Confirm Booking <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <p className="text-xs text-center text-secondary">Free cancellation up to 24 hours in advance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
