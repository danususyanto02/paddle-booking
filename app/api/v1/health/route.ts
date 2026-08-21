import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 2000);
    await prisma.$queryRaw`SELECT 1`;
    clearTimeout(t);
    return NextResponse.json({ status: "ok", db: "up" }, { status: 200 });
  } catch {
    return NextResponse.json({ status: "error", db: "down" }, { status: 503, headers: { "Retry-After": "10" } });
  }
}
