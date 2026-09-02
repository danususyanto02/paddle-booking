"use client";

import { useEffect, useState, useCallback } from "react";

type AccessData = {
  user: { id: string; username: string; displayName: string | null };
  roles: string[];
  effectivePermissions: string[];
  organizations: { id: string; name: string; code: string }[];
} | null;

let cache: AccessData | undefined;
let inflight: Promise<AccessData> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const cb of listeners) cb();
}

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

export function setAccessCache(data: AccessData) {
  cache = data;
  notify();
}

export function useAccess() {
  const [data, setData] = useState<AccessData | undefined>(cache);
  const [loading, setLoading] = useState(cache === undefined);

  useEffect(() => {
    const cb = () => {
      setData(cache);
      setLoading(cache === undefined);
    };
    listeners.add(cb);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (inflight) {
      const d = await inflight;
      cache = d;
      notify();
      setData(d);
      setLoading(false);
      return d;
    }
    setLoading(true);
    inflight = fetchAccess();
    const d = await inflight;
    inflight = null;
    cache = d;
    notify();
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
  notify();
}
