// IDR — Jan..Jul
export const monthlyRevenue = [
  { month:'Jan', revenue: 18500000 },
  { month:'Feb', revenue: 22000000 },
  { month:'Mar', revenue: 16200000 },
  { month:'Apr', revenue: 24800000 },
  { month:'May', revenue: 30500000 },
  { month:'Jun', revenue: 28400000 },
  { month:'Jul', revenue: 36200000 },
]

export const incomeBreakdown = [
  { label:'Court Rentals', value: 60, color:'#a7d7c5' },
  { label:'Memberships',   value: 25, color:'#e3cffe' },
  { label:'Equipment',     value: 15, color:'#b0d3df' },
]

export function totalRevenue(){ return monthlyRevenue.reduce((s,m)=>s+m.revenue,0) }
export function growthPct(){
  const a = monthlyRevenue.at(-1).revenue, b = monthlyRevenue.at(-2).revenue
  return ((a-b)/b*100).toFixed(1)
}
