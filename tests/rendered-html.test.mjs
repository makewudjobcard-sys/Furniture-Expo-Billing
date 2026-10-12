import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("defines the secure Furniture Expo shell", async () => {
  const [layout, page] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Furniture Expo — Live Billing Desk/i);
  assert.match(page, /className="login-shell"/);
  assert.match(page, /Opening secure billing desk/);
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
