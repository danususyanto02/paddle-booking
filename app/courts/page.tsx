import { Suspense } from "react";
import NavbarServer from "@/components/navbarServer";
import Footer from "@/components/footer";
import CourtsClient from "./courtsClient";
import CourtsDateFilter from "./courtsDateFilter";
import { CourtCardSkeleton } from "@/components/ui/skeleton";

export default async function CourtsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q : "";
  const location = typeof sp.location === "string" ? sp.location : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const initQ = q || location || "";
  const initDate = typeof sp.date === "string" ? sp.date : "";

  return (
    <>
      <NavbarServer active="courts" />
      <main className="max-w-[1200px] mx-auto px-4 md:px-12 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-primary">Find a Court</h1>
            <p className="text-sm text-secondary mt-1">Discover and book premium padel courts near you.</p>
          </div>
          <CourtsDateFilter initialDate={initDate} />
        </div>

        <Suspense fallback={<CourtCardSkeleton count={4} />}>
          <CourtsClient initialQ={initQ} initialType={type} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
