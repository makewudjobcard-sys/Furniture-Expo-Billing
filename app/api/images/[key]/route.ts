import { env } from "cloudflare:workers";
import { isAuthenticated, unauthorized } from "../../../lib/auth";

export async function GET(request: Request, context: { params: Promise<{ key: string }> }) {
  if (!await isAuthenticated(request)) return unauthorized();
  const { key: encoded } = await context.params;
  const key = decodeURIComponent(encoded);
  if (!key.startsWith("product-") || key.includes("..") || key.includes("/")) {
    return new Response("Not found", { status: 404 });
  }
  const object = await env.FILES.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}
