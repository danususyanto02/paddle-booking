import { formatIDRShort } from '../lib/pricing.js'

export function courtCard(court){
  const badge = court.badge ? `<span class="absolute top-3 left-3 bg-primary-container text-on-primary-container text-xs font-semibold px-3 py-1 rounded-full">${court.badge}</span>` : ''
  const typeIcon = court.type==='Indoor' ? 'roofing' : court.type==='Rooftop' ? 'deck' : 'wb_sunny'
  const statusDot = court.status==='available' ? 'bg-primary' : court.status==='occupied' ? 'bg-outline' : 'bg-error'
  const statusText = court.status==='available' ? 'Available' : court.status==='occupied' ? `Occupied${court.until?` · Until ${court.until}`:''}` : 'Maintenance'
  const action = court.status==='maintenance'
    ? `<button disabled class="w-full py-2.5 rounded-lg border border-surface-variant text-outline text-sm font-semibold cursor-not-allowed">Unavailable</button>`
    : `<a href="/booking.html?courtId=${court.id}" class="w-full inline-flex justify-center items-center gap-2 ${court.status==='available' ? 'bg-primary text-on-primary hover:opacity-90' : 'border-2 border-primary text-primary hover:bg-primary/5'} py-2.5 rounded-lg text-sm font-semibold">${court.status==='available' ? 'Book Now' : 'View Schedule'} <span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>`

  return `
  <article class="bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-variant card-shadow hover:shadow-md hover:-translate-y-0.5 transition flex flex-col">
    <div class="relative h-48 overflow-hidden bg-surface-container">
      <img data-src="${court.image}" alt="${court.name} — ${court.type} ${court.surface}" loading="lazy" decoding="async" width="600" height="400" class="w-full h-full object-cover img-fade" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none"></div>
      ${badge}
      <span class="absolute top-3 right-3 bg-inverse-surface/80 backdrop-blur text-surface text-xs px-3 py-1 rounded-full inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">${typeIcon}</span> ${court.type}</span>
    </div>
    <div class="p-5 flex flex-col flex-1">
      <div class="flex justify-between gap-4">
        <h3 class="font-semibold text-on-surface leading-tight">${court.name}</h3>
        <div class="text-right"><div class="font-semibold text-primary leading-none">${formatIDRShort(court.pricePerHour)}</div><div class="text-xs text-secondary">/hour</div></div>
      </div>
      <p class="text-sm text-secondary mt-1 inline-flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">location_on</span> ${court.location}</p>
      <p class="text-xs text-on-surface-variant mt-1 inline-flex items-center gap-1"><span class="w-2 h-2 rounded-full ${statusDot}"></span> ${statusText} · ${court.surface}</p>
      <div class="mt-3 flex gap-2 text-secondary text-xs">${court.amenities.map(a=>`<span class="px-2 py-1 rounded-full bg-surface-container border border-outline-variant/30">${a}</span>`).join('')}</div>
      <div class="mt-4">${action}</div>
    </div>
  </article>`
}
