export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center space-y-6">
        <p className="font-caption text-primary tracking-widest uppercase">
          Serene Athleticism — Kinetic Court
        </p>
        <h1 className="font-display-lg-mobile md:font-display-lg text-on-background">
          Paddle Booking
        </h1>
        <p className="font-body-md text-on-surface-variant">
          Foundation is ready. Token Serene Athleticism ter-load.
        </p>
        <div className="flex flex-wrap gap-3 justify-center pt-2">
          <span className="card-shadow rounded-xl bg-surface-container-lowest px-4 py-2 font-label-bold text-primary">
            primary #3a6758
          </span>
          <span className="card-shadow rounded-xl bg-surface-container-low px-4 py-2 font-label-bold text-on-surface-variant">
            surface
          </span>
          <span className="glass rounded-xl border border-outline-variant px-4 py-2 font-label-bold">
            glass
          </span>
        </div>
        <div className="pt-6 grid gap-3 text-left">
          <div className="skeleton h-16 rounded-xl" aria-hidden />
          <div className="skeleton-line w-3/4" aria-hidden />
          <div className="skeleton-line w-1/2" aria-hidden />
        </div>
        <p className="font-caption text-outline pt-4">
          Skeleton shimmer 1.4s · card-shadow · glass · img-fade · reduced-motion
        </p>
      </div>
    </main>
  );
}
