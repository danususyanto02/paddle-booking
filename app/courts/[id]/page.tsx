import { notFound } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { prisma } from "@/lib/prisma";
import { formatIDRShort } from "@/lib/pricing";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const court = await prisma.court.findFirst({ where: { OR: [{ id }, { code: id }], deletedAt: null } });
  if (!court) return { title: "Court Not Found — Kinetic Court" };
  return { title: `${court.name} — Kinetic Court` };
}

export default async function CourtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const feature = await prisma.menuFeature.findFirst({ where: { route: "/dashboard/courts", deletedAt: null } });
  if (feature?.status === "INACTIVE") notFound();

  const court = await prisma.court.findFirst({ where: { OR: [{ id }, { code: id }], deletedAt: null } });
  if (!court) notFound();

  return (
    <>
      <Navbar active="courts" />
      <main className="max-w-[1200px] mx-auto px-4 md:px-12 py-8">
        <Link href="/courts" className="inline-flex items-center gap-1 text-sm font-medium text-on-surface-variant hover:text-primary">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Courts
        </Link>

        <div className="mt-6 grid lg:grid-cols-2 gap-8">
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src={court.image}
            alt={court.name}
            className="w-full h-[420px] object-cover rounded-xl border border-surface-variant"
            width={800}
            height={420}
          />
          <div>
            <span className="inline-flex items-center gap-1 bg-mint-glace text-on-primary-fixed-variant text-xs font-semibold px-3 py-1 rounded-full">
              {court.type} · {court.surface}
            </span>
            <h1 className="text-3xl font-bold mt-3">{court.name}</h1>
            <p className="text-sm text-secondary mt-1 inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {court.location}</p>
            <div className="mt-2 text-sm inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-amber-600"><span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" as unknown as string }}>star</span> {court.rating}</span>
              <span className="text-secondary">({court.reviews} reviews)</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {court.amenities.map((a) => <span key={a} className="px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-xs">{a}</span>)}
            </div>
            <div className="mt-6 p-4 rounded-xl bg-surface-container-lowest border border-surface-variant flex items-center justify-between">
              <div><div className="text-xs text-secondary">Price per hour</div><div className="text-xl font-bold text-primary">{formatIDRShort(court.pricePerHour)}</div></div>
              {court.status === "MAINTENANCE" ? (
                <span className="px-6 py-3 rounded-full border border-surface-variant text-outline text-sm font-semibold">Unavailable</span>
              ) : (
                <Link href={`/booking?courtId=${court.code}`} className="px-6 py-3 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 inline-flex items-center gap-2">
                  Book This Court <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </Link>
              )}
            </div>
            <div className="mt-6 text-sm text-on-surface-variant leading-relaxed">
              Premium padel experience with professional-grade turf, panoramic glass, and tournament lighting. Ideal for casual play and competitive matches. Free cancellation up to 24 hours before your slot.
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
