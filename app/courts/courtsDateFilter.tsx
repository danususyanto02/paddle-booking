"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import DatePicker from "@/components/ui/datePicker";

export default function CourtsDateFilter({ initialDate }: { initialDate: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function onChange(iso: string) {
    const qs = new URLSearchParams(sp.toString());
    if (iso) qs.set("date", iso);
    else qs.delete("date");
    // keep page param? reset to first page if you had pagination tied to URL
    const s = qs.toString();
    router.push(`${pathname}${s ? `?${s}` : ""}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 bg-surface-container-lowest border border-surface-variant rounded-xl px-3 py-2 shadow-sm min-w-[200px]">
      <DatePicker value={initialDate} onChange={onChange} placeholder="dd/mm/yyyy" />
    </div>
  );
}
