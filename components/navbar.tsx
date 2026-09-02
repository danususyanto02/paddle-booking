"use client";

import Link from "next/link";
import { useState } from "react";
import { useLogout } from "@/hooks/useLogout";
import { useAccess } from "@/hooks/useAccess";

export type NavbarProps = {
  active?: "courts" | "dashboard" | "admin" | "";
  isAuthed?: boolean;
  userName?: string | null;
  onSignOut?: () => void;
};

function NavLink({
  href,
  children,
  active,
}: { href: string; children: React.ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        "text-sm font-medium transition " +
        (active
          ? "text-primary font-semibold border-b-2 border-primary pb-1"
          : "text-on-surface-variant hover:text-primary")
      }
    >
      {children}
    </Link>
  );
}

export default function Navbar({ active = "", isAuthed: isAuthedProp, userName: userNameProp, onSignOut: onSignOutProp }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const fallbackLogout = useLogout();
  const onSignOut = onSignOutProp ?? fallbackLogout;
  const { data: access, loading: accessLoading } = useAccess();
  const showAdmin = !accessLoading && !!access && (access.roles.includes("SUPER_ADMIN") || access.roles.includes("ADMIN"));

  // Derive auth from server prop if given, otherwise from client access fetch.
  // isAuthedProp === undefined means public page — rely on useAccess.
  const derivedAuthed = !accessLoading && !!access;
  const isAuthed = isAuthedProp !== undefined ? isAuthedProp : derivedAuthed;
  const userName = userNameProp ?? access?.user?.displayName ?? access?.user?.username ?? null;
  const authUnknown = isAuthedProp === undefined && accessLoading;

  return (
    <nav className="sticky top-0 z-40 glass border-b border-outline-variant/30">
      <div className="max-w-[1200px] mx-auto px-4 md:px-12 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" as unknown as string }}>
            sports_tennis
          </span>
          <span className="text-[22px] font-semibold tracking-tight text-primary">Kinetic Court</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <NavLink href="/courts" active={active === "courts"}>Find a Court</NavLink>
          <NavLink href="/dashboard" active={active === "dashboard"}>Dashboard</NavLink>
          {showAdmin && <NavLink href="/dashboard/admin" active={active === "admin"}>Admin</NavLink>}
        </div>

        <div className="flex items-center gap-3">
          {authUnknown ? (
            <span className="hidden sm:inline w-20 h-9 rounded-full bg-surface-container animate-pulse" aria-hidden="true" />
          ) : isAuthed ? (
            <>
              {userName ? (
                <Link href="/dashboard" className="hidden sm:inline text-sm font-medium text-on-surface-variant hover:text-primary">
                  {userName}
                </Link>
              ) : null}
              <button
                onClick={onSignOut}
                className="text-sm font-semibold px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline text-sm font-semibold text-primary hover:opacity-80">
                Sign In
              </Link>
              <Link
                href="/courts"
                className="text-sm font-semibold bg-primary-fixed text-on-primary-fixed px-5 py-2.5 rounded-full shadow-sm hover:opacity-90"
              >
                Book Now
              </Link>
            </>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-10 h-10 grid place-items-center rounded-full hover:bg-surface-variant"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="mobileNav"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
      </div>

      <div id="mobileNav" className={`${open ? "" : "hidden"} md:hidden border-t border-outline-variant/30 bg-surface-container-lowest`}>
        <div className="px-4 py-4 flex flex-col gap-3">
          <Link href="/courts" className="py-2">Find a Court</Link>
          <Link href="/dashboard" className="py-2">Dashboard</Link>
          {showAdmin && <Link href="/dashboard/admin" className="py-2">Admin</Link>}
        </div>
      </div>
    </nav>
  );
}
