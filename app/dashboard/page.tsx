import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { headers } from "next/headers";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import DashboardClient from "./dashboardClient";

export default async function DashboardPage() {
  const hdrs = await headers();
  let authed = !!(await getSessionUserId());
  if (!authed) {
    const auth = hdrs.get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const { verifyAccessToken } = await import("@/lib/auth/jwt");
      const v = verifyAccessToken(auth.slice(7).trim());
      if (v.ok) authed = true;
    }
  }
  if (!authed) redirect("/login?next=/dashboard");

  return (
    <>
      <Navbar active="dashboard" isAuthed />
      <main className="max-w-[1200px] mx-auto px-4 md:px-12 py-10">
        <DashboardClient />
      </main>
      <Footer />
    </>
  );
}
