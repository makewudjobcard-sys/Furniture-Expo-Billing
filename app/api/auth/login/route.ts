import { authConfigured, createSessionCookie, credentialsValid } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!authConfigured()) return Response.json({ error: "Application login is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
  if (!credentialsValid(String(body.username || ""), String(body.password || ""))) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return Response.json({ error: "Incorrect username or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ authenticated: true }, { headers: { "Set-Cookie": await createSessionCookie(request, String(body.username)), "Cache-Control": "no-store" } });
}
