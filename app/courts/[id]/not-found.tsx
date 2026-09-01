import Link from "next/link";

export default function CourtNotFound() {
  return (
    <div className="text-center py-16">
      <p className="text-on-surface-variant">Court not found.</p>
      <Link href="/courts" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">Browse courts</Link>
    </div>
  );
}
