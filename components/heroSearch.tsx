"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CustomSelect from "@/components/ui/customSelect";
import DatePicker from "@/components/ui/datePicker";

const FALLBACK_LOCATIONS = [
  "Kinetic Downtown Hub",
  "Kinetic Riverside",
  "Kinetic Westside",
  "Skyline Rooftop",
];

const TIME_OPTIONS = [
  { value: "", label: "Any time", icon: "schedule" },
  { value: "Morning", label: "Morning", desc: "08:00 – 12:00", icon: "light_mode" },
  { value: "Afternoon", label: "Afternoon", desc: "12:00 – 17:00", icon: "wb_sunny" },
  { value: "Evening", label: "Evening", desc: "17:00 – 22:00", icon: "dark_mode" },
];

export default function HeroSearch() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [locationOpts, setLocationOpts] = useState(() =>
    FALLBACK_LOCATIONS.map((v) => ({ value: v, label: v, icon: "location_on", desc: v.includes("Kinetic") ? "Kinetic Court venue" : "Rooftop venue" }))
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/courts?limit=100", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        const data: { location: string }[] = json.data ?? json ?? [];
        const uniq = [...new Set((data as { location: string }[]).map((c) => c.location).filter(Boolean))];
        if (!cancelled && uniq.length) {
          setLocationOpts(
            uniq.map((v) => ({
              value: v,
              label: v,
              icon: "location_on",
              desc: v.includes("Downtown") ? "Downtown area" : v.includes("Riverside") ? "Riverside area" : v.includes("Westside") ? "Westside area" : "Premium venue",
            }))
          );
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (location) qs.set("location", location);
    if (date) qs.set("date", date);
    if (time) qs.set("time", time);
    const s = qs.toString();
    router.push(`/courts${s ? `?${s}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-5xl mt-6 bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/40 rounded-2xl shadow-xl p-2 md:p-3 flex flex-col md:flex-row gap-2 md:gap-3 items-stretch md:items-center"
    >
      {/* Location */}
      <label className="flex-1 flex flex-col gap-1.5 px-4 py-2.5 rounded-xl hover:bg-surface-variant/20 text-left transition cursor-pointer group">
        <span className="font-caption text-secondary tracking-wide">Location</span>
        <CustomSelect
          value={location}
          onChange={setLocation}
          options={locationOpts}
          placeholder="City or venue"
          icon="location_on"
          searchable
          clearable
        />
      </label>

      <div className="hidden md:block w-px h-10 bg-outline-variant/30 shrink-0" />
      <div className="md:hidden h-px bg-outline-variant/20" />

      {/* Date */}
      <label className="flex-1 flex flex-col gap-1.5 px-4 py-2.5 rounded-xl hover:bg-surface-variant/20 text-left transition cursor-pointer">
        <span className="font-caption text-secondary tracking-wide">Date</span>
        <DatePicker value={date} onChange={setDate} placeholder="dd/mm/yyyy" />
      </label>

      <div className="hidden md:block w-px h-10 bg-outline-variant/30 shrink-0" />
      <div className="md:hidden h-px bg-outline-variant/20" />

      {/* Time */}
      <label className="flex-1 flex flex-col gap-1.5 px-4 py-2.5 rounded-xl hover:bg-surface-variant/20 text-left transition cursor-pointer">
        <span className="font-caption text-secondary tracking-wide">Time</span>
        <CustomSelect
          value={time}
          onChange={setTime}
          options={TIME_OPTIONS}
          placeholder="Any time"
          icon="schedule"
          clearable
        />
      </label>

      <button
        type="submit"
        className="w-full md:w-auto shrink-0 px-7 py-3.5 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:opacity-90 active:opacity-100 inline-flex items-center justify-center gap-2 shadow-sm transition"
      >
        <span className="material-symbols-outlined text-[18px]">search</span> Find Courts
      </button>
    </form>
  );
}
