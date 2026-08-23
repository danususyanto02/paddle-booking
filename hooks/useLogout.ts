"use client";

import { useRouter } from "next/navigation";
import { clearAccessCache } from "./useAccess";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}

export function useLogout() {
  const router = useRouter();

  async function logout() {
    try {
      const csrf = getCookie("kc_csrf");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Origin: window.location.origin,
      };
      if (csrf) headers["x-csrf-token"] = csrf;
      // Cookie logout: empty JSON object is safe (fails refreshToken parse, falls through to cookie path)
      // Body is {} to avoid Content-Type issues with empty body; route handles it
      const res = await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({}),
      });
      if (!res.ok && res.status !== 401) {
        console.warn("[logout] server returned", res.status);
        const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
        if (j.error?.message) console.warn("[logout]", j.error.message);
      }
    } catch (e) {
      console.warn("[logout] failed", e);
    } finally {
      clearAccessCache();
      router.push("/login");
      router.refresh();
    }
  }

  return logout;
}
