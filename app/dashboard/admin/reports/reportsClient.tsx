"use client";

import { formatIDRShort } from "@/lib/pricing";

const monthlyRevenue = [
  { month:"Jan", revenue: 18500000 },
  { month:"Feb", revenue: 22000000 },
  { month:"Mar", revenue: 16200000 },
  { month:"Apr", revenue: 24800000 },
  { month:"May", revenue: 30500000 },
  { month:"Jun", revenue: 28400000 },
  { month:"Jul", revenue: 36200000 },
];

const incomeBreakdown = [
  { label:"Court Rentals", value: 60, color:"#a7d7c5" },
  { label:"Memberships", value: 25, color:"#e3cffe" },
  { label:"Equipment", value: 15, color:"#b0d3df" },
];

export default function ReportsClient() {
  const max = Math.max(...monthlyRevenue.map((m) => m.revenue));
  const totalRevenue = monthlyRevenue.reduce((s, m) => s + m.revenue, 0);
  const growthPct = ((monthlyRevenue.at(-1)!.revenue - monthlyRevenue.at(-2)!.revenue) / monthlyRevenue.at(-2)!.revenue * 100).toFixed(1);

  const exportCsv = () => {
    const header = "Month,Revenue";
    const rows = monthlyRevenue.map((m) => `${m.month},${m.revenue}`).join("\n");
    const blob = new Blob([header + "\n" + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "revenue.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const a = incomeBreakdown[0]!, b = incomeBreakdown[1]!, c = incomeBreakdown[2]!;
  const donut = `conic-gradient(${a.color} 0 ${a.value}%, ${b.color} ${a.value}% ${a.value + b.value}%, ${c.color} ${a.value + b.value}% 100%)`;

  return (
    <div className="space-y-6 mt-6">
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-6">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Monthly Revenue</h3>
          <button onClick={exportCsv} className="text-xs font-semibold text-primary hover:underline">Export CSV</button>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-2xl font-bold">{formatIDRShort(totalRevenue)}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-mint-glace text-primary font-semibold">+{growthPct}% vs last month</span>
        </div>
        <div className="mt-6 h-48 flex items-end gap-2">
          {monthlyRevenue.map((m, i) => {
            const h = Math.round((m.revenue / max) * 100);
            const isLast = i === monthlyRevenue.length - 1;
            return <div key={m.month} className="flex-1 flex flex-col items-center gap-2"><div className={`w-full rounded-t-md ${isLast ? "bg-secondary-container" : "bg-primary-container"}`} style={{ height: `${Math.max(6, h)}%` }} /><span className="text-xs text-secondary">{m.month}</span></div>;
          })}
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-6">
        <h3 className="font-semibold">Income Breakdown</h3>
        <div className="flex flex-col md:flex-row items-center gap-8 mt-4">
          <div className="w-32 h-32 rounded-full shrink-0" style={{ background: donut }} />
          <div className="space-y-2">
            {incomeBreakdown.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ background: b.color }} />
                <span>{b.label}</span><span className="font-semibold">{b.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
