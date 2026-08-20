import { resolveUserFromRequest, getAccessData } from "@/lib/auth/session";
import { error, success } from "@/lib/api/envelope";

// GET /api/v1/auth/me — Bearer preferred; also supports cookie (for dashboard fallback)
export async function GET(req: Request) {
  const resolved = await resolveUserFromRequest(req);
  if (!resolved) return error("UNAUTHENTICATED", "Unauthorized", { status: 401 });

  const data = await getAccessData(resolved.userId);
  if (!data) return error("UNAUTHENTICATED", "Unauthorized", { status: 401 });

  return success(data);
}
