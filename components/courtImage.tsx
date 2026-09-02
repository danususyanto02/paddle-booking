"use client";
import { useState } from "react";

const FALLBACK = "https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?auto=format&fit=crop&w=800&q=80";

export default function CourtImage({ src, alt, className, width, height, loading }: { src: string; alt: string; className?: string; width?: number; height?: number; loading?: "lazy"|"eager" }) {
  const [err, setErr] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const url = err || !src ? FALLBACK : src;
  return (
    <>
      {!loaded && <div className="absolute inset-0 skeleton" aria-hidden="true" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => { setErr(true); setLoaded(true); }}
        className={(className ?? "") + (loaded ? " is-loaded" : "") + " img-fade"}
      />
    </>
  );
}
