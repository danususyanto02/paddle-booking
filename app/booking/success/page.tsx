import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import { headers } from "next/headers";
import { formatIDRShort } from "@/lib/pricing";

export default async function BookingSuccessPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const code = (sp.code as string) ?? "";

  if (!code) {
    return (
      <>
        <Navbar />
        <div className="max-w-[720px] mx-auto px-4 md:px-12 py-12 text-center"><p className="text-sm text-secondary">No booking found.</p><Link href="/courts" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Browse courts</Link></div>
        <Footer />
      </>
    );
  }

  // Verify auth (owner check optionally, but success page is reachable with code; we show booking if exists)
  // Require auth to view ticket; if not authed, redirect to login with next
  const hdrs = await headers();
  let authed = !!(await getSessionUserId());
  if (!authed) {
    const auth = hdrs.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const { verifyAccessToken } = await import("@/lib/auth/jwt");
      const v = verifyAccessToken(auth.slice(7).trim());
      if (v.ok) authed = true;
    }
  }
  if (!authed) {
    return (
      <>
        <Navbar />
        <div className="max-w-[720px] mx-auto px-4 md:px-12 py-12 text-center">
          <p className="text-sm text-secondary">Please sign in to view your booking.</p>
          <Link href={`/login?next=${encodeURIComponent(`/booking/success?code=${code}`)}`} className="mt-4 inline-block px-6 py-3 rounded-full bg-primary text-on-primary text-sm font-semibold">Sign In</Link>
        </div>
        <Footer />
      </>
    );
  }

  const booking = await prisma.booking.findFirst({ where: { code }, include: { court: true } });
  if (!booking) {
    return (
      <>
        <Navbar />
        <div className="max-w-[720px] mx-auto px-4 md:px-12 py-12 text-center"><p className="text-sm text-secondary">No booking found.</p><Link href="/courts" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Browse courts</Link></div>
        <Footer />
      </>
    );
  }

  const court = booking.court;
  const dateLong = new Date(booking.date.toISOString().slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <>
      <Navbar />
      <main className="max-w-[720px] mx-auto px-4 md:px-12 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-mint-glace text-primary grid place-items-center mx-auto"><span className="material-symbols-outlined text-[32px]">check_circle</span></div>
        <h1 className="text-3xl font-bold mt-4">Booking Confirmed!</h1>
        <p className="text-sm text-on-surface-variant mt-2">Your payment was processed (mock). Show this e-ticket at the venue.</p>

        <div id="ticket" className="mt-8 text-left bg-surface-container-lowest border border-surface-variant rounded-xl p-6 card-shadow">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-semibold tracking-widest text-secondary">E-TICKET</div>
              <div className="font-mono text-lg font-bold mt-1">{booking.code}</div>
              <div className="text-xs text-secondary mt-1">Status: <span className="font-semibold text-primary">{booking.status}</span> · {booking.paymentMethod ?? "Mock"}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{court.name}</div>
              <div className="text-xs text-secondary">{court.location}</div>
            </div>
          </div>
          <div className="h-px bg-outline-variant/30 my-4" />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><div className="text-xs text-secondary">Date</div><div className="font-medium">{dateLong}</div></div>
            <div><div className="text-xs text-secondary">Time</div><div className="font-medium">{booking.start} – {booking.end} · {booking.duration} min</div></div>
            <div><div className="text-xs text-secondary">Court</div><div className="font-medium">{court.type} · {court.surface}</div></div>
            <div><div className="text-xs text-secondary">Total Paid</div><div className="font-semibold text-primary">{formatIDRShort(booking.total)}</div></div>
          </div>
          <div className="mt-4 p-3 rounded-lg bg-mint-glace text-xs text-on-primary-fixed-variant">Free cancellation up to 24 hours before your slot. Present this code at check-in.</div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className="px-6 py-3 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90">Go to Dashboard</Link>
          <Link href="/courts" className="px-6 py-3 rounded-full border border-outline-variant text-sm font-semibold hover:bg-surface-variant">Book Another Court</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
