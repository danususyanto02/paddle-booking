/** Pricing helpers — port of uidesign/src/js/lib/pricing.js (mock, IDR) */

export const PROCESSING_FEE = 15000; // IDR

export function formatIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Short label like "Rp150.000" for compact chips */
export function formatIDRShort(n: number): string {
  return `Rp${new Intl.NumberFormat("id-ID").format(n)}`;
}

export function calcTotal(
  pricePerHour: number,
  durationMinutes: number,
): { courtFee: number; processingFee: number; total: number } {
  const courtFee = Math.round((pricePerHour * durationMinutes) / 60);
  const total = courtFee + PROCESSING_FEE;
  return { courtFee, processingFee: PROCESSING_FEE, total };
}

/** Use T12:00:00 trick to avoid UTC shift on ISO date strings */
export function formatDateLong(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
