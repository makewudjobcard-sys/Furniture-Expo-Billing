import { env } from "cloudflare:workers";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
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
