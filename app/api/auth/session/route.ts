import { authConfigured, getSessionUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  return Response.json({ authenticated: Boolean(user), configured: authConfigured(), user: user ? { username: user.username, role: user.role, clientKey: user.clientKey, label: user.label } : null }, { headers: { "Cache-Control": "no-store" } });
}
