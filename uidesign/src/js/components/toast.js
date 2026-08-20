export function toast(msg, type='info'){
  let c=document.getElementById('toastContainer')
  if(!c){ c=document.createElement('div'); c.id='toastContainer'; c.className='fixed bottom-4 right-4 z-50 flex flex-col gap-2'; document.body.appendChild(c) }
  const bg = type==='success' ? 'bg-primary text-on-primary' : type==='error' ? 'bg-error text-on-error' : 'bg-inverse-surface text-inverse-on-surface'
  const el=document.createElement('div')
  el.className=`${bg} px-4 py-3 rounded-lg shadow-lg text-sm max-w-sm`
  el.textContent=msg
  c.appendChild(el)
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(()=> el.remove(),300)}, 2600)
}
