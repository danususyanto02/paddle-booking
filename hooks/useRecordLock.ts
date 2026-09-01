"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type State = "UNLOCKED" | "LOCKED_BY_SELF" | "LOCKED_BY_OTHER" | "EXPIRED";

export function useRecordLock(resourceType: string, resourceId: string) {
  const [state, setState] = useState<State>("UNLOCKED");
  const [token, setToken] = useState<string | null>(null);
  const [owner, setOwner] = useState<{ id: string; username: string } | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [lockId, setLockId] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const checkStatus = useCallback(async () => {
    const res = await fetch(`/api/v1/locks/status?resourceType=${resourceType}&resourceId=${resourceId}`, { credentials: "include" });
    const j = await res.json().catch(() => ({})) as { data?: { locked?: boolean; owner?: { id: string; username: string }; expiresAt?: string } };
    if (!j.data?.locked) { setState("UNLOCKED"); setOwner(null); setExpiresAt(null); return; }
    if (j.data.owner) setOwner(j.data.owner);
    if (j.data.expiresAt) setExpiresAt(new Date(j.data.expiresAt));
    // If we own the lock (token set), treat as LOCKED_BY_SELF; otherwise OTHER
    setState(tokenRef.current ? "LOCKED_BY_SELF" : "LOCKED_BY_OTHER");
  }, [resourceType, resourceId]);

  const acquire = useCallback(async () => {
    const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
    const csrf = csrfRes.ok ? (await csrfRes.json() as { data?: { csrfToken?: string } }).data?.csrfToken : null;
    const headers: Record<string, string> = { "Content-Type": "application/json", Origin: window.location.origin };
    if (csrf) headers["x-csrf-token"] = csrf;
    const res = await fetch("/api/v1/locks/acquire", { method: "POST", credentials: "include", headers, body: JSON.stringify({ resourceType, resourceId }) });
    if (res.status === 423) { await checkStatus(); setState("LOCKED_BY_OTHER"); return; }
    const j = await res.json().catch(() => ({})) as { data?: { id?: string; expiresAt?: string; lockToken?: string } };
    if (j.data?.id) {
      setLockId(j.data.id);
      if (j.data.expiresAt) setExpiresAt(new Date(j.data.expiresAt));
      if ((j.data as { lockToken?: string }).lockToken) { setToken((j.data as { lockToken?: string }).lockToken ?? null); }
      setState("LOCKED_BY_SELF");
    }
  }, [resourceType, resourceId, checkStatus]);

  const release = useCallback(async () => {
    if (!lockId) return;
    const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
    const csrf = csrfRes.ok ? (await csrfRes.json() as { data?: { csrfToken?: string } }).data?.csrfToken : null;
    const headers: Record<string, string> = { Origin: window.location.origin };
    if (csrf) headers["x-csrf-token"] = csrf;
    if (token) headers["x-record-lock-token"] = token;
    await fetch(`/api/v1/locks/${lockId}`, { method: "DELETE", credentials: "include", headers }).catch(() => {});
    setState("UNLOCKED"); setToken(null); setLockId(null); setExpiresAt(null);
  }, [lockId, token]);

  // Heartbeat 30s when LOCKED_BY_SELF
  useEffect(() => {
    if (state !== "LOCKED_BY_SELF" || !lockId || !token) return;
    const id = setInterval(async () => {
      const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const csrf = csrfRes.ok ? (await csrfRes.json() as { data?: { csrfToken?: string } }).data?.csrfToken : null;
      const headers: Record<string, string> = { Origin: window.location.origin };
      if (csrf) headers["x-csrf-token"] = csrf;
      headers["x-record-lock-token"] = token;
      const res = await fetch(`/api/v1/locks/${lockId}/heartbeat`, { method: "POST", credentials: "include", headers });
      if (!res.ok) setState("EXPIRED");
      else {
        const j = await res.json().catch(() => ({})) as { data?: { expiresAt?: string } };
        if (j.data?.expiresAt) setExpiresAt(new Date(j.data.expiresAt));
      }
    }, 30000);
    return () => clearInterval(id);
  }, [state, lockId, token]);

  // Poll when LOCKED_BY_OTHER
  useEffect(() => {
    if (state !== "LOCKED_BY_OTHER") return;
    const id = setInterval(checkStatus, 30000);
    return () => clearInterval(id);
  }, [state, checkStatus]);

  // pagehide beacon
  useEffect(() => {
    const onHide = () => {
      if (!lockId || !token) return;
      const url = `/api/v1/locks/${lockId}`;
      navigator.sendBeacon?.(url, JSON.stringify({ _method: "DELETE" }));
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [lockId, token]);

  return { state, token, owner, expiresAt, lockId, acquire, release, checkStatus };
}
