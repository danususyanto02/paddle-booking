"use client";

import { useState, useMemo } from "react";
import { MemberRowSkeleton } from "@/components/ui/skeleton";

type Member = { id: string; name: string; phone: string; tier: string; status: string; lastBooking: string; avatar: string | null };

const MEMBERS: Member[] = [
  { id:"m1", name:"Adrian Valeriano", phone:"+62 812-3456-7890", tier:"Gold", status:"Active", lastBooking:"2023-10-12", avatar: null },
  { id:"m2", name:"Maria Santoso", phone:"+62 811-9876-5432", tier:"Silver", status:"Active", lastBooking:"2023-10-10", avatar: null },
  { id:"m3", name:"Linda Kusuma", phone:"+62 813-5555-1234", tier:"Basic", status:"Inactive", lastBooking:"2023-09-01", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80" },
  { id:"m4", name:"Budi Pratama", phone:"+62 856-7777-8888", tier:"Gold", status:"Active", lastBooking:"2023-10-14", avatar: null },
  { id:"m5", name:"Sinta Wijaya", phone:"+62 812-0001-2233", tier:"Silver", status:"Active", lastBooking:"2023-10-09", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80" },
  { id:"m6", name:"Rafi Hidayat", phone:"+62 813-8899-0011", tier:"Basic", status:"Active", lastBooking:"2023-09-28", avatar: null },
  { id:"m7", name:"Clara Tan", phone:"+62 812-3344-5566", tier:"Gold", status:"Inactive", lastBooking:"2023-08-20", avatar: null },
  { id:"m8", name:"Dimas Saputra", phone:"+62 815-6677-8899", tier:"Silver", status:"Active", lastBooking:"2023-10-15", avatar: null },
];

const tierColor: Record<string, string> = { Gold: "bg-amber-100 text-amber-800", Silver: "bg-zinc-200 text-zinc-700", Basic: "bg-sky-100 text-sky-800" };

export default function MembersClient() {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<string>("All");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return MEMBERS.filter((m) => {
      if (tier !== "All" && m.tier !== tier) return false;
      if (q) {
        const qq = q.toLowerCase();
        if (!m.name.toLowerCase().includes(qq) && !m.phone.includes(q)) return false;
      }
      return true;
    });
  }, [q, tier]);

  const exportCsv = () => {
    const header = "Name,Phone,Tier,Status,Last Booking";
    const rows = filtered.map((m) => [m.name, m.phone, m.tier, m.status, m.lastBooking].map((s) => `"${s}"`).join(",")).join("\n");
    const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "members.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px]" />
        <select value={tier} onChange={(e) => setTier(e.target.value)} className="border border-outline-variant rounded-lg px-3 py-1.5 text-sm">
          <option>All</option><option>Gold</option><option>Silver</option><option>Basic</option>
        </select>
        <button onClick={exportCsv} className="px-4 py-1.5 rounded-lg border border-outline-variant text-sm font-semibold hover:bg-surface">Export CSV</button>
      </div>
      <div className="mt-6 bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="hidden md:grid grid-cols-12 gap-2 p-3 bg-surface-container-low text-xs font-semibold text-secondary">
          <div className="col-span-4">Member</div><div className="col-span-3">Phone</div><div className="col-span-2">Tier</div><div className="col-span-3">Last Booking</div>
        </div>
        {loading ? <MemberRowSkeleton count={4} /> : filtered.length === 0 ? <div className="p-8 text-center text-sm text-secondary">No members found.</div> : filtered.map((m) => (
          <div key={m.id} className="grid md:grid-cols-12 gap-2 p-4 border-b border-outline-variant/20 items-center text-sm">
            <div className="md:col-span-4 flex items-center gap-3">
              {m.avatar ? <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-full object-cover" /> : <div className="w-9 h-9 rounded-full bg-lavender-mist grid place-items-center text-xs font-bold">{m.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>}
              <span className="font-medium">{m.name}</span>
            </div>
            <div className="md:col-span-3 text-xs text-secondary">{m.phone}</div>
            <div className="md:col-span-2"><span className={`text-xs px-2 py-1 rounded-full font-semibold ${tierColor[m.tier] ?? ""}`}>{m.tier}</span></div>
            <div className="md:col-span-3 text-xs text-secondary ml-auto md:ml-0">{m.lastBooking}</div>
          </div>
        ))}
      </div>
    </>
  );
}
