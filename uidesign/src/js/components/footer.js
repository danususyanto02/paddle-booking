export function renderFooter(){
  return `
  <footer class="mt-16 border-t border-outline-variant/30 bg-surface-container">
    <div class="max-w-[1200px] mx-auto px-4 md:px-12 py-10 grid md:grid-cols-4 gap-8">
      <div>
        <div class="flex items-center gap-2 text-primary font-semibold"><span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">sports_tennis</span> Kinetic Court</div>
        <p class="text-xs text-on-surface-variant/70 mt-3 max-w-xs">Elevating the padel experience through seamless booking and premium court management.</p>
      </div>
      <div><h4 class="text-sm font-semibold">Platform</h4><ul class="mt-3 space-y-2 text-xs text-on-surface-variant"><li><a href="/courts.html" class="hover:underline">Find a Court</a></li><li><a href="/dashboard.html" class="hover:underline">Dashboard</a></li></ul></div>
      <div><h4 class="text-sm font-semibold">Company</h4><ul class="mt-3 space-y-2 text-xs text-on-surface-variant"><li><a href="#" class="hover:underline">Contact Us</a></li><li><a href="#" class="hover:underline">Careers</a></li></ul></div>
      <div><h4 class="text-sm font-semibold">Legal</h4><ul class="mt-3 space-y-2 text-xs text-on-surface-variant"><li><a href="#" class="hover:underline">Privacy Policy</a></li><li><a href="#" class="hover:underline">Terms of Service</a></li></ul></div>
    </div>
    <div class="max-w-[1200px] mx-auto px-4 md:px-12 pb-8 text-xs text-on-surface-variant">© ${new Date().getFullYear()} Kinetic Court. Engineered for Performance.</div>
  </footer>`
}
