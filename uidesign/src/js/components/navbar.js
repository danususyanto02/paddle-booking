import { getAuth, logout } from '../stores/authStore.js'

export function renderNavbar(active='') {
  const auth = getAuth()
  const link = (href,label,key) => `
    <a href="${href}" class="text-sm font-medium transition ${active===key ? 'text-primary font-semibold border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary'}">${label}</a>`
  return `
  <nav class="sticky top-0 z-40 glass border-b border-outline-variant/30">
    <div class="max-w-[1200px] mx-auto px-4 md:px-12 h-20 flex items-center justify-between">
      <a href="/index.html" class="flex items-center gap-2">
        <span class="material-symbols-outlined text-primary" style="font-variation-settings:'FILL' 1">sports_tennis</span>
        <span class="text-[22px] font-semibold tracking-tight text-primary">Kinetic Court</span>
      </a>
      <div class="hidden md:flex items-center gap-8">
        ${link('/courts.html','Find a Court','courts')}
        ${link('/dashboard.html','Dashboard','dashboard')}
        ${link('/admin/index.html','Admin','admin')}
      </div>
      <div class="flex items-center gap-3">
        ${auth ? `
          <a href="/dashboard.html" class="hidden sm:inline text-sm font-medium text-on-surface-variant hover:text-primary">${auth.name}</a>
          <button data-logout class="text-sm font-semibold px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container">Sign Out</button>
        ` : `
          <a href="/login.html" class="hidden sm:inline text-sm font-semibold text-primary hover:opacity-80">Sign In</a>
          <a href="/courts.html" class="text-sm font-semibold bg-primary-fixed text-on-primary-fixed px-5 py-2.5 rounded-full shadow-sm hover:opacity-90">Book Now</a>
        `}
        <button id="btnMobileNav" class="md:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-surface-variant" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav">
          <span class="material-symbols-outlined">menu</span>
        </button>
      </div>
    </div>
    <div id="mobileNav" class="hidden md:hidden border-t border-outline-variant/30 bg-surface-container-lowest">
      <div class="px-4 py-4 flex flex-col gap-3">
        <a href="/courts.html" class="py-2">Find a Court</a>
        <a href="/dashboard.html" class="py-2">Dashboard</a>
        <a href="/admin/index.html" class="py-2">Admin</a>
      </div>
    </div>
  </nav>`
}

export function bindNavbar(){
  const btn = document.getElementById('btnMobileNav')
  const nav = document.getElementById('mobileNav')
  if(btn && nav){
    btn.addEventListener('click', ()=>{
      const open = nav.classList.toggle('hidden') === false
      btn.setAttribute('aria-expanded', String(open))
    })
  }
  document.querySelectorAll('[data-logout]').forEach(b=> b.addEventListener('click', ()=>{ logout(); location.href='/index.html' }))
}
