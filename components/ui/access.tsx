"use client";

import { useAccess } from "@/hooks/useAccess";

type AccessProps = {
  CodeAccess: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export default function Access({ CodeAccess, fallback = null, children }: AccessProps) {
  const { has, loading } = useAccess();
  if (loading) return null; // avoid flash; caller may show Skeleton if needed
  if (!has(CodeAccess)) return <>{fallback}</>;
  return <>{children}</>;
}
