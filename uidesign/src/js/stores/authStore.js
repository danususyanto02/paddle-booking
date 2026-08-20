import { load, save, remove } from '../lib/storage.js'
const KEY='kc_auth'

export function getAuth(){ return load(KEY, null) }
export function isLoggedIn(){ return !!getAuth() }
export function isAdmin(){ return getAuth()?.role==='admin' }
export function login({ name, email, role='user' }){
  const auth = { name, email, role, at: new Date().toISOString() }
  save(KEY, auth); return auth
}
export function logout(){ remove(KEY) }
export function requireAuth(){
  if(!isLoggedIn()){ location.href='/login.html'; return false }
  return true
}
export function requireAdmin(){
  const a=getAuth()
  if(!a || a.role!=='admin'){ location.href='/login.html?next='+encodeURIComponent(location.pathname); return false }
  return true
}
