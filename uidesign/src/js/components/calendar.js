export function renderCalendar({ year, month, selectedISO, onSelect }){
  // month 0-11
  const first = new Date(year, month, 1)
  const startDay = first.getDay() // 0 Sun
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const todayISO = new Date().toISOString().slice(0,10)

  const cells=[]
  for(let i=0;i<startDay;i++) cells.push(null)
  for(let d=1; d<=daysInMonth; d++) cells.push(d)

  const monthLabel = new Date(year,month,1).toLocaleDateString('en-US',{month:'long', year:'numeric'})

  const isPast = (d)=>{
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    return iso < todayISO
  }
  const isoOf = (d)=> `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`

  return `
  <div class="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant card-shadow">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-sm font-semibold">${monthLabel}</h3>
      <div class="flex gap-2">
        <button data-cal-prev class="w-9 h-9 grid place-items-center rounded-full border border-outline-variant hover:bg-surface-variant" aria-label="Previous month"><span class="material-symbols-outlined text-[18px]">chevron_left</span></button>
        <button data-cal-next class="w-9 h-9 grid place-items-center rounded-full border border-outline-variant hover:bg-surface-variant" aria-label="Next month"><span class="material-symbols-outlined text-[18px]">chevron_right</span></button>
      </div>
    </div>
    <div class="grid grid-cols-7 gap-2 mb-2 text-xs text-center text-secondary">
      <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
    </div>
    <div class="grid grid-cols-7 gap-2" role="grid" aria-label="Calendar">
      ${cells.map(v=>{
        if(v===null) return `<div></div>`
        const iso=isoOf(v)
        const past=isPast(v)
        const selected = iso===selectedISO
        const cls = selected
          ? 'bg-inverse-surface text-surface-container-lowest rounded-full shadow'
          : past ? 'text-surface-variant cursor-not-allowed' : 'hover:bg-surface-container hover:rounded-full cursor-pointer'
        const attrs = past ? 'aria-disabled="true"' : `role="gridcell" tabindex="0" data-date="${iso}" aria-selected="${selected?'true':'false'}"`
        return `<button ${attrs} class="h-10 w-full grid place-items-center text-sm ${cls} ${past?'':''}">${v}</button>`
      }).join('')}
    </div>
  </div>`
}

export function bindCalendar(root, state, rerender){
  root.querySelectorAll('[data-cal-prev]').forEach(b=> b.addEventListener('click', ()=>{ state.month--; if(state.month<0){state.month=11; state.year--} rerender() }))
  root.querySelectorAll('[data-cal-next]').forEach(b=> b.addEventListener('click', ()=>{ state.month++; if(state.month>11){state.month=0; state.year++} rerender() }))
  root.querySelectorAll('[data-date]').forEach(b=>{
    const handler=()=>{
      const iso=b.getAttribute('data-date')
      if(!iso) return
      state.selectedISO = iso
      if(state.onSelect) state.onSelect(iso)
      rerender()
    }
    b.addEventListener('click', handler)
    b.addEventListener('keydown', (e)=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); handler() }})
  })
}
