import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!doctype html><html><head><title>API Docs</title><link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"/></head><body><div id="swagger-ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script><script>SwaggerUIBundle({url:"/api/openapi.json", dom_id:"#swagger-ui"})</script></body></html>`;
  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
