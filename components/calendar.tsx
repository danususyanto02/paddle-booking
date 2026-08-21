"use client";

import { useMemo } from "react";

export function Calendar({
  year,
  month,
  selectedISO,
  onSelect,
  onMonthChange,
}: {
  year: number;
  month: number;
  selectedISO: string;
  onSelect: (iso: string) => void;
  onMonthChange: (year: number, month: number) => void;
}) {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const isoOf = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isPast = (d: number) => isoOf(d) < (todayISO ?? "");

  const prevMonth = () => {
    let y = year, m = month - 1;
    if (m < 0) { m = 11; y--; }
    onMonthChange(y, m);
  };
  const nextMonth = () => {
    let y = year, m = month + 1;
    if (m > 11) { m = 0; y++; }
    onMonthChange(y, m);
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant card-shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold">{monthLabel}</h3>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="w-9 h-9 grid place-items-center rounded-full border border-outline-variant hover:bg-surface-variant" aria-label="Previous month"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
          <button onClick={nextMonth} className="w-9 h-9 grid place-items-center rounded-full border border-outline-variant hover:bg-surface-variant" aria-label="Next month"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2 mb-2 text-xs text-center text-secondary">
        <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
      </div>
      <div className="grid grid-cols-7 gap-2" role="grid" aria-label="Calendar">
        {cells.map((v, i) => {
          if (v === null) return <div key={`e-${i}`} />;
          const iso = isoOf(v);
          const past = isPast(v);
          const selected = iso === selectedISO;
          const cls = selected ? "bg-inverse-surface text-surface-container-lowest rounded-full shadow" : past ? "text-surface-variant cursor-not-allowed" : "hover:bg-surface-container hover:rounded-full cursor-pointer";
          return (
            <button
              key={iso}
              disabled={past}
              role="gridcell"
              aria-selected={selected}
              aria-disabled={past ? "true" : undefined}
              onClick={() => !past && onSelect(iso)}
              onKeyDown={(e) => { if (!past && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onSelect(iso); } }}
              className={`h-10 w-full grid place-items-center text-sm ${cls}`}
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
