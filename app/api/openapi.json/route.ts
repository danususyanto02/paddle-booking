import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: { title: "Kinetic Court API", version: "1.0.0" },
    paths: {
      "/api/v1/courts": { get: { summary: "List courts", security: [] }, post: { summary: "Create court", security: [{ bearerAuth: [] }, { cookieAuth: [] }] } },
      "/api/v1/courts/{id}": { get: { summary: "Get court" }, patch: { summary: "Update court" } },
      "/api/v1/bookings/slots": { get: { summary: "Slot availability" } },
      "/api/v1/bookings": { post: { summary: "Create booking" }, get: { summary: "List bookings (admin)" } },
      "/api/v1/me/bookings": { get: { summary: "My bookings" } },
      "/api/v1/auth/login": { post: { summary: "Login" } },
      "/api/v1/health": { get: { summary: "Health", security: [] } },
    },
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }, cookieAuth: { type: "apiKey", in: "cookie", name: "kc_session" } },
    },
  });
}
