import { Suspense } from "react";
import NavbarServer from "@/components/navbarServer";
import Footer from "@/components/footer";
import LoginInner from "./inner";

export default function LoginPage() {
  return (
    <>
      <NavbarServer />
      <main className="max-w-[480px] mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-on-surface-variant mt-1">Sign in to manage your bookings.</p>
        <Suspense fallback={null}><LoginInner /></Suspense>
      </main>
      <Footer />
    </>
  );
}
