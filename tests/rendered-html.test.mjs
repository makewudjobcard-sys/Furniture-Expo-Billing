import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines the secure Smaarthome Furniture shell", async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Smaarthome Furniture — Showroom Billing/i);
  assert.match(page, /className="login-shell"/);
  assert.match(page, /Opening secure showroom desk/);
  assert.match(page, /Cloud Billing|Live Billing/i);
  assert.doesNotMatch(page, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
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

test("includes showroom CRM, resilient billing, stock checks and production workflows", async () => {
  const [page, expo, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/expo/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8"),
  ]);

  assert.match(page, /Marketing & leads/);
  assert.match(page, /Custom furniture job card/i);
  assert.match(page, /Verify physical stock/);
  assert.match(page, /Held bills/);
  assert.match(page, /Keyboard shortcuts/);
  assert.match(page, /WhatsApp invoice/);
  assert.match(page, /Delivery month at a glance/);
  assert.match(page, /Retry save/);
  assert.match(expo, /Order saved but follow-up automation failed/);
  assert.match(expo, /Primary action saved but audit logging failed/);
  assert.match(expo, /type='Happy Call'/);
  assert.match(schema, /create table if not exists public\.leads/i);
  assert.match(schema, /create table if not exists public\.job_cards/i);
  assert.match(schema, /create table if not exists public\.held_orders/i);
  assert.match(schema, /create table if not exists public\.stock_verifications/i);
});
