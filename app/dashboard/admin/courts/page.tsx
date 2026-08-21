import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { headers } from "next/headers";
import AdminLayout from "@/components/adminLayout";
import AdminCourtsClient from "./courtsClient";

export default async function AdminCourtsPage() {
  let authed = !!(await getSessionUserId());
  if (!authed) {
    const auth = (await headers()).get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const { verifyAccessToken } = await import("@/lib/auth/jwt");
      if (verifyAccessToken(auth.slice(7).trim()).ok) authed = true;
    }
  }
  if (!authed) redirect("/login");
  return (
    <AdminLayout active="courts">
      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-8">
        <h1 className="text-2xl font-bold">Manage Courts</h1>
        <p className="text-sm text-on-surface-variant mt-1">Create, edit, or archive courts. Record locking prevents concurrent edits.</p>
        <AdminCourtsClient />
      </div>
    </AdminLayout>
  );
}
