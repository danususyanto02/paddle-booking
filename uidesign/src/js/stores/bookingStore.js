import { load, save } from '../lib/storage.js'

const SEL_KEY = 'kc_selection'
const BOOK_KEY = 'kc_bookings'

export function getSelection(){
  return load(SEL_KEY, { courtId: null, date: null, duration: 90, slot: null })
}
export function setSelection(patch){
  const cur = getSelection()
  const next = { ...cur, ...patch }
  save(SEL_KEY, next)
  return next
}
export function clearSelection(){ save(SEL_KEY, { courtId:null, date:null, duration:90, slot:null }) }

export function getBookings(){
  return load(BOOK_KEY, seedBookings())
}
export function addBooking(b){
  const all = getBookings()
  all.unshift(b)
  save(BOOK_KEY, all)
  return all
}
export function cancelBooking(id){
  const all = getBookings().map(b => b.id===id ? {...b, status:'Cancelled'} : b)
  save(BOOK_KEY, all)
  return all
}

function seedBookings(){
  const today = new Date()
  const iso = (d) => d.toISOString().slice(0,10)
  const d1 = new Date(today); d1.setDate(today.getDate()+0)
  const d2 = new Date(today); d2.setDate(today.getDate()+3)
  return [
    { id:'BK-20241015-01', courtId:'alpha', date: iso(d1), start:'18:00', end:'19:30', duration:90, total: 285000, status:'Confirmed', createdAt: new Date().toISOString() },
    { id:'BK-20241008-02', courtId:'panoramic', date: iso(d2), start:'10:00', end:'11:00', duration:60, total: 155000, status:'Confirmed', createdAt: new Date().toISOString() },
    { id:'BK-20240929-03', courtId:'alpha', date:'2024-09-29', start:'18:00', end:'19:30', duration:90, total: 285000, status:'Completed', createdAt: '2024-09-29T10:00:00.000Z' },
  ]
}

export function newBookingId(){
  const d = new Date().toISOString().slice(0,10).replace(/-/g,'')
  const r = Math.floor(1000+Math.random()*9000)
  return `BK-${d}-${r}`
}
