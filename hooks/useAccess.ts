"use client";

import { useEffect, useState, useCallback } from "react";

type AccessData = {
  user: { id: string; username: string; displayName: string | null };
  roles: string[];
  effectivePermissions: string[];
  organizations: { id: string; name: string; code: string }[];
} | null;

let cache: AccessData | undefined; // undefined = not fetched yet
let inflight: Promise<AccessData> | null = null;

async function fetchAccess(): Promise<AccessData> {
  try {
    const res = await fetch("/api/v1/me/access", { credentials: "include" });
    if (!res.ok) return null;
    const json = (await res.json()) as { data: AccessData };
    return json.data ?? null;
  } catch {
    return null;
  }
}

export function useAccess() {
  const [data, setData] = useState<AccessData | undefined>(cache);
  const [loading, setLoading] = useState(cache === undefined);

  const refresh = useCallback(async () => {
    if (inflight) {
      const d = await inflight;
      cache = d;
      setData(d);
      setLoading(false);
      return d;
    }
    setLoading(true);
    inflight = fetchAccess();
    const d = await inflight;
    inflight = null;
    cache = d;
    setData(d);
    setLoading(false);
    return d;
  }, []);

  useEffect(() => {
    if (cache !== undefined) {
      setData(cache);
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const has = useCallback(
    (code: string | undefined): boolean => {
      if (!code) return true;
      if (!data) return false;
      return data.effectivePermissions.includes(code);
    },
    [data],
  );

  const isSuperAdmin = data?.roles.includes("SUPER_ADMIN") ?? false;

  return { data, loading, has, isSuperAdmin, refresh };
}

export function clearAccessCache() {
  cache = undefined;
}
