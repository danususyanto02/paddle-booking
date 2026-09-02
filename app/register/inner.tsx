"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/toaster";

type ApiErr = { error?: { code?: string; message?: string; details?: { fieldErrors?: Record<string, string[]>; formErrors?: string[] } | unknown } };

export default function RegisterInner() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setFieldErr({});
    if (username.trim().length < 3) { setFieldErr({ username: "Username must be 3-32 chars (letters, digits, _, ., -)" }); return; }
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setFieldErr({ password: "Password must be 8-128 chars and contain at least 1 letter and 1 number" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: username.trim(), password }) });
      const j = (await res.json().catch(() => ({}))) as ApiErr & { data?: unknown };
      if (!res.ok) {
        if (res.status === 403) { setErr(j.error?.message ?? "Registration is disabled. Ask an admin to enable PUBLIC_REGISTRATION_ENABLED."); return; }
        if (res.status === 409) { setErr(j.error?.message ?? "Username already taken"); return; }
        if (res.status === 422 && j.error?.details) {
          const d = j.error.details as { fieldErrors?: Record<string, string[]>; formErrors?: string[] };
          const fe: typeof fieldErr = {};
          if (d.fieldErrors?.username?.[0]) fe.username = d.fieldErrors.username[0];
          if (d.fieldErrors?.password?.[0]) fe.password = d.fieldErrors.password[0];
          if (Object.keys(fe).length) { setFieldErr(fe); return; }
          if (d.formErrors?.[0]) { setErr(d.formErrors[0]); return; }
          const raw = JSON.stringify(d);
          setErr(j.error?.message ? `${j.error.message}: ${raw.slice(0, 200)}` : raw.slice(0, 300));
          return;
        }
        setErr(j.error?.message ?? `Registration failed (${res.status})`);
        return;
      }
      toast("Account created — you can now sign in", "success");
      router.push("/login?registered=1");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <main className="max-w-[480px] mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold">Create account</h1>
      <p className="text-sm text-on-surface-variant mt-1">Username 3–32 chars, password 8+ with letter &amp; number.</p>
      <form onSubmit={onSubmit} className="mt-8 bg-surface-container-lowest border border-surface-variant rounded-xl p-6 space-y-4 card-shadow">
        <label className="block">
          <span className="text-sm font-medium">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="johndoe" className="mt-1 w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          {fieldErr.username && <span className="text-xs text-error mt-1 block">{fieldErr.username}</span>}
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="••••••••" className="mt-1 w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          <span className="text-xs text-secondary mt-1 block">Min 8 chars, at least 1 letter and 1 number (e.g. pass1234)</span>
          {fieldErr.password && <span className="text-xs text-error mt-1 block">{fieldErr.password}</span>}
        </label>
        {err && <p className="text-sm text-error">{err}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40">{loading ? "Creating..." : "Create account"}</button>
        <p className="text-xs text-center text-secondary">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
      </form>
    </main>
  );
}
