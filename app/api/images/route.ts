import { env } from "cloudflare:workers";
import { isAuthenticated, unauthorized } from "../../lib/auth";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(request: Request) {
  if (!await isAuthenticated(request)) return unauthorized();
  try {
    const form = await request.formData();
    const value = form.get("image");
    if (!(value instanceof File)) {
      return Response.json({ error: "Choose an image file." }, { status: 400 });
    }
    if (!ALLOWED.has(value.type)) {
      return Response.json({ error: "Use JPG, PNG, WebP or GIF images." }, { status: 400 });
    }
    if (value.size > 8 * 1024 * 1024) {
      return Response.json({ error: "Image must be below 8 MB." }, { status: 400 });
    }
    const extension = value.type === "image/png" ? "png" : value.type === "image/webp" ? "webp" : value.type === "image/gif" ? "gif" : "jpg";
    const key = `product-${Date.now().toString(36)}-${crypto.randomUUID()}.${extension}`;
    await env.FILES.put(key, await value.arrayBuffer(), {
      httpMetadata: { contentType: value.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: value.name.slice(0, 180) },
    });
    return Response.json({ key, url: `/api/images/${encodeURIComponent(key)}` }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Image upload failed." }, { status: 500 });
  }
}
