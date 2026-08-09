import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the secure Furniture Expo shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>Furniture Expo — Live Billing Desk<\/title>/i);
  assert.match(html, /class="login-shell"/);
  assert.match(html, /Opening secure billing desk/);
  assert.match(html, /Cloud Billing|Live Billing/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("keeps credentials server-side and protects cloud workflows", async () => {
  const [page, auth, expo, image, packageJson, envExample] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/expo/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/images/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.env.example", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\/api\/auth\/login/);
  assert.match(page, /@zxing\/browser/);
  assert.match(page, /action: "adjustStock"/);
  assert.match(auth, /HttpOnly; SameSite=Strict/);
  assert.match(auth, /crypto\.subtle\.verify/);
  assert.match(expo, /isAuthenticated\(request\)/);
  assert.match(expo, /client_request_id/);
  assert.match(image, /isAuthenticated\(request\)/);
  assert.match(packageJson, /"@zxing\/browser"/);
  assert.doesNotMatch(page, /EX2026/);
  assert.doesNotMatch(auth, /EX2026/);
  assert.doesNotMatch(envExample, /EX2026/);
});
