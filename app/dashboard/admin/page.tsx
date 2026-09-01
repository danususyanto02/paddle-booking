import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { resolveUserIdFromHeaders } from "@/lib/adminGuard";
import { headers } from "next/headers";
import AdminLayout from "@/components/adminLayout";
import AdminOverview from "./overview";

export default async function AdminDashboardPage() {
  let authed = !!(await getSessionUserId());
  if (!authed) {
    const auth = (await headers()).get("authorization");
    if (auth?.toLowerCase().startsWith("bearer ")) {
      const { verifyAccessToken } = await import("@/lib/auth/jwt");
      if (verifyAccessToken(auth.slice(7).trim()).ok) authed = true;
    }
  }
  if (!authed) redirect("/login");
  const userIdForAdmin = await resolveUserIdFromHeaders();
  if (userIdForAdmin) {
    const { isAdminUser } = await import("@/lib/adminGuard");
    if (!(await isAdminUser(userIdForAdmin))) redirect("/dashboard");
  }

  return (
    <AdminLayout active="dashboard">
      <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-on-surface-variant mt-1">Overview of Kinetic Court performance today.</p>
        <AdminOverview />
      </div>
    </AdminLayout>
  );
}
