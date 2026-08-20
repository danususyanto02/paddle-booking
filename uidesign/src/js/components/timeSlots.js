import { slotsFor } from '../lib/slots.js'

export function renderTimeSlots(courtId, isoDate, selected){
  const slots = slotsFor(courtId, isoDate)
  const groups = { Morning:[], Afternoon:[], Evening:[] }
  slots.forEach(s=> groups[s.period].push(s))
  const icon = { Morning:'light_mode', Afternoon:'partly_cloudy_day', Evening:'dark_mode' }

  const btn = (s)=>{
    if(s.occupied) return `<button disabled aria-disabled="true" class="py-2.5 rounded-lg bg-surface-variant text-secondary text-sm opacity-60 cursor-not-allowed line-through">${s.start}</button>`
    const isSel = s.start===selected
    return `<button data-slot="${s.start}" aria-pressed="${isSel?'true':'false'}" class="py-2.5 rounded-lg border text-sm ${isSel ? 'bg-primary-fixed text-on-primary-fixed font-semibold shadow' : 'bg-surface-container-lowest border-outline-variant hover:border-primary-fixed'}">${s.start}</button>`
  }

  return `
  <div class="space-y-6">
    ${Object.entries(groups).map(([period, list])=>`
      <div>
        <h3 class="text-sm font-semibold text-secondary mb-3 inline-flex items-center gap-2"><span class="material-symbols-outlined text-[18px]">${icon[period]}</span> ${period}</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          ${list.map(btn).join('')}
        </div>
      </div>
    `).join('')}
  </div>`
}
