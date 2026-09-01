"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { calcTotal, formatIDRShort } from "@/lib/pricing";
import { endTime } from "@/lib/slots";

type Court = { id: string; code: string; name: string; type: string; surface: string; location: string; image: string; pricePerHour: number };

export default function CheckoutClient({ court, date, slot, duration }: { court: Court; date: string; slot: string; duration: 60 | 90 | 120 }) {
  const router = useRouter();
  const [method, setMethod] = useState("Bank Transfer");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const totals = useMemo(() => calcTotal(court.pricePerHour, duration), [court.pricePerHour, duration]);
  const end = endTime(slot, duration);
  const dateLong = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const onPay = async () => {
    setLoading(true);
    setErr(null);
    try {
      // Need CSRF for cookie auth: fetch token if needed
      let csrf: string | null = null;
      const csrfRes = await fetch("/api/v1/auth/csrf", { credentials: "include" });
      if (csrfRes.ok) {
        const j = (await csrfRes.json()) as { data?: { csrfToken?: string } };
        csrf = j.data?.csrfToken ?? null;
      }
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (csrf) headers["x-csrf-token"] = csrf;
      // Also include Origin for CSRF check
      headers["Origin"] = window.location.origin;

      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ courtId: court.id, date, slot, duration, paymentMethod: method }),
      });
      const json = (await res.json()) as { data?: { code?: string }; error?: { code: string; message: string } };
      if (!res.ok) {
        setErr(json.error?.message ?? `Error ${res.status}`);
        return;
      }
      const code = json.data?.code;
      router.push(`/booking/success?code=${encodeURIComponent(code ?? "")}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-12 gap-8 mt-8">
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-6 card-shadow">
          <div className="flex gap-4">
            {/* eslint-disable @next/next/no-img-element */}
            <img src={court.image} alt={court.name} width={96} height={96} className="w-24 h-24 rounded-lg object-cover border border-surface-variant" />
            <div>
              <div className="text-xs px-2 py-1 rounded-full bg-mint-glace text-on-primary-fixed-variant inline-block">{court.type} · {court.surface}</div>
              <h3 className="font-semibold mt-1">{court.name}</h3>
              <p className="text-xs text-secondary">{court.location}</p>
              <p className="text-sm font-medium mt-2">{dateLong} · {slot} – {end} · {duration} min</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-6">
          <h2 className="font-semibold">Payment Method</h2>
          <p className="text-xs text-secondary mt-1">Mock payment — no real transaction will be processed.</p>
          <div className="mt-4 space-y-3">
            {["Bank Transfer", "QRIS", "Cash at Venue"].map((m) => (
              <label key={m} className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant cursor-pointer has-[input:checked]:border-primary has-[input:checked]:bg-mint-glace">
                <input type="radio" name="pay" value={m} checked={method === m} onChange={() => setMethod(m)} /> {m}{m === "Bank Transfer" ? " (Virtual Account)" : ""}
              </label>
            ))}
          </div>
        </div>
        {err && <p className="text-sm text-error">{err}</p>}
      </div>

      <div className="lg:col-span-5">
        <div className="bg-surface-container-lowest border border-surface-variant rounded-xl p-6 card-shadow sticky top-24">
          <h3 className="font-semibold">Price Breakdown</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-on-surface-variant"><span>Court Fee</span><span>{formatIDRShort(totals.courtFee)}</span></div>
            <div className="flex justify-between text-on-surface-variant"><span>Processing Fee</span><span>{formatIDRShort(totals.processingFee)}</span></div>
            <div className="h-px bg-outline-variant/30 my-2" />
            <div className="flex justify-between font-semibold"><span>Total</span><span className="text-primary">{formatIDRShort(totals.total)}</span></div>
          </div>
          <button onClick={onPay} disabled={loading} className="mt-6 w-full py-3 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40">
            {loading ? "Processing..." : "Pay Now"}
          </button>
          <p className="text-xs text-center text-secondary mt-2">By paying, you agree to our Terms and cancellation policy.</p>
        </div>
      </div>
    </div>
  );
}
