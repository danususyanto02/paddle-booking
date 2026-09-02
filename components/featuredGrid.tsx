import Link from "next/link";
import CourtImage from "./courtImage";
import { prisma } from "@/lib/prisma";

export default async function FeaturedGrid() {
  // Top-rated 3 courts (or by sortOrder if equal rating)
  const featured = await prisma.court.findMany({
    where: { deletedAt: null, status: { not: "MAINTENANCE" } },
    orderBy: [{ rating: "desc" }, { reviews: "desc" }, { sortOrder: "asc" }],
    take: 3,
  });

  // Fallback to any 3 if filtered set <3 (e.g. seed missing)
  const fill = featured.length < 3
    ? await prisma.court.findMany({
        where: { deletedAt: null },
        orderBy: [{ sortOrder: "asc" }],
        take: 3 - featured.length,
      })
    : [];

  const courts = [...featured, ...fill].slice(0, 3);

  if (courts.length === 0) {
    return <p className="text-sm text-on-surface-variant">No courts yet.</p>;
  }

  const [hero, ...rest] = courts as [typeof courts[number], ...typeof courts];
  if (!hero) return <p className="text-sm text-on-surface-variant">No courts yet.</p>;

  return (
    <div className="grid md:grid-cols-12 gap-6">
      {/* Hero card: 8 cols */}
      <Link
        href={`/courts/${hero.code}`}
        className="md:col-span-8 group rounded-2xl overflow-hidden relative min-h-[380px] border border-outline-variant/30 shadow-sm bg-surface-container"
      >
        <div className="absolute inset-0 overflow-hidden"><CourtImage src={hero.image} alt={hero.name} width={800} height={500} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition duration-700" /></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="relative h-full flex flex-col justify-between p-6 md:p-8 min-h-[380px]">
          <div className="flex justify-between">
            <span className="bg-surface/90 backdrop-blur text-on-surface text-xs font-semibold px-3 py-1 rounded-full inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">wb_sunny</span> {hero.type}
            </span>
            <span className="w-9 h-9 rounded-full bg-white/20 backdrop-blur grid place-items-center text-white">
              <span className="material-symbols-outlined text-[18px]">favorite</span>
            </span>
          </div>
          <div>
            <div className="text-primary-fixed text-sm font-semibold inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" as unknown as string }}>
                star
              </span>{" "}
              {hero.rating} <span className="text-white/70 font-normal">({hero.reviews} reviews)</span>
            </div>
            <h3 className="text-white text-xl font-semibold mt-1">{hero.name} — Central</h3>
            <p className="text-white/70 text-sm mt-1">{hero.location}</p>
          </div>
        </div>
      </Link>

      <div className="md:col-span-4 flex flex-col gap-6">
        {rest.map((c) => (
          <Link
            key={c.id}
            href={`/courts/${c.code}`}
            className="group relative rounded-2xl overflow-hidden min-h-[180px] border border-outline-variant/30 shadow-sm flex-1 bg-surface-container"
          >
            <div className="absolute inset-0 overflow-hidden"><CourtImage src={c.image} alt={c.name} width={600} height={400} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition duration-700" /></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <span className="absolute top-3 left-3 bg-surface/90 backdrop-blur text-on-surface text-xs px-2 py-1 rounded-full">{c.type}</span>
            <div className="absolute bottom-0 p-4">
              <h3 className="text-white text-sm font-semibold">{c.name}</h3>
              <p className="text-white/70 text-xs inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">star</span> {c.rating} ({c.reviews})
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
