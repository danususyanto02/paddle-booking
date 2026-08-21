"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
      if (!res.ok) { setErr(j.error?.message ?? "Invalid credentials"); return; }
      router.push(next || "/dashboard");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Login failed");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={onSubmit} className="mt-8 bg-surface-container-lowest border border-surface-variant rounded-xl p-6 space-y-4 card-shadow">
      <label className="block"><span className="text-sm font-medium">Username</span><input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="superadmin" className="mt-1 w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></label>
      <label className="block"><span className="text-sm font-medium">Password</span><input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="••••••••" className="mt-1 w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></label>
      {err && <p className="text-sm text-error">{err}</p>}
      <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40">{loading ? "Signing in..." : "Sign In"}</button>
      <p className="text-xs text-center text-secondary">Don&apos;t have an account? <Link href="/register" className="font-semibold text-primary hover:underline">Create one</Link></p>
    </form>
  );
}
