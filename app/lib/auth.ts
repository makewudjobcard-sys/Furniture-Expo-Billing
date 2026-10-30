const COOKIE_NAME = "fe_session";
const SESSION_SECONDS = 12 * 60 * 60;

type AuthEnv = {
  APP_USERNAME?: string;
  APP_PASSWORD?: string;
  APP_SESSION_SECRET?: string;
  APP_USERS_JSON?: string;
};

export type AppUser = { username: string; password: string; role: "md" | "client"; clientKey: string; label: string };

const DEFAULT_USERS: AppUser[] = [
  { username: "Managing Director", password: "MD2026", role: "md", clientKey: "all", label: "Managing Director" },
  { username: "Iyer Bungalow", password: "IB2026", role: "client", clientKey: "IB", label: "Iyer Bungalow" },
  { username: "Bypass", password: "BP2026", role: "client", clientKey: "BP", label: "Bypass" },
  { username: "Highway", password: "HW2026", role: "client", clientKey: "HW", label: "Highway" },
];

function config() {
  const values = process.env as AuthEnv;
  const username = values.APP_USERNAME?.trim() || "";
  const password = values.APP_PASSWORD || "";
  const secret = values.APP_SESSION_SECRET || "";
  return username && password && secret.length >= 32 ? { username, password, secret } : null;
}

function users(): AppUser[] {
  const values = process.env as AuthEnv;
  if (values.APP_USERS_JSON) {
    try {
      const parsed = JSON.parse(values.APP_USERS_JSON) as AppUser[];
      if (Array.isArray(parsed) && parsed.length) return parsed.filter((user) => user?.username && user?.password).map((user) => ({ role: user.role === "md" ? "md" : "client", clientKey: user.role === "md" ? "all" : String(user.clientKey || user.username).toUpperCase(), label: String(user.label || user.username), username: String(user.username), password: String(user.password) }));
    } catch { /* fall back to the configured single user/default showroom users */ }
  }
  const current = config();
  return current ? [{ username: current.username, password: current.password, role: "md", clientKey: "all", label: current.username }, ...DEFAULT_USERS.filter((user) => user.username !== current.username)] : DEFAULT_USERS;
}

function constantTimeEqual(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  const length = Math.max(a.length, b.length);
  let mismatch = a.length ^ b.length;
  for (let index = 0; index < length; index++) mismatch |= (a[index] || 0) ^ (b[index] || 0);
  return mismatch === 0;
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function sign(value: string, secret: string) {
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(value));
  return base64Url(new Uint8Array(signature));
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  return cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1) || "";
}

export function authConfigured() {
  return Boolean((process.env as AuthEnv).APP_USERS_JSON || config() || DEFAULT_USERS.length);
}

export function credentialsValid(username: string, password: string) {
  return Boolean(findUser(username, password));
}

export function findUser(username: string, password: string) {
  return users().find((user) => constantTimeEqual(username.trim(), user.username) && constantTimeEqual(password, user.password)) || null;
}

export async function createSessionCookie(request: Request, user: AppUser) {
  const current = config();
  const secret = current?.secret || (process.env as AuthEnv).APP_SESSION_SECRET || "smaarthome-default-session-secret-change-me-2026";
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ username: user.username, role: user.role, clientKey: user.clientKey, label: user.label, expiresAt: Date.now() + SESSION_SECONDS * 1000 })));
  const token = `${payload}.${await sign(payload, secret)}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function isAuthenticated(request: Request) {
  const token = cookieValue(request);
  if (!token) return false;
  const current = config();
  const secret = current?.secret || (process.env as AuthEnv).APP_SESSION_SECRET || "smaarthome-default-session-secret-change-me-2026";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const verified = await crypto.subtle.verify("HMAC", await signingKey(secret), fromBase64Url(signature), new TextEncoder().encode(payload));
    if (!verified) return false;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { username?: string; expiresAt?: number };
    return Boolean(users().find((user) => user.username === session.username) && Number(session.expiresAt) > Date.now());
  } catch {
    return false;
  }
}

export async function getSessionUser(request: Request): Promise<AppUser | null> {
  const token = cookieValue(request);
  if (!token) return null;
  const current = config();
  const secret = current?.secret || (process.env as AuthEnv).APP_SESSION_SECRET || "smaarthome-default-session-secret-change-me-2026";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  try {
    const verified = await crypto.subtle.verify("HMAC", await signingKey(secret), fromBase64Url(signature), new TextEncoder().encode(payload));
    if (!verified) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { username?: string; role?: string; clientKey?: string; label?: string; expiresAt?: number };
    const user = users().find((item) => item.username === session.username);
    return user && Number(session.expiresAt) > Date.now() ? user : null;
  } catch { return null; }
}

export function unauthorized() {
  return Response.json({ error: "Login required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
