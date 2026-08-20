/** Time slot generation & occupancy (mock). */

// Canonical slot start times (30-min cadence, 08:00–21:30)
export const SLOT_STARTS = [
  '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
  '12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
  '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'
]

export function periodOf(time) {
  const h = Number(time.split(':')[0])
  if (h < 12) return 'Morning'
  if (h < 17) return 'Afternoon'
  return 'Evening'
}

export function toMinutes(t) { const [h,m]=t.split(':').map(Number); return h*60+m }
export function fromMinutes(min) {
  const h = Math.floor(min/60), m = min%60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
}
export function endTime(start, duration) { return fromMinutes(toMinutes(start)+duration) }

// Deterministic pseudo-random occupied slots per court+date (so refresh is stable)
function hash(str){ let h=2166136261; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)} return h>>>0 }
export function occupiedSlots(courtId, isoDate) {
  const h = hash(`${courtId}|${isoDate}`)
  // 2–5 occupied slots
  const count = 2 + (h % 4)
  const out = new Set()
  for (let i=0;i<count;i++){
    const idx = (h >> (i*5)) % SLOT_STARTS.length
    out.add(SLOT_STARTS[(idx + i*3) % SLOT_STARTS.length])
  }
  return out
}

export function isOccupied(courtId, isoDate, start) {
  return occupiedSlots(courtId, isoDate).has(start)
}

// All slots annotated for a given court/date
export function slotsFor(courtId, isoDate) {
  const occ = occupiedSlots(courtId, isoDate)
  return SLOT_STARTS.map(s => ({ start: s, period: periodOf(s), occupied: occ.has(s) }))
}

// Valid end respecting closing time (last slot 21:00 + 60min = 22:00)
export function canFit(start, duration) {
  return toMinutes(start) + duration <= 22*60
}
