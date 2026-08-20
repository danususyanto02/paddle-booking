function handleError(img){
  const w = img.getAttribute('width') || ''
  const h = img.getAttribute('height') || ''
  const cls = img.className || ''
  const fallback = document.createElement('div')
  fallback.className = cls.replace('img-fade','') + ' img-error-fallback'
  fallback.setAttribute('role','img')
  fallback.setAttribute('aria-label','Image failed to load')
  // preserve dimensions if given
  if(w) fallback.style.width = w + 'px'
  if(h) fallback.style.height = h + 'px'
  if(!w && !h) fallback.style.minHeight = '100%'
  fallback.innerHTML = '<span class="material-symbols-outlined text-[24px]">image</span>'
  img.replaceWith(fallback)
}

export function initLazyImages(root=document){
  const scope = root instanceof Element ? root : document
  const imgs = scope.querySelectorAll ? scope.querySelectorAll('img[data-src]') : document.querySelectorAll('img[data-src]')
  if(!imgs.length) return

  // Images already in viewport or IO unsupported -> load immediately
  if(!('IntersectionObserver' in window)){
    imgs.forEach(img=>{
      img.src = img.dataset.src
      img.removeAttribute('data-src')
      if(img.complete) img.classList.add('is-loaded')
      else {
        img.addEventListener('load', ()=> img.classList.add('is-loaded'), {once:true})
        img.addEventListener('error', ()=> handleError(img), {once:true})
      }
    })
    return
  }

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(!entry.isIntersecting) return
      const img = entry.target
      io.unobserve(img)
      const src = img.dataset.src
      if(!src) return
      img.src = src
      img.removeAttribute('data-src')
      if(img.complete) img.classList.add('is-loaded')
      else {
        img.addEventListener('load', ()=> img.classList.add('is-loaded'), {once:true})
        img.addEventListener('error', ()=> handleError(img), {once:true})
      }
    })
  }, { rootMargin: '200px 0px', threshold: 0.01 })

  imgs.forEach(img=> io.observe(img))
}
