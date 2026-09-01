import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-outline-variant/30 bg-surface-container">
      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-10 grid md:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" as unknown as string }}>
              sports_tennis
            </span>{" "}
            Kinetic Court
          </div>
          <p className="text-xs text-on-surface-variant/70 mt-3 max-w-xs">
            Elevating the padel experience through seamless booking and premium court management.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Platform</h4>
          <ul className="mt-3 space-y-2 text-xs text-on-surface-variant">
            <li><Link href="/courts" className="hover:underline">Find a Court</Link></li>
            <li><Link href="/dashboard" className="hover:underline">Dashboard</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Company</h4>
          <ul className="mt-3 space-y-2 text-xs text-on-surface-variant">
            <li><a href="#" className="hover:underline">Contact Us</a></li>
            <li><a href="#" className="hover:underline">Careers</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold">Legal</h4>
          <ul className="mt-3 space-y-2 text-xs text-on-surface-variant">
            <li><a href="#" className="hover:underline">Privacy Policy</a></li>
            <li><a href="#" className="hover:underline">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-4 md:px-12 pb-8 text-xs text-on-surface-variant">
        © {year} Kinetic Court. Engineered for Performance.
      </div>
    </footer>
  );
}
