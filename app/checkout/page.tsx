import { Suspense } from "react";
import { redirect } from "next/navigation";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth/session";
import { headers } from "next/headers";
import CheckoutClient from "./checkoutClient";

export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const courtId = (sp.courtId as string) ?? "";
  const date = (sp.date as string) ?? "";
  const slot = (sp.slot as string) ?? "";
  const duration = Number((sp.duration as string) ?? 0) as 60 | 90 | 120;

  if (!courtId || !date || !slot) redirect("/courts");

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
  if (!authed) redirect(`/login?next=${encodeURIComponent(`/checkout?courtId=${courtId}&date=${date}&slot=${slot}&duration=${duration}`)}`);

  const court = await prisma.court.findFirst({ where: { OR: [{ id: courtId }, { code: courtId }], deletedAt: null } });
  if (!court) redirect("/courts");

  return (
    <>
      <Navbar />
      <main className="max-w-[1000px] mx-auto px-4 md:px-12 py-8">
        <h1 className="text-2xl font-bold">Checkout</h1>
        <p className="text-sm text-on-surface-variant mt-1">Review your booking and choose a payment method (mock).</p>
        <Suspense fallback={null}>
          <CheckoutClient court={court} date={date} slot={slot} duration={duration} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
