"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CourtCardSkeleton } from "@/components/ui/skeleton";
import { formatIDRShort } from "@/lib/pricing";

type Court = {
  id: string;
  code: string;
  name: string;
  location: string;
  type: string;
  surface: string;
  pricePerHour: number;
  rating: number;
  reviews: number;
  amenities: string[];
  image: string;
  status: string;
  badge: string | null;
};

type ApiResp = {
  data: Court[];
  meta?: { page: number; limit: number; total: number; totalPages: number };
};

const PER_PAGE = 4;

function CourtCard({ court }: { court: Court }) {
  const badge = court.badge ? <span className="absolute top-3 left-3 bg-primary-container text-on-primary-container text-xs font-semibold px-3 py-1 rounded-full">{court.badge}</span> : null;
  const typeIcon = court.type === "INDOOR" ? "roofing" : court.type === "ROOFTOP" ? "deck" : "wb_sunny";
  const statusDot =
    court.status === "AVAILABLE" ? "bg-primary" : court.status === "OCCUPIED" ? "bg-outline" : "bg-error";
  const statusText =
    court.status === "AVAILABLE" ? "Available" : court.status === "OCCUPIED" ? "Occupied" : "Maintenance";
  const action =
    court.status === "MAINTENANCE" ? (
      <button disabled className="w-full py-2.5 rounded-lg border border-surface-variant text-outline text-sm font-semibold cursor-not-allowed">Unavailable</button>
    ) : (
      <Link href={`/booking?courtId=${court.code}`} className={`w-full inline-flex justify-center items-center gap-2 ${court.status === "AVAILABLE" ? "bg-primary text-on-primary hover:opacity-90" : "border-2 border-primary text-primary hover:bg-primary/5"} py-2.5 rounded-lg text-sm font-semibold`}>
        {court.status === "AVAILABLE" ? "Book Now" : "View Schedule"} <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </Link>
    );

  return (
    <article className="bg-surface-container-lowest rounded-xl overflow-hidden border border-surface-variant card-shadow hover:shadow-md hover:-translate-y-0.5 transition flex flex-col">
      <div className="relative h-48 overflow-hidden bg-surface-container">
        {/* eslint-disable @next/next/no-img-element */}
        <img src={court.image} alt={`${court.name} — ${court.type} ${court.surface}`} className="w-full h-full object-cover img-fade is-loaded" loading="lazy" width={600} height={400} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
        {badge}
        <span className="absolute top-3 right-3 bg-inverse-surface/80 backdrop-blur text-surface text-xs px-3 py-1 rounded-full inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">{typeIcon}</span> {court.type}
        </span>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between gap-4">
          <h3 className="font-semibold text-on-surface leading-tight">{court.name}</h3>
          <div className="text-right">
            <div className="font-semibold text-primary leading-none">{formatIDRShort(court.pricePerHour)}</div>
            <div className="text-xs text-secondary">/hour</div>
          </div>
        </div>
        <p className="text-sm text-secondary mt-1 inline-flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {court.location}</p>
        <p className="text-xs text-on-surface-variant mt-1 inline-flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${statusDot}`} /> {statusText} · {court.surface}</p>
        <div className="mt-3 flex gap-2 text-secondary text-xs flex-wrap">
          {court.amenities.map((a) => <span key={a} className="px-2 py-1 rounded-full bg-surface-container border border-outline-variant/30">{a}</span>)}
        </div>
        <div className="mt-4">{action}</div>
      </div>
    </article>
  );
}

export default function CourtsClient({ initialQ, initialType }: { initialQ: string; initialType: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filters — also sync to URL
  const [q, setQ] = useState(initialQ);
  const [priceMax, setPriceMax] = useState(250000);
  const [types, setTypes] = useState<Set<string>>(() => (initialType ? new Set([initialType.toUpperCase()]) : new Set()));
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<"recommended" | "price-asc" | "price-desc" | "rating">("recommended");
  const [page, setPage] = useState(1);

  // API data
  const [data, setData] = useState<Court[]>([]);
  const [meta, setMeta] = useState<{ page: number; limit: number; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    // Map sort to API sortBy/sortOrder
    let sortBy: string | undefined;
    let sortOrder: string | undefined;
    if (sort === "price-asc") { sortBy = "pricePerHour"; sortOrder = "asc"; }
    else if (sort === "price-desc") { sortBy = "pricePerHour"; sortOrder = "desc"; }
    else if (sort === "rating") { sortBy = "rating"; sortOrder = "desc"; }
    else { sortBy = "createdAt"; sortOrder = "desc"; }
    if (sortBy) qs.set("sortBy", sortBy);
    if (sortOrder) qs.set("sortOrder", sortOrder);
    qs.set("page", String(page));
    qs.set("limit", String(PER_PAGE));
    try {
      const res = await fetch(`/api/v1/courts?${qs.toString()}`, { cache: "no-store" });
      const json = (await res.json()) as ApiResp;
      setData(json.data ?? []);
      setMeta(json.meta ?? null);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [q, sort, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side post-filter: price/type/amenities (server does q/sort/page/limit)
  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (c.pricePerHour > priceMax) return false;
      if (types.size && !types.has(c.type)) return false;
      if (amenities.size) for (const a of amenities) if (!c.amenities.includes(a)) return false;
      return true;
    });
  }, [data, priceMax, types, amenities]);

  const displayed = sort === "recommended" ? filtered : filtered; // already sorted by server
  const totalPages = meta ? Math.max(1, Math.ceil(filtered.length ? meta.totalPages : 1)) : 1;

  const reset = () => {
    setQ(""); setPriceMax(250000); setTypes(new Set()); setAmenities(new Set()); setSort("recommended"); setPage(1);
    router.push("/courts");
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filters */}
      <aside className="w-full lg:w-[300px] shrink-0">
        <div className="bg-surface-container-lowest rounded-xl p-6 border border-surface-variant card-shadow sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">Filters</h2>
            <button onClick={reset} className="text-xs font-semibold text-primary hover:underline">Reset</button>
          </div>

          <div className="mb-4">
            <label className="text-sm font-semibold mb-2 block">Search</label>
            <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Name or location" className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-[18px]">payments</span> Price Range (per hour)</h3>
            <input type="range" min={80000} max={250000} step={10000} value={priceMax} onChange={(e) => { setPriceMax(Number(e.target.value)); setPage(1); }} className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-secondary mt-1"><span>Rp80.000</span><span>Up to {formatIDRShort(priceMax)}</span></div>
          </div>
          <div className="h-px bg-outline-variant/30 my-6" />
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-[18px]">layers</span> Surface Type</h3>
            <div className="space-y-2">
              {["INDOOR", "OUTDOOR", "COVERED", "ROOFTOP"].map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={types.has(t)} onChange={(e) => { const nt = new Set(types); if (e.target.checked) nt.add(t); else nt.delete(t); setTypes(nt); setPage(1); }} className="rounded" /> {t}
                </label>
              ))}
            </div>
          </div>
          <div className="h-px bg-outline-variant/30 my-6" />
          <div>
            <h3 className="text-sm font-semibold mb-3 inline-flex items-center gap-2"><span className="material-symbols-outlined text-secondary text-[18px]">star</span> Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {["Cafe", "Showers", "Parking", "Pro Shop"].map((a) => (
                <button key={a} onClick={() => { const na = new Set(amenities); if (na.has(a)) na.delete(a); else na.add(a); setAmenities(na); setPage(1); }} className={`px-3 py-1.5 rounded-full border text-xs font-medium ${amenities.has(a) ? "bg-primary-container border-primary text-on-primary-container" : "border-outline-variant hover:border-primary"}`}>{a}</button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Grid */}
      <div className="flex-1">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-secondary">Showing <span className="font-semibold text-on-surface">{filtered.length}</span> courts</p>
          <label className="flex items-center gap-2 text-xs text-secondary">Sort by
            <select value={sort} onChange={(e) => { setSort(e.target.value as never); setPage(1); }} className="bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 text-sm font-medium">
              <option value="recommended">Recommended</option><option value="price-asc">Price: Low to High</option><option value="price-desc">Price: High to Low</option><option value="rating">Rating</option>
            </select>
          </label>
        </div>

        {loading ? <CourtCardSkeleton count={PER_PAGE} /> : displayed.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-on-surface-variant">No courts match your filters.</p>
            <button onClick={reset} className="mt-3 text-sm font-semibold text-primary hover:underline">Clear filters</button>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">{displayed.map((c) => <CourtCard key={c.id} court={c} />)}</div>
            {meta && meta.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-9 h-9 rounded-lg border text-sm font-semibold border-outline-variant hover:bg-surface-container disabled:opacity-40">‹</button>
                {Array.from({ length: meta.totalPages }).map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} className={`w-9 h-9 rounded-lg border text-sm font-semibold ${page === i + 1 ? "bg-primary text-on-primary border-primary" : "border-outline-variant hover:bg-surface-container"}`}>{i + 1}</button>
                ))}
                <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="w-9 h-9 rounded-lg border text-sm font-semibold border-outline-variant hover:bg-surface-container disabled:opacity-40">›</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
