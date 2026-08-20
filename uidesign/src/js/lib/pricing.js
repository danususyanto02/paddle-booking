/** Pricing & formatting helpers (mock). English UI, IDR currency. */

export const PROCESSING_FEE = 15000 // IDR

export function formatIDR(n) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

// Short label like "Rp150.000" for compact chips
export function formatIDRShort(n) {
  return `Rp${new Intl.NumberFormat('id-ID').format(n)}`
}

export function calcTotal(pricePerHour, durationMinutes) {
  const courtFee = Math.round((pricePerHour * durationMinutes) / 60)
  const total = courtFee + PROCESSING_FEE
  return { courtFee, processingFee: PROCESSING_FEE, total }
}

export function formatDateLong(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatDateShort(isoDate) {
  if (!isoDate) return ''
  const d = new Date(isoDate + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
