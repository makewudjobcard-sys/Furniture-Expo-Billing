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
  assert.match(auth, /Managing Director/);
  assert.match(auth, /clientKey/);
  assert.match(expo, /isAuthenticated\(request\)/);
  assert.match(expo, /client_request_id/);
  assert.match(image, /isAuthenticated\(request\)/);
  assert.match(packageJson, /"@zxing\/browser"/);
  assert.doesNotMatch(page, /EX2026/);
  assert.match(envExample, /APP_USERS_JSON/);
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
  assert.match(page, /Assigned staff A–Z/);
  assert.match(page, /Staff filter/);
  assert.match(page, /taskCategoryLocked/);
  assert.match(page, /follow-up-notes-field/);
  assert.match(page, /taskCategoryLocked/);
  assert.match(page, /Customer notes/);
  assert.match(page, /Mark task unfinished/);
  assert.match(page, /Name A–Z/);
  assert.match(page, /Custom Made|Custom made/);
  assert.match(page, /Managing Director approval/);
  assert.match(expo, /Order saved but follow-up automation failed/);
  assert.match(expo, /Primary action saved but audit logging failed/);
  assert.match(expo, /type='Happy Call'/);
  assert.match(expo, /UPDATE counters SET value=value\+1 WHERE key=\?\"\)\.bind/);
  assert.match(expo, /SELECT value FROM counters WHERE key=\?\"\)\.bind/);
  assert.doesNotMatch(expo, /UPDATE counters SET value=value\+1 WHERE key='bill' RETURNING value\"\)\.first/);
  assert.match(schema, /create table if not exists public\.leads/i);
  assert.match(schema, /create table if not exists public\.job_cards/i);
  assert.match(schema, /create table if not exists public\.held_orders/i);
  assert.match(schema, /create table if not exists public\.stock_verifications/i);
  assert.match(expo, /enquired_products/);
  assert.match(expo, /completion_reason/);
  assert.match(expo, /client_key/);
  assert.match(expo, /MD approval required/);
  assert.match(schema, /alter table public\.tasks add column if not exists customer_name/i);
});
