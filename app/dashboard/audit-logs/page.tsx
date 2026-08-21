import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth/session";
import { headers } from "next/headers";
import AdminLayout from "@/components/adminLayout";
import { TableRowSkeleton } from "@/components/ui/skeleton";

export default async function AuditLogsPage() {
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
    <AdminLayout active="dashboard">
      <div className="max-w-[1200px] mx-auto px-4 md:px-12 py-8">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-on-surface-variant mt-1">Filter by method, action, resource, actor, date range.</p>
        <div className="mt-6"><TableRowSkeleton count={5} /></div>
      </div>
    </AdminLayout>
  );
}
