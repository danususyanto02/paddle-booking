export function renderAdminSidebar(active='dashboard'){
  const item = (href, icon, label, key) => `
    <a href="${href}" class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold ${active===key ? 'bg-mint-glace text-primary border-r-4 border-primary' : 'text-on-surface-variant hover:bg-mint-glace'}">
      <span class="material-symbols-outlined text-[20px]">${icon}</span> ${label}
    </a>`
  return `
  <aside id="adminSidebar" class="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-surface-variant flex-col z-40">
    <div class="p-6 border-b border-surface-variant/50">
      <div class="flex items-center gap-2 text-primary font-bold"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">sports_tennis</span> Kinetic Court</div>
      <p class="text-xs text-on-surface-variant">PadelCloud Admin Console</p>
    </div>
    <div class="p-4"><a href="/booking.html" class="w-full inline-flex justify-center items-center gap-2 bg-primary text-on-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90"><span class="material-symbols-outlined text-[18px]">add</span> New Booking</a></div>
    <nav class="flex-1 px-4 space-y-1">
      ${item('/admin/index.html','dashboard','Dashboard','dashboard')}
      ${item('/admin/courts.html','sports_tennis','Courts','courts')}
      ${item('/admin/members.html','group','Members','members')}
      ${item('/admin/bookings.html','calendar_month','Bookings','bookings')}
      ${item('/admin/reports.html','analytics','Reports','reports')}
    </nav>
    <div class="p-4 border-t border-surface-variant/50 space-y-1">
      <a href="/index.html" class="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-mint-glace text-sm font-semibold"><span class="material-symbols-outlined">home</span> Back to Site</a>
      <button data-admin-logout class="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-error hover:bg-error-container/50 text-sm font-semibold"><span class="material-symbols-outlined">logout</span> Sign Out</button>
    </div>
  </aside>
  <div id="adminOverlay" class="hidden fixed inset-0 bg-black/30 z-30 md:hidden"></div>
  `
}
export function renderAdminTopbar(){
  return `
  <header class="h-16 fixed top-0 right-0 left-0 md:left-64 bg-surface/80 backdrop-blur-md border-b border-surface-variant/50 flex items-center justify-between px-4 md:px-6 z-30">
    <div class="flex items-center gap-3">
      <button id="btnAdminMenu" class="md:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-surface-variant" aria-label="Open admin menu" aria-expanded="false"><span class="material-symbols-outlined">menu</span></button>
      <div class="hidden md:flex items-center gap-2 text-on-surface-variant"><span class="material-symbols-outlined">search</span><input id="adminSearch" placeholder="Search courts, members, or bookings..." class="bg-surface-cream border border-surface-variant rounded-full pl-3 pr-4 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-primary/20" /></div>
    </div>
    <div class="flex items-center gap-2">
      <button class="w-10 h-10 grid place-items-center rounded-full hover:bg-surface-variant text-on-surface-variant" aria-label="Notifications"><span class="material-symbols-outlined">notifications</span></button>
      <a href="/admin/index.html" class="w-8 h-8 rounded-full bg-primary text-on-primary grid place-items-center text-xs font-bold">AD</a>
    </div>
  </header>`
}
export function bindAdminLayout(){
  const btn=document.getElementById('btnAdminMenu')
  const sidebar=document.getElementById('adminSidebar')
  const overlay=document.getElementById('adminOverlay')
  function open(){ sidebar.classList.remove('hidden'); sidebar.classList.add('flex','fixed','inset-y-0','left-0'); overlay.classList.remove('hidden'); btn?.setAttribute('aria-expanded','true') }
  function close(){ if(window.innerWidth<768){ sidebar.classList.add('hidden'); sidebar.classList.remove('flex'); overlay.classList.add('hidden'); btn?.setAttribute('aria-expanded','false') } }
  btn?.addEventListener('click', ()=> sidebar.classList.contains('hidden') ? open() : close())
  overlay?.addEventListener('click', close)
  document.querySelectorAll('[data-admin-logout]').forEach(b=> b.addEventListener('click', ()=>{ localStorage.removeItem('kc_auth'); location.href='/login.html' }))
}
