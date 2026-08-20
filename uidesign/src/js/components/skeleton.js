export function courtCardSkeleton(count=4){
  return Array.from({length: count}).map(()=> `
    <article class="bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-variant flex flex-col" aria-hidden="true">
      <div class="h-48 skeleton"></div>
      <div class="p-5 space-y-3">
        <div class="flex justify-between gap-4">
          <div class="skeleton-line w-32 h-4"></div>
          <div class="skeleton-line w-20 h-4"></div>
        </div>
        <div class="skeleton-line w-40 h-3"></div>
        <div class="skeleton-line w-32 h-3"></div>
        <div class="flex gap-2"><span class="skeleton-line w-12 h-5 rounded-full"></span><span class="skeleton-line w-14 h-5 rounded-full"></span><span class="skeleton-line w-10 h-5 rounded-full"></span></div>
        <div class="skeleton h-10 rounded-lg"></div>
      </div>
    </article>
  `).join('')
}

export function featuredSkeleton(){
  return `
    <div class="md:col-span-8 rounded-2xl overflow-hidden border border-outline-variant/30 min-h-[380px] skeleton" aria-hidden="true"></div>
    <div class="md:col-span-4 flex flex-col gap-6">
      <div class="rounded-2xl min-h-[180px] flex-1 border border-outline-variant/30 skeleton" aria-hidden="true"></div>
      <div class="rounded-2xl min-h-[180px] flex-1 border border-outline-variant/30 skeleton" aria-hidden="true"></div>
    </div>
  `
}

export function courtDetailSkeleton(){
  return `
    <div class="grid lg:grid-cols-2 gap-8" aria-hidden="true">
      <div class="w-full h-[420px] rounded-xl skeleton border border-surface-variant"></div>
      <div class="space-y-4">
        <div class="skeleton-line w-28 h-5 rounded-full"></div>
        <div class="skeleton-line w-48 h-7"></div>
        <div class="skeleton-line w-40 h-4"></div>
        <div class="skeleton-line w-32 h-4"></div>
        <div class="flex gap-2"><span class="skeleton-line w-14 h-6 rounded-full"></span><span class="skeleton-line w-16 h-6 rounded-full"></span><span class="skeleton-line w-12 h-6 rounded-full"></span></div>
        <div class="h-20 rounded-xl skeleton border border-surface-variant"></div>
        <div class="space-y-2"><div class="skeleton-line w-full h-3"></div><div class="skeleton-line w-5/6 h-3"></div></div>
      </div>
    </div>
  `
}

export function slotSkeleton(){
  const row = (n)=> Array.from({length:n}).map(()=> `<div class="h-10 rounded-lg skeleton"></div>`).join('')
  return `
    <div class="space-y-6" aria-hidden="true">
      <div><div class="skeleton-line w-20 h-4 mb-3"></div><div class="grid grid-cols-2 md:grid-cols-4 gap-3">${row(6)}</div></div>
      <div><div class="skeleton-line w-24 h-4 mb-3"></div><div class="grid grid-cols-2 md:grid-cols-4 gap-3">${row(6)}</div></div>
      <div><div class="skeleton-line w-20 h-4 mb-3"></div><div class="grid grid-cols-2 md:grid-cols-4 gap-3">${row(6)}</div></div>
    </div>
  `
}

export function upcomingSkeleton(count=2){
  return Array.from({length: count}).map(()=> `
    <div class="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden flex flex-col sm:flex-row" aria-hidden="true">
      <div class="sm:w-40 h-40 skeleton shrink-0"></div>
      <div class="p-5 flex-1 space-y-3">
        <div class="skeleton-line w-32 h-3"></div>
        <div class="skeleton-line w-28 h-4"></div>
        <div class="skeleton-line w-40 h-3"></div>
        <div class="flex justify-between items-center pt-2"><span class="skeleton-line w-20 h-6 rounded-lg"></span><span class="skeleton-line w-12 h-4"></span></div>
      </div>
    </div>
  `).join('')
}

export function historySkeleton(count=3){
  return Array.from({length: count}).map(()=> `
    <div class="grid md:grid-cols-12 gap-2 p-4 border-b border-outline-variant/20 items-center" aria-hidden="true">
      <div class="md:col-span-3 skeleton-line h-4 w-24"></div>
      <div class="md:col-span-4 flex items-center gap-2"><span class="skeleton-avatar w-8 h-8 shrink-0"></span><span class="skeleton-line w-28 h-4"></span></div>
      <div class="md:col-span-2 skeleton-line h-3 w-20"></div>
      <div class="md:col-span-2 skeleton-line h-4 w-16 ml-auto"></div>
      <div class="md:col-span-1 skeleton-line h-5 w-14 mx-auto rounded-full"></div>
    </div>
  `).join('')
}

export function adminStatSkeleton(count=4){
  return Array.from({length: count}).map(()=> `
    <div class="bg-surface-container-lowest rounded-xl border border-surface-variant p-6 space-y-3" aria-hidden="true">
      <div class="w-10 h-10 rounded-lg skeleton"></div>
      <div class="skeleton-line w-20 h-3"></div>
      <div class="skeleton-line w-28 h-7"></div>
    </div>
  `).join('')
}

export function tableRowSkeleton(count=3){
  return Array.from({length: count}).map(()=> `
    <div class="flex items-center p-4 border-b border-surface-variant/20 gap-3" aria-hidden="true">
      <span class="skeleton-avatar w-9 h-9 shrink-0"></span>
      <div class="flex-1 space-y-2"><div class="skeleton-line w-32 h-4"></div><div class="skeleton-line w-24 h-3"></div></div>
      <span class="skeleton-line w-14 h-5 rounded-full"></span>
    </div>
  `).join('')
}

export function memberRowSkeleton(count=4){
  return Array.from({length: count}).map(()=> `
    <div class="grid md:grid-cols-12 gap-2 p-4 border-b border-outline-variant/20 items-center" aria-hidden="true">
      <div class="md:col-span-4 flex items-center gap-3"><span class="skeleton-avatar w-9 h-9 shrink-0"></span><span class="skeleton-line w-28 h-4"></span></div>
      <div class="md:col-span-3 skeleton-line h-4 w-28"></div>
      <div class="md:col-span-2 skeleton-line h-5 w-14 rounded-full"></div>
      <div class="md:col-span-3 skeleton-line h-3 w-20 ml-auto"></div>
    </div>
  `).join('')
}
