import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="font-headline-lg text-primary">404</p>
      <h1 className="font-headline-md mt-2">Halaman tidak ditemukan</h1>
      <p className="font-body-md text-on-surface-variant mt-2">
        Halaman yang kamu cari tidak tersedia.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center rounded-full bg-primary px-6 py-2.5 font-label-bold text-on-primary hover:opacity-90 transition-opacity"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
