export function mockDelay(ms=400){
  if(new URLSearchParams(location.search).has('mockDelay')) return Promise.resolve()
  return new Promise(r=> setTimeout(r, ms))
}
