"use client";

import { useEffect, useState, useCallback } from "react";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toaster";

type UserRow = { id: string; username: string; displayName: string | null; email: string | null; status: string; isSystem: boolean; roles: string[]; createdAt: string };

export default function UsersClient() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [data, setData] = useState<UserRow[] | null>(null);
  const [roles, setRoles] = useState<{ name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editRoles, setEditRoles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const qs = new URLSearchParams({ page: String(page), limit: "20" });
    if (q) qs.set("q", q);
    if (status) qs.set("status", status);
    if (role) qs.set("role", role);
    const r = await fetch(`/api/v1/users?${qs.toString()}`, { credentials: "include" });
    if (r.status === 401 || r.status === 403) { setData([]); return; }
    const j = await r.json().catch(() => ({ data: [] })) as { data: UserRow[]; meta?: { total: number; totalPages: number } };
    setData(j.data ?? []);
    setMeta(j.meta ?? null);
  }, [page, q, status, role]);

  const fetchRoles = useCallback(async () => {
    const r = await fetch("/api/v1/roles", { credentials: "include" });
    const j = await r.json().catch(() => ({ data: [] })) as { data: { name: string }[] };
    setRoles(j.data ?? []);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  const openEdit = (u: UserRow) => { setEditing(u); setEditRoles([...u.roles]); };
  const saveEdit = async () => {
    if (!editing) return;
    if (editing.isSystem) { toast("Cannot change roles of system user", "error"); return; }
    setSaving(true);
    try {
      const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
      const csrf = csrfRes.ok ? (await csrfRes.json() as { data?: { csrfToken?: string } }).data?.csrfToken : null;
      const headers: Record<string, string> = { "Content-Type": "application/json", Origin: window.location.origin };
      if (csrf) headers["x-csrf-token"] = csrf;
      const res = await fetch(`/api/v1/users/${editing.id}`, { method: "PUT", credentials: "include", headers, body: JSON.stringify({ roles: editRoles }) });
      const j = await res.json().catch(() => ({})) as { error?: { message?: string } };
      if (!res.ok) { toast(j.error?.message ?? `Save failed (${res.status})`, "error"); return; }
      toast("Roles updated", "success");
      setEditing(null);
      fetchData();
    } finally { setSaving(false); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search username or name" className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px]" />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm">
          <option value="">All status</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option>
        </select>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm">
          <option value="">All roles</option>
          {roles.map((r) => <option key={r.name} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      <div className="mt-6 bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 p-3 bg-surface-container-low text-xs font-semibold text-secondary">
          <div className="col-span-3">Username</div><div className="col-span-3">Display</div><div className="col-span-3">Roles</div><div className="col-span-1">Status</div><div className="col-span-2 text-right">Action</div>
        </div>
        {data === null ? <TableRowSkeleton count={5} /> : data.length === 0 ? <div className="p-8 text-center text-sm text-secondary">No users found.</div> : data.map((u) => (
          <div key={u.id} className="grid md:grid-cols-12 gap-2 p-4 border-b border-outline-variant/20 items-center text-sm hover:bg-surface">
            <div className="md:col-span-3"><div className="font-medium flex items-center gap-2">{u.username}{u.isSystem && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">SYSTEM</span>}</div><div className="text-xs text-secondary">{u.id.slice(0, 8)}</div></div>
            <div className="md:col-span-3 text-secondary">{u.displayName ?? "—"}<div className="text-xs">{u.email ?? ""}</div></div>
            <div className="md:col-span-3 flex flex-wrap gap-1">{u.roles.map((r) => <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container">{r}</span>)}</div>
            <div className="md:col-span-1"><span className={`text-xs px-2 py-1 rounded-full ${u.status === "ACTIVE" ? "bg-mint-glace text-on-primary-fixed-variant" : "bg-error-container text-on-error-container"}`}>{u.status}</span></div>
            <div className="md:col-span-2 text-right"><button onClick={() => openEdit(u)} disabled={u.isSystem} className="px-3 py-1.5 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-surface disabled:opacity-40">Edit roles</button></div>
          </div>
        ))}
        {meta && meta.totalPages > 1 && (
          <div className="flex justify-center gap-2 p-3">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">Prev</button>
            <span className="text-sm py-1">{page} / {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-surface-container-lowest rounded-xl p-6 w-full max-w-md card-shadow space-y-4">
            <h3 className="font-semibold">Edit roles — {editing.username}</h3>
            {editing.isSystem ? <p className="text-sm text-error">System user — roles cannot be changed.</p> : (
              <div className="space-y-2">
                {roles.map((r) => (
                  <label key={r.name} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={editRoles.includes(r.name)} disabled={r.name === "SUPER_ADMIN" && editing.roles.includes("SUPER_ADMIN") && editRoles.length === 1} onChange={(e) => setEditRoles((prev) => e.target.checked ? [...prev, r.name] : prev.filter((x) => x !== r.name))} />
                    {r.name}
                  </label>
                ))}
                {editRoles.length === 0 && <p className="text-xs text-error">At least one role required</p>}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving || editing.isSystem || editRoles.length === 0} className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold disabled:opacity-40">{saving ? "Saving..." : "Save"}</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg border border-outline-variant text-sm font-semibold">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
