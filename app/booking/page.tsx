import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, resolveUserFromRequest } from "@/lib/auth/session";
import { headers } from "next/headers";
import BookingClient from "./bookingClient";
import NavbarServer from "@/components/navbarServer";
import Footer from "@/components/footer";
import { CourtDetailSkeleton } from "@/components/ui/skeleton";

export default async function BookingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const courtId = (sp.courtId as string) ?? "";

  // Guard: must be logged in (cookie check; Bearer also via headers)
  const hdrs = await headers();
  const cookieUserId = await getSessionUserId();
  let authed = !!cookieUserId;
  if (!authed) {
    const auth = hdrs.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const { verifyAccessToken } = await import("@/lib/auth/jwt");
      const v = verifyAccessToken(auth.slice(7).trim());
      if (v.ok) authed = true;
    }
  }
  if (!authed) {
    const qs = new URLSearchParams();
    if (courtId) qs.set("next", `/booking?courtId=${courtId}`);
    redirect(`/login?${qs.toString()}`);
  }

  // Resolve court for initial display
  let court: Awaited<ReturnType<typeof prisma.court.findFirst>> = null;
  if (courtId) {
    court = await prisma.court.findFirst({ where: { OR: [{ id: courtId }, { code: courtId }], deletedAt: null } });
  }
  if (!court) {
    court = await prisma.court.findFirst({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } });
  }

  if (!court) {
    return (
      <>
        <NavbarServer active="courts" />
        <div className="text-center py-16"><p className="text-on-surface-variant">No courts available.</p></div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <NavbarServer active="courts" />
      <main className="max-w-[1200px] mx-auto px-4 md:px-12 py-8">
        <Suspense fallback={<CourtDetailSkeleton />}>
          <BookingClient court={court} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
