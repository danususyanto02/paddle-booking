import { Suspense } from "react";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { FeaturedSkeleton } from "@/components/ui/skeleton";
import HeroSearch from "@/components/heroSearch";
import FeaturedGrid from "@/components/featuredGrid";

export default function HomePage() {
  return (
    <>
      <Navbar />
      {/* Hero */}
      <section className="relative w-full min-h-[720px] flex flex-col items-center justify-center pt-16 pb-20 px-4 md:px-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* eslint-disable @next/next/no-img-element */}
          <img
            src="https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=1600&q=80"
            alt="Premium indoor padel court"
            className="w-full h-full object-cover"
            width={1600}
            height={900}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-surface-container/70 to-surface/40" />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-container/30 border border-primary/20 backdrop-blur">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">Courts available in your area</span>
          </div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-on-surface text-balance">
            Master the Court. <span className="text-primary">Book Your Game.</span>
          </h1>
          <p className="font-body-lg text-on-surface-variant max-w-2xl text-balance">
            Instantly reserve premium padel courts, join tournaments, and elevate your game with Kinetic&apos;s seamless booking
            platform.
          </p>

          <HeroSearch />
        </div>
      </section>

      {/* Featured */}
      <section className="py-16 bg-surface px-4 md:px-12">
        <div className="max-w-[1200px] mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="font-headline-lg text-on-surface">Featured Courts</h2>
              <p className="text-sm text-secondary max-w-md mt-1">Top-rated venues ready for your next match. Handpicked for quality and performance.</p>
            </div>
            <Link href="/courts" className="text-sm font-semibold text-primary inline-flex items-center gap-1 hover:underline">
              View All Courts <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          <Suspense fallback={<div aria-busy="true"><FeaturedSkeleton /></div>}>
            <FeaturedGrid />
          </Suspense>
        </div>
      </section>

      <Footer />
    </>
  );
}
