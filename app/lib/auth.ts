import { env } from "cloudflare:workers";

const COOKIE_NAME = "fe_session";
const SESSION_SECONDS = 12 * 60 * 60;

type AuthEnv = {
  APP_USERNAME?: string;
  APP_PASSWORD?: string;
  APP_SESSION_SECRET?: string;
};

function config() {
  const values = env as unknown as AuthEnv;
  const username = values.APP_USERNAME?.trim() || "";
  const password = values.APP_PASSWORD || "";
  const secret = values.APP_SESSION_SECRET || "";
  return username && password && secret.length >= 32 ? { username, password, secret } : null;
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
  return Boolean(config());
}

export function credentialsValid(username: string, password: string) {
  const current = config();
  return Boolean(current && constantTimeEqual(username.trim(), current.username) && constantTimeEqual(password, current.password));
}

export async function createSessionCookie(request: Request, username: string) {
  const current = config();
  if (!current) throw new Error("Application login is not configured.");
  const payload = base64Url(new TextEncoder().encode(JSON.stringify({ username, expiresAt: Date.now() + SESSION_SECONDS * 1000 })));
  const token = `${payload}.${await sign(payload, current.secret)}`;
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure}`;
}

export function clearSessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export async function isAuthenticated(request: Request) {
  const current = config();
  const token = cookieValue(request);
  if (!current || !token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  try {
    const verified = await crypto.subtle.verify("HMAC", await signingKey(current.secret), fromBase64Url(signature), new TextEncoder().encode(payload));
    if (!verified) return false;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as { username?: string; expiresAt?: number };
    return session.username === current.username && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
}

export function unauthorized() {
  return Response.json({ error: "Login required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
}
