import { authConfigured, createSessionCookie, findUser } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!authConfigured()) return Response.json({ error: "Application login is not configured." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { username?: string; password?: string };
  const user = findUser(String(body.username || ""), String(body.password || ""));
  if (!user) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return Response.json({ error: "Incorrect username or password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ authenticated: true, user: { username: user.username, role: user.role, clientKey: user.clientKey, label: user.label } }, { headers: { "Set-Cookie": await createSessionCookie(request, user), "Cache-Control": "no-store" } });
}
