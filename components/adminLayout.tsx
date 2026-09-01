"use client";

import Link from "next/link";
import { useState } from "react";
import { useLogout } from "@/hooks/useLogout";

export type AdminLayoutProps = {
  active?: "dashboard" | "courts" | "members" | "bookings" | "reports" | "users" | "";
  children: React.ReactNode;
  onSignOut?: () => void;
};

function Item({
  href,
  icon,
  label,
  active,
}: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold " +
        (active ? "bg-mint-glace/60 text-primary border-r-4 border-primary/80" : "text-on-surface-variant hover:bg-mint-glace/60")
      }
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span> {label}
    </Link>
  );
}

export default function AdminLayout({ active = "dashboard", children, onSignOut: onSignOutProp }: AdminLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const fallbackLogout = useLogout();
  const onSignOut = onSignOutProp ?? fallbackLogout;

  return (
    <>
      {/* Sidebar */}
      <aside
        id="adminSidebar"
        className={`${mobileOpen ? "flex" : "hidden"} md:flex fixed left-0 top-0 h-screen w-64 bg-surface-container-low border-r border-surface-variant flex-col z-40 ${mobileOpen ? "fixed inset-y-0 left-0" : ""}`}
      >
        <div className="p-6 border-b border-surface-variant/50">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" as unknown as string }}>
              sports_tennis
            </span>{" "}
            Kinetic Court
          </div>
          <p className="text-xs text-on-surface-variant">PadelCloud Admin Console</p>
        </div>
        <div className="p-4">
          <Link
            href="/booking"
            className="w-full inline-flex justify-center items-center gap-2 bg-primary text-on-primary py-3 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[18px]">add</span> New Booking
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-1">
          <Item href="/dashboard/admin" icon="dashboard" label="Dashboard" active={active === "dashboard"} />
          <Item href="/dashboard/users" icon="manage_accounts" label="Users" active={active === "users"} />
          <Item href="/dashboard/admin/courts" icon="sports_tennis" label="Courts" active={active === "courts"} />
          <Item href="/dashboard/admin/members" icon="group" label="Members" active={active === "members"} />
          <Item href="/dashboard/admin/bookings" icon="calendar_month" label="Bookings" active={active === "bookings"} />
          <Item href="/dashboard/admin/reports" icon="analytics" label="Reports" active={active === "reports"} />
        </nav>
        <div className="p-4 border-t border-surface-variant/50 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-mint-glace text-sm font-semibold">
            <span className="material-symbols-outlined">home</span> Back to Site
          </Link>
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-error hover:bg-error-container/50 text-sm font-semibold"
          >
            <span className="material-symbols-outlined">logout</span> Sign Out
          </button>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          aria-label="Close admin menu"
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {/* Main area */}
      <div className="md:pl-64">
        {/* Topbar */}
        <header className="h-16 fixed top-0 right-0 left-0 md:left-64 bg-surface/80 backdrop-blur-md border-b border-surface-variant/50 flex items-center justify-between px-4 md:px-6 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-surface-variant"
              aria-label="Open admin menu"
              aria-expanded={mobileOpen}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="hidden md:flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined">search</span>
              <input
                placeholder="Search courts, members, or bookings..."
                className="bg-surface-cream border border-surface-variant rounded-full pl-3 pr-4 py-2 text-sm w-80 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 grid place-items-center rounded-full hover:bg-surface-variant text-on-surface-variant"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <Link href="/dashboard/admin" className="w-8 h-8 rounded-full bg-primary text-on-primary grid place-items-center text-xs font-bold">
              AD
            </Link>
          </div>
        </header>

        <main className="pt-16">{children}</main>
      </div>
    </>
  );
}
