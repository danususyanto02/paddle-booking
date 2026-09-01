"use client";

import { periodOf } from "@/lib/slots";

type Slot = { start: string; occupied: boolean; canFit: boolean };

export function TimeSlots({
  slots,
  selected,
  onSelect,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (start: string) => void;
}) {
  const groups: Record<string, Slot[]> = { Morning: [], Afternoon: [], Evening: [] };
  slots.forEach((s) => {
    const p = periodOf(s.start);
    (groups[p] ??= []).push(s);
  });
  const icon: Record<string, string> = { Morning: "light_mode", Afternoon: "partly_cloudy_day", Evening: "dark_mode" };

  const btnCls = (s: Slot, isSel: boolean) => {
    if (s.occupied || !s.canFit) return "py-2.5 rounded-lg bg-surface-variant text-secondary text-sm opacity-60 cursor-not-allowed line-through";
    return isSel ? "py-2.5 rounded-lg bg-primary-fixed text-on-primary-fixed font-semibold shadow border-2 border-primary-fixed text-sm" : "py-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant hover:border-primary-fixed text-sm";
  };

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([period, list]) => (
        <div key={period}>
          <h3 className="text-sm font-semibold text-secondary mb-3 inline-flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">{icon[period]}</span> {period}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {list.map((s) => {
              const isSel = s.start === selected;
              const disabled = s.occupied || !s.canFit;
              return (
                <button
                  key={s.start}
                  disabled={disabled}
                  aria-pressed={isSel}
                  aria-disabled={disabled ? "true" : undefined}
                  onClick={() => !disabled && onSelect(s.start)}
                  className={btnCls(s, isSel)}
                >
                  {s.start}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
