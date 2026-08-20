export function openModal({ title, body, onConfirm, confirmText='Confirm', cancelText='Cancel' }){
  const wrap=document.createElement('div')
  wrap.className='fixed inset-0 z-50 grid place-items-center p-4'
  wrap.innerHTML=`
    <div data-backdrop class="absolute inset-0 bg-black/40"></div>
    <div role="dialog" aria-modal="true" aria-label="${title}" class="relative bg-surface-container-lowest rounded-xl border border-surface-variant p-6 w-full max-w-lg shadow-xl">
      <h3 class="text-lg font-semibold">${title}</h3>
      <div class="mt-3 text-sm text-on-surface-variant">${body}</div>
      <div class="mt-6 flex justify-end gap-3">
        <button data-cancel class="px-4 py-2 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-surface-variant">${cancelText}</button>
        <button data-confirm class="px-5 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90">${confirmText}</button>
      </div>
    </div>`
  document.body.appendChild(wrap)
  const close=()=> wrap.remove()
  wrap.querySelector('[data-backdrop]').addEventListener('click', close)
  wrap.querySelector('[data-cancel]').addEventListener('click', close)
  wrap.querySelector('[data-confirm]').addEventListener('click', ()=>{ close(); onConfirm?.() })
  const onKey=(e)=>{ if(e.key==='Escape'){ close(); document.removeEventListener('keydown', onKey)}}
  document.addEventListener('keydown', onKey)
}
