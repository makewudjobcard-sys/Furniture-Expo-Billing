import { env } from "cloudflare:workers";
import { isAuthenticated, unauthorized } from "../../lib/auth";

type ProductInput = {
  id?: string; code?: string; hsnCode?: string; name?: string; category?: string;
  size?: string; woodType?: string; price?: number; stockQty?: number; mrp?: number;
  notes?: string; imageKey?: string;
};

type BillItemInput = {
  productId?: string; code?: string; hsnCode?: string; name?: string; size?: string;
  woodType?: string; price?: number; qty?: number; againstOrder?: boolean;
  againstOrderExtra?: number; customizeDetails?: string;
};

type PaymentRecord = { id: string; amount: number; mode: string; note: string; date: string };

const SAMPLE_PRODUCTS: ProductInput[] = [
  { code: "SOFA-001", hsnCode: "94016100", name: "3 Seater Fabric Sofa", category: "Sofa", size: "3 Seater", price: 55000, stockQty: 2, mrp: 65000 },
  { code: "WSOFA-001", hsnCode: "94016100", name: "Wooden Sofa", category: "Wooden Sofa", size: "3 Seater", woodType: "Teak Wood", price: 65000, stockQty: 1, mrp: 75000 },
  { code: "COT-001", hsnCode: "94035090", name: "King Size Cot", category: "Cot / Bed", size: "6 x 6.5 ft", woodType: "Teak Wood", price: 55000, stockQty: 5, mrp: 65000 },
  { code: "TEAPOY-001", hsnCode: "94036000", name: "Wooden Teapoy", category: "Teapoy", size: "48 x 24 inch", woodType: "Rosewood", price: 18000, stockQty: 2, mrp: 22000 },
  { code: "DCH-001", hsnCode: "94016900", name: "Dining Chair", category: "Dining Chair", size: "Standard", woodType: "Rubber Wood", price: 8500, stockQty: 6, mrp: 10000 },
  { code: "SCH-001", hsnCode: "94016900", name: "Suit Chair", category: "Suit Chair", size: "Standard", woodType: "Teak Wood", price: 12000, stockQty: 3, mrp: 14500 },
];

function clean(value: unknown, fallback = "") { return typeof value === "string" ? value.trim() : fallback; }
function numeric(value: unknown, fallback = 0) { const parsed = Number(value); return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback; }
function whole(value: unknown, fallback = 0) { return Math.max(0, Math.floor(numeric(value, fallback))); }
function round2(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function uid(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`; }
function safeJson<T>(value: unknown, fallback: T): T { try { return typeof value === "string" ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function cleanList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return [...new Set(value.map((item) => clean(item)).filter(Boolean))].slice(0, 100);
}

async function ensureColumn(table: "products" | "bills" | "settings", column: string, definition: string) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!info.results.some((item) => item.name === column)) {
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

async function ensureSchema() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, hsn_code TEXT NOT NULL DEFAULT '', name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Others', size TEXT NOT NULL DEFAULT '', wood_type TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL DEFAULT 0, stock_qty INTEGER NOT NULL DEFAULT 0, mrp REAL NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '', image_key TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY, bill_no TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL, customer_address TEXT NOT NULL DEFAULT '', items_json TEXT NOT NULL,
      staff_name TEXT NOT NULL DEFAULT '', counter_name TEXT NOT NULL DEFAULT '', product_total REAL NOT NULL DEFAULT 0,
      against_order_extra REAL NOT NULL DEFAULT 0, subtotal REAL NOT NULL, discount_type TEXT NOT NULL DEFAULT 'amount',
      discount_value REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0, taxable_value REAL NOT NULL DEFAULT 0,
      cgst REAL NOT NULL DEFAULT 0, sgst REAL NOT NULL DEFAULT 0, gst REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL, paid_amount REAL NOT NULL DEFAULT 0, balance_amount REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'CASH', payment_history_json TEXT NOT NULL DEFAULT '[]',
      delivery_date TEXT NOT NULL DEFAULT '', delivery_status TEXT NOT NULL DEFAULT 'Pending', delivered_at TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), business_name TEXT NOT NULL DEFAULT 'Furniture Expo',
      subtitle TEXT NOT NULL DEFAULT 'Live Billing Desk', gstin TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '', gst_rate REAL NOT NULL DEFAULT 18, bill_prefix TEXT NOT NULL DEFAULT 'EXP',
      staff_names_json TEXT NOT NULL DEFAULT '[]', counter_names_json TEXT NOT NULL DEFAULT '["Counter 1"]',
      default_counter TEXT NOT NULL DEFAULT 'Counter 1', invoice_terms TEXT NOT NULL DEFAULT 'Goods once sold cannot be returned without approval.',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC)"),
  ]);

  const additions: Array<["products" | "bills" | "settings", string, string]> = [
    ["products", "image_key", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "client_request_id", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "staff_name", "TEXT NOT NULL DEFAULT ''"], ["bills", "counter_name", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "product_total", "REAL NOT NULL DEFAULT 0"], ["bills", "against_order_extra", "REAL NOT NULL DEFAULT 0"],
    ["bills", "discount_type", "TEXT NOT NULL DEFAULT 'amount'"], ["bills", "discount_value", "REAL NOT NULL DEFAULT 0"],
    ["bills", "taxable_value", "REAL NOT NULL DEFAULT 0"], ["bills", "cgst", "REAL NOT NULL DEFAULT 0"],
    ["bills", "sgst", "REAL NOT NULL DEFAULT 0"], ["bills", "gst", "REAL NOT NULL DEFAULT 0"],
    ["bills", "payment_history_json", "TEXT NOT NULL DEFAULT '[]'"], ["bills", "delivery_date", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "delivery_status", "TEXT NOT NULL DEFAULT 'Pending'"], ["bills", "delivered_at", "TEXT NOT NULL DEFAULT ''"],
    ["settings", "staff_names_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["settings", "counter_names_json", "TEXT NOT NULL DEFAULT '[\"Counter 1\"]'"],
    ["settings", "default_counter", "TEXT NOT NULL DEFAULT 'Counter 1'"],
    ["settings", "invoice_terms", "TEXT NOT NULL DEFAULT 'Goods once sold cannot be returned without approval.'"],
  ];
  for (const [table, column, definition] of additions) await ensureColumn(table, column, definition);
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_bills_delivery_date ON bills(delivery_date)").run();
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_bills_client_request_id ON bills(client_request_id) WHERE client_request_id<>''").run();

  await db.prepare(`CREATE TRIGGER IF NOT EXISTS bill_stock_guard BEFORE INSERT ON bills BEGIN
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM json_each(NEW.items_json) item LEFT JOIN products p ON p.id=json_extract(item.value,'$.productId')
      WHERE COALESCE(json_extract(item.value,'$.againstOrder'),0)=0
      AND (p.id IS NULL OR p.stock_qty<CAST(json_extract(item.value,'$.qty') AS INTEGER))
    ) THEN RAISE(ABORT,'INSUFFICIENT_STOCK') END;
    UPDATE products SET stock_qty=stock_qty-COALESCE((
      SELECT SUM(CAST(json_extract(item.value,'$.qty') AS INTEGER)) FROM json_each(NEW.items_json) item
      WHERE json_extract(item.value,'$.productId')=products.id AND COALESCE(json_extract(item.value,'$.againstOrder'),0)=0
    ),0),updated_at=CURRENT_TIMESTAMP WHERE id IN (
      SELECT json_extract(item.value,'$.productId') FROM json_each(NEW.items_json) item
      WHERE COALESCE(json_extract(item.value,'$.againstOrder'),0)=0
    ); END`).run();
  await db.prepare(`CREATE TRIGGER IF NOT EXISTS bill_cancel_restore AFTER UPDATE OF status ON bills
    WHEN OLD.status<>'cancelled' AND NEW.status='cancelled' BEGIN
    UPDATE products SET stock_qty=stock_qty+COALESCE((
      SELECT SUM(CAST(json_extract(item.value,'$.qty') AS INTEGER)) FROM json_each(OLD.items_json) item
      WHERE json_extract(item.value,'$.productId')=products.id AND COALESCE(json_extract(item.value,'$.againstOrder'),0)=0
    ),0),updated_at=CURRENT_TIMESTAMP WHERE id IN (
      SELECT json_extract(item.value,'$.productId') FROM json_each(OLD.items_json) item
      WHERE COALESCE(json_extract(item.value,'$.againstOrder'),0)=0
    ); END`).run();
  await db.prepare(`INSERT OR IGNORE INTO settings (id,business_name,subtitle,gst_rate,bill_prefix) VALUES (1,'Furniture Expo','Live Billing Desk',18,'EXP')`).run();
  await db.prepare("INSERT OR IGNORE INTO counters (key,value) VALUES ('bill',0)").run();
  const count = await db.prepare("SELECT COUNT(*) AS count FROM products").first<{ count: number }>();
  if (!count?.count) await db.batch(SAMPLE_PRODUCTS.map(productUpsertStatement));
}

function productUpsertStatement(input: ProductInput) {
  const code = clean(input.code).toUpperCase();
  const id = clean(input.id) || `prd-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-") || crypto.randomUUID()}`;
  return env.DB.prepare(`INSERT INTO products
    (id,code,hsn_code,name,category,size,wood_type,price,stock_qty,mrp,notes,image_key,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(code) DO UPDATE SET hsn_code=excluded.hsn_code,name=excluded.name,category=excluded.category,
    size=excluded.size,wood_type=excluded.wood_type,price=excluded.price,stock_qty=excluded.stock_qty,
    mrp=excluded.mrp,notes=excluded.notes,image_key=CASE WHEN excluded.image_key<>'' THEN excluded.image_key ELSE products.image_key END,
    updated_at=CURRENT_TIMESTAMP`)
    .bind(id, code, clean(input.hsnCode), clean(input.name), clean(input.category, "Others") || "Others", clean(input.size),
      clean(input.woodType), round2(numeric(input.price)), whole(input.stockQty), round2(numeric(input.mrp)), clean(input.notes), clean(input.imageKey));
}

async function readState() {
  const [productRows, billRows, settingRow] = await Promise.all([
    env.DB.prepare(`SELECT id,code,hsn_code AS hsnCode,name,category,size,wood_type AS woodType,price,
      stock_qty AS stockQty,mrp,notes,image_key AS imageKey,updated_at AS updatedAt FROM products ORDER BY category,name`).all(),
    env.DB.prepare(`SELECT id,bill_no AS billNo,customer_name AS customerName,customer_phone AS customerPhone,
      customer_address AS customerAddress,items_json AS itemsJson,staff_name AS staffName,counter_name AS counterName,
      product_total AS productTotal,against_order_extra AS againstOrderExtra,subtotal,discount_type AS discountType,
      discount_value AS discountValue,discount,taxable_value AS taxableValue,cgst,sgst,gst,grand_total AS grandTotal,
      paid_amount AS paidAmount,balance_amount AS balanceAmount,payment_mode AS paymentMode,
      payment_history_json AS paymentHistoryJson,delivery_date AS deliveryDate,delivery_status AS deliveryStatus,
      delivered_at AS deliveredAt,status,created_at AS createdAt FROM bills ORDER BY created_at DESC LIMIT 1000`).all(),
    env.DB.prepare(`SELECT business_name AS businessName,subtitle,gstin,phone,address,gst_rate AS gstRate,
      bill_prefix AS billPrefix,staff_names_json AS staffNamesJson,counter_names_json AS counterNamesJson,
      default_counter AS defaultCounter,invoice_terms AS invoiceTerms,updated_at AS updatedAt FROM settings WHERE id=1`).first(),
  ]);
  const products = productRows.results.map((row) => ({ ...row, imageUrl: row.imageKey ? `/api/images/${encodeURIComponent(String(row.imageKey))}` : "" }));
  const gstRate = Number((settingRow as Record<string, unknown> | null)?.gstRate ?? 18);
  const bills = billRows.results.map((row) => {
    const record = row as Record<string, unknown>;
    const items = safeJson<Array<Record<string, unknown>>>(record.itemsJson, []);
    const legacyTotals = numeric(record.productTotal) === 0 && numeric(record.grandTotal) > 0;
    const productTotal = legacyTotals ? round2(items.reduce((sum, item) => sum + numeric(item.price) * whole(item.qty, 1), 0)) : numeric(record.productTotal);
    const againstOrderExtra = legacyTotals ? round2(items.reduce((sum, item) => sum + numeric(item.againstOrderExtra), 0)) : numeric(record.againstOrderExtra);
    const grandTotal = numeric(record.grandTotal);
    const taxableValue = legacyTotals && gstRate > 0 ? round2(grandTotal / (1 + gstRate / 100)) : numeric(record.taxableValue);
    const gst = legacyTotals ? round2(grandTotal - taxableValue) : numeric(record.gst);
    let paymentHistory = safeJson<PaymentRecord[]>(record.paymentHistoryJson, []);
    if (!paymentHistory.length && numeric(record.paidAmount) > 0) paymentHistory = [{ id: `legacy-${record.id}`, amount: numeric(record.paidAmount), mode: clean(record.paymentMode, "CASH").toUpperCase(), note: "Initial Payment", date: clean(record.createdAt, new Date().toISOString()) }];
    return {
      ...row,
      productTotal,
      againstOrderExtra,
      taxableValue,
      gst,
      cgst: legacyTotals ? round2(gst / 2) : numeric(record.cgst),
      sgst: legacyTotals ? round2(gst - round2(gst / 2)) : numeric(record.sgst),
      items,
      paymentHistory,
      itemsJson: undefined,
      paymentHistoryJson: undefined,
    };
  });
  const rawSettings = settingRow as Record<string, unknown> | null;
  const settings = rawSettings ? {
    ...rawSettings,
    staffNames: safeJson(rawSettings.staffNamesJson, []),
    counterNames: safeJson(rawSettings.counterNamesJson, ["Counter 1"]),
    staffNamesJson: undefined,
    counterNamesJson: undefined,
  } : null;
  return { products, bills, settings, syncedAt: new Date().toISOString() };
}

export async function GET(request: Request) {
  if (!await isAuthenticated(request)) return unauthorized();
  try { await ensureSchema(); return Response.json(await readState(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load expo data" }, { status: 500 }); }
}

export async function POST(request: Request) {
  if (!await isAuthenticated(request)) return unauthorized();
  try {
    await ensureSchema();
    const payload = await request.json() as Record<string, unknown>;
    const action = clean(payload.action);

    if (action === "saveProduct") {
      const product = payload.product as ProductInput;
      if (!clean(product?.code) || !clean(product?.name) || numeric(product?.price) <= 0) {
        return Response.json({ error: "Product code, name and expo price are required." }, { status: 400 });
      }
      await productUpsertStatement(product).run();
    } else if (action === "importProducts") {
      const rows = Array.isArray(payload.products) ? payload.products as ProductInput[] : [];
      const valid = rows.filter((product) => clean(product.code) && clean(product.name) && numeric(product.price) > 0).slice(0, 1500);
      if (!valid.length) return Response.json({ error: "No valid products found in this file." }, { status: 400 });
      const codes = new Set<string>();
      for (const product of valid) {
        const code = clean(product.code).toUpperCase();
        if (codes.has(code)) return Response.json({ error: `Duplicate Product Code in Excel: ${code}` }, { status: 400 });
        codes.add(code);
      }
      for (let i = 0; i < valid.length; i += 75) await env.DB.batch(valid.slice(i, i + 75).map(productUpsertStatement));
    } else if (action === "deleteProduct") {
      const id = clean(payload.id);
      const row = await env.DB.prepare("SELECT image_key AS imageKey FROM products WHERE id=?").bind(id).first<{ imageKey: string }>();
      await env.DB.prepare("DELETE FROM products WHERE id=?").bind(id).run();
      if (row?.imageKey) await env.FILES.delete(row.imageKey);
    } else if (action === "adjustStock") {
      const id = clean(payload.id);
      const parsedDelta = Number(payload.delta);
      const delta = Number.isFinite(parsedDelta) ? Math.trunc(parsedDelta) : 0;
      if (!id || delta === 0) return Response.json({ error: "Choose a product and stock quantity." }, { status: 400 });
      const result = await env.DB.prepare("UPDATE products SET stock_qty=MAX(0,stock_qty+?),updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(delta, id).run();
      if (!result.meta.changes) return Response.json({ error: "Product was not found." }, { status: 404 });
    } else if (action === "createBill") {
      const bill = payload.bill as Record<string, unknown>;
      const clientRequestId = clean(bill?.clientRequestId) || crypto.randomUUID();
      const existing = await env.DB.prepare("SELECT id FROM bills WHERE client_request_id=?").bind(clientRequestId).first();
      if (existing) return Response.json(await readState(), { headers: { "Cache-Control": "no-store" } });
      const customerName = clean(bill?.customerName);
      const customerPhone = clean(bill?.customerPhone);
      if (!customerName || !customerPhone) return Response.json({ error: "Customer name and phone number are required." }, { status: 400 });
      const rawItems = Array.isArray(bill?.items) ? bill.items as BillItemInput[] : [];
      const items = rawItems.map((item) => ({
        productId: clean(item.productId), code: clean(item.code).toUpperCase(), hsnCode: clean(item.hsnCode),
        name: clean(item.name), size: clean(item.size), woodType: clean(item.woodType),
        price: round2(numeric(item.price)), qty: Math.max(1, whole(item.qty, 1)), againstOrder: Boolean(item.againstOrder),
        orderType: item.againstOrder ? "Against Order" : "Stock",
        againstOrderExtra: item.againstOrder ? round2(numeric(item.againstOrderExtra)) : 0,
        customizeDetails: item.againstOrder ? clean(item.customizeDetails) : "",
      })).filter((item) => item.productId && item.name && item.price >= 0);
      if (!items.length) return Response.json({ error: "Add at least one product." }, { status: 400 });

      const setting = await env.DB.prepare(`SELECT gst_rate AS gstRate,bill_prefix AS billPrefix,
        default_counter AS defaultCounter FROM settings WHERE id=1`).first<{ gstRate: number; billPrefix: string; defaultCounter: string }>();
      const productTotal = round2(items.reduce((sum, item) => sum + item.price * item.qty, 0));
      const againstOrderExtra = round2(items.reduce((sum, item) => sum + item.againstOrderExtra, 0));
      const subtotal = round2(productTotal + againstOrderExtra);
      const discountType = clean(bill.discountType, "amount") === "percent" ? "percent" : "amount";
      const discountValue = numeric(bill.discountValue);
      const discount = round2(discountType === "percent" ? subtotal * Math.min(100, discountValue) / 100 : Math.min(subtotal, discountValue));
      const grandTotal = round2(Math.max(0, subtotal - discount));
      const gstRate = Math.max(0, Number(setting?.gstRate ?? 18));
      const taxableValue = gstRate > 0 ? round2(grandTotal / (1 + gstRate / 100)) : grandTotal;
      const gst = round2(grandTotal - taxableValue);
      const cgst = round2(gst / 2);
      const sgst = round2(gst - cgst);
      const paidAmount = round2(Math.min(grandTotal, numeric(bill.paidAmount)));
      const balanceAmount = round2(grandTotal - paidAmount);
      const paymentMode = clean(bill.paymentMode, "CASH").toUpperCase();
      const now = new Date();
      const history: PaymentRecord[] = paidAmount > 0 ? [{ id: uid("pay"), amount: paidAmount, mode: paymentMode, note: "Initial Payment", date: now.toISOString() }] : [];
      const counter = await env.DB.prepare("UPDATE counters SET value=value+1 WHERE key='bill' RETURNING value").first<{ value: number }>();
      const billNo = `${clean(setting?.billPrefix, "EXP").toUpperCase()}-${String(counter?.value || Date.now()).padStart(4, "0")}`;
      const inserted = await env.DB.prepare(`INSERT INTO bills
        (id,bill_no,client_request_id,customer_name,customer_phone,customer_address,items_json,staff_name,counter_name,
        product_total,against_order_extra,subtotal,discount_type,discount_value,discount,taxable_value,cgst,sgst,gst,
        grand_total,paid_amount,balance_amount,payment_mode,payment_history_json,delivery_date,delivery_status,status)
        SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
        WHERE NOT EXISTS (SELECT 1 FROM bills WHERE client_request_id=?)`)
        .bind(uid("bill"), billNo, clientRequestId, customerName, customerPhone, clean(bill.customerAddress), JSON.stringify(items),
          clean(bill.staffName), clean(bill.counterName, setting?.defaultCounter || "Counter 1"), productTotal,
          againstOrderExtra, subtotal, discountType, round2(discountValue), discount, taxableValue, cgst, sgst, gst,
          grandTotal, paidAmount, balanceAmount, paymentMode, JSON.stringify(history), clean(bill.deliveryDate), "Pending", "confirmed", clientRequestId).run();
      if (!inserted.meta.changes) return Response.json(await readState(), { headers: { "Cache-Control": "no-store" } });
    } else if (action === "cancelBill") {
      await env.DB.prepare("UPDATE bills SET status='cancelled' WHERE id=? AND status<>'cancelled'").bind(clean(payload.id)).run();
    } else if (action === "addPayment") {
      const id = clean(payload.id);
      const amount = round2(numeric(payload.amount));
      const bill = await env.DB.prepare(`SELECT grand_total AS grandTotal,paid_amount AS paidAmount,balance_amount AS balanceAmount,
        payment_history_json AS paymentHistoryJson,status FROM bills WHERE id=?`).bind(id).first<Record<string, unknown>>();
      if (!bill || bill.status === "cancelled") return Response.json({ error: "Cancelled bill cannot receive payment." }, { status: 400 });
      if (amount <= 0 || amount > Number(bill.balanceAmount) + 0.009) return Response.json({ error: "Payment must be above zero and cannot exceed the balance." }, { status: 400 });
      const history = safeJson<PaymentRecord[]>(bill.paymentHistoryJson, []);
      history.push({ id: uid("pay"), amount, mode: clean(payload.mode, "CASH").toUpperCase(), note: clean(payload.note), date: new Date().toISOString() });
      const paid = round2(Number(bill.paidAmount) + amount);
      await env.DB.prepare("UPDATE bills SET paid_amount=?,balance_amount=?,payment_history_json=? WHERE id=?")
        .bind(paid, round2(Number(bill.grandTotal) - paid), JSON.stringify(history), id).run();
    } else if (action === "updateBillDetails") {
      const value = payload.bill as Record<string, unknown>;
      if (!clean(value.customerName) || !clean(value.customerPhone)) return Response.json({ error: "Customer name and phone are required." }, { status: 400 });
      await env.DB.prepare(`UPDATE bills SET customer_name=?,customer_phone=?,customer_address=?,staff_name=?,counter_name=?,delivery_date=?
        WHERE id=? AND status<>'cancelled'`).bind(clean(value.customerName), clean(value.customerPhone), clean(value.customerAddress),
          clean(value.staffName), clean(value.counterName), clean(value.deliveryDate), clean(value.id)).run();
    } else if (action === "setDelivery") {
      const delivered = Boolean(payload.delivered);
      await env.DB.prepare("UPDATE bills SET delivery_status=?,delivered_at=? WHERE id=? AND status<>'cancelled'")
        .bind(delivered ? "Delivered" : "Pending", delivered ? new Date().toISOString() : "", clean(payload.id)).run();
    } else if (action === "saveSettings") {
      const value = payload.settings as Record<string, unknown>;
      const counters = cleanList(value.counterNames, ["Counter 1"]);
      const defaultCounter = clean(value.defaultCounter, counters[0] || "Counter 1");
      await env.DB.prepare(`UPDATE settings SET business_name=?,subtitle=?,gstin=?,phone=?,address=?,gst_rate=?,bill_prefix=?,
        staff_names_json=?,counter_names_json=?,default_counter=?,invoice_terms=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`)
        .bind(clean(value.businessName, "Furniture Expo"), clean(value.subtitle, "Live Billing Desk"), clean(value.gstin).toUpperCase(),
          clean(value.phone), clean(value.address), round2(numeric(value.gstRate, 18)), clean(value.billPrefix, "EXP").toUpperCase(),
          JSON.stringify(cleanList(value.staffNames)), JSON.stringify(counters.length ? counters : ["Counter 1"]), defaultCounter,
          clean(value.invoiceTerms, "Goods once sold cannot be returned without approval.")).run();
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    return Response.json(await readState());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save expo data";
    return Response.json({ error: message.includes("INSUFFICIENT_STOCK") ? "Stock changed at another counter. Refresh and try again." : message }, { status: 409 });
  }
}
