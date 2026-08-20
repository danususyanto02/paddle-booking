import { NextResponse } from "next/server";

// Success: { data, meta? } ; Error: { error: { code, message, details? } } + requestId header

export function success(data: unknown, init?: { status?: number; meta?: unknown; headers?: HeadersInit }) {
  const body: Record<string, unknown> = { data };
  if (init?.meta !== undefined) body.meta = init.meta;
  else if (Array.isArray(data)) {
    // For list endpoints without explicit meta, omit meta
  }
  const res = NextResponse.json(body, { status: init?.status ?? 200 });
  if (init?.headers) {
    for (const [k, v] of Object.entries(init.headers as Record<string, string>)) res.headers.set(k, v);
  }
  return res;
}

export function paginated<T>(data: T[], meta: { page: number; limit: number; total: number; totalPages: number }) {
  return success(data, { meta });
}

export function error(
  code: string,
  message: string,
  init?: { status?: number; details?: unknown; headers?: HeadersInit },
) {
  const body: Record<string, unknown> = { error: { code, message, ...(init?.details ? { details: init.details } : {}) } };
  const res = NextResponse.json(body, { status: init?.status ?? 400 });
  if (init?.headers) {
    for (const [k, v] of Object.entries(init.headers as Record<string, string>)) res.headers.set(k, v);
  }
  return res;
}

export function validationError(details: unknown) {
  return error("VALIDATION_ERROR", "Validation failed", { status: 422, details });
}

export function unauthenticated(msg = "Invalid credentials") {
  return error("UNAUTHENTICATED", msg, { status: 401 });
}

export function tokenExpired() {
  return error("TOKEN_EXPIRED", "Token expired", { status: 401 });
}

export function forbidden(msg = "Forbidden") {
  return error("FORBIDDEN", msg, { status: 403 });
}

export function notFound(msg = "Not found") {
  return error("NOT_FOUND", msg, { status: 404 });
}

export function conflict(msg: string, details?: unknown) {
  return error("CONFLICT", msg, { status: 409, details });
}
