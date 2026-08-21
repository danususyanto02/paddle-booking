"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
      if (!res.ok) { setErr(j.error?.message ?? "Registration failed"); if (res.status === 403) setErr("Registration is disabled"); return; }
      router.push("/login");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <>
      <Navbar />
      <main className="max-w-[480px] mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-sm text-on-surface-variant mt-1">Join Kinetic Court. Username 3–32 chars, password 8+ with letter & number.</p>
        <form onSubmit={onSubmit} className="mt-8 bg-surface-container-lowest border border-surface-variant rounded-xl p-6 space-y-4 card-shadow">
          <label className="block"><span className="text-sm font-medium">Username</span><input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="johndoe" className="mt-1 w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></label>
          <label className="block"><span className="text-sm font-medium">Password</span><input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="••••••••" className="mt-1 w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" /></label>
          {err && <p className="text-sm text-error">{err}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40">{loading ? "Creating..." : "Create account"}</button>
          <p className="text-xs text-center text-secondary">Already have an account? <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
        </form>
      </main>
      <Footer />
    </>
  );
}
