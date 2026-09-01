"use client";

import { useRouter } from "next/navigation";

export default function HeroSearch() {
  const router = useRouter();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qs = new URLSearchParams({
      location: (fd.get("location") as string) ?? "",
      date: (fd.get("date") as string) ?? "",
      time: (fd.get("time") as string) ?? "",
    });
    // Remove empty params
    for (const [k, v] of [...qs.entries()]) if (!v) qs.delete(k);
    const suffix = qs.toString();
    router.push(`/courts${suffix ? `?${suffix}` : ""}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-5xl mt-6 bg-surface-container-lowest/90 backdrop-blur-xl border border-outline-variant/40 rounded-2xl shadow-xl p-2 md:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center"
    >
      <label className="flex-1 flex flex-col gap-1 px-4 py-2 rounded-xl hover:bg-surface-variant/20 text-left">
        <span className="font-caption text-secondary">Location</span>
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline">location_on</span>
          <input name="location" placeholder="City or venue" className="w-full bg-transparent outline-none text-sm placeholder:text-outline-variant" />
        </span>
      </label>
      <div className="hidden md:block w-px h-10 bg-outline-variant/30" />
      <label className="flex-1 flex flex-col gap-1 px-4 py-2 rounded-xl hover:bg-surface-variant/20 text-left">
        <span className="font-caption text-secondary">Date</span>
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline">calendar_today</span>
          <input name="date" type="date" className="w-full bg-transparent outline-none text-sm" />
        </span>
      </label>
      <div className="hidden md:block w-px h-10 bg-outline-variant/30" />
      <label className="flex-1 flex flex-col gap-1 px-4 py-2 rounded-xl hover:bg-surface-variant/20 text-left">
        <span className="font-caption text-secondary">Time</span>
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-outline">schedule</span>
          <select name="time" defaultValue="" className="w-full bg-transparent outline-none text-sm">
            <option value="">Any time</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>
        </span>
      </label>
      <button type="submit" className="w-full md:w-auto px-8 py-4 bg-primary text-on-primary text-sm font-semibold rounded-xl hover:opacity-90 inline-flex items-center justify-center gap-2">
        <span className="material-symbols-outlined">search</span> Find Courts
      </button>
    </form>
  );
}
