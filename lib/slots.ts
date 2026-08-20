/** Time slot helpers — port of uidesign/src/js/lib/slots.js
 *  Pure functions, reusable server & client.
 *  Occupancy via DB will be layered in T20 (slotsFor DB-backed); for now pure SLOT_STARTS helpers.
 */

export const SLOT_STARTS: readonly string[] = [
  "08:00","08:30","09:00","09:30","10:00","10:30","11:00","11:30",
  "12:00","12:30","13:00","13:30","14:00","14:30","15:00","15:30",
  "16:00","16:30","17:00","17:30","18:00","18:30","19:00","19:30","20:00","20:30","21:00",
] as const;

export type Period = "Morning" | "Afternoon" | "Evening";

export function periodOf(time: string): Period {
  const h = Number(time.split(":")[0]);
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
}

export function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function endTime(start: string, duration: number): string {
  return fromMinutes(toMinutes(start) + duration);
}

/** Valid end respecting closing time (last slot 21:00 + 60min = 22:00) */
export function canFit(start: string, duration: number): boolean {
  return toMinutes(start) + duration <= 22 * 60;
}

export type Slot = { start: string; period: Period; occupied: boolean };

/**
 * Pure slot list — DB-backed occupancy will be injected in T20.
 * For now returns all unoccupied (so T07 is testable standalone).
 * T20 will call this then mark occupied from Booking overlap.
 */
export function slotsFor(_courtId: string, _isoDate: string): Slot[] {
  return SLOT_STARTS.map((s) => ({ start: s, period: periodOf(s), occupied: false }));
}
