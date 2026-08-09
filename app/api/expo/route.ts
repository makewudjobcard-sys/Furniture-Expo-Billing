import { env } from "cloudflare:workers";

type ProductInput = {
  id?: string;
  code?: string;
  hsnCode?: string;
  name?: string;
  category?: string;
  size?: string;
  woodType?: string;
  price?: number;
  stockQty?: number;
  mrp?: number;
  notes?: string;
};

type BillItem = {
  productId: string;
  code: string;
  name: string;
  price: number;
  qty: number;
  againstOrder?: boolean;
};

const SAMPLE_PRODUCTS: ProductInput[] = [
  { code: "SOFA-001", hsnCode: "94016100", name: "3 Seater Fabric Sofa", category: "Sofa", size: "3 Seater", price: 55000, stockQty: 2, mrp: 65000 },
  { code: "WSOFA-001", hsnCode: "94016100", name: "Wooden Sofa", category: "Wooden Sofa", size: "3 Seater", woodType: "Teak Wood", price: 65000, stockQty: 1, mrp: 75000 },
  { code: "COT-001", hsnCode: "94035090", name: "King Size Cot", category: "Cot / Bed", size: "6 x 6.5 ft", woodType: "Teak Wood", price: 55000, stockQty: 5, mrp: 65000 },
  { code: "TEAPOY-001", hsnCode: "94036000", name: "Wooden Teapoy", category: "Teapoy", size: "48 x 24 inch", woodType: "Rosewood", price: 18000, stockQty: 2, mrp: 22000 },
  { code: "DCH-001", hsnCode: "94016900", name: "Dining Chair", category: "Dining Chair", size: "Standard", woodType: "Rubber Wood", price: 8500, stockQty: 6, mrp: 10000 },
  { code: "SCH-001", hsnCode: "94016900", name: "Suit Chair", category: "Suit Chair", size: "Standard", woodType: "Teak Wood", price: 12000, stockQty: 3, mrp: 14500 },
];

function clean(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

async function ensureSchema() {
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, hsn_code TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'Others', size TEXT NOT NULL DEFAULT '',
      wood_type TEXT NOT NULL DEFAULT '', price INTEGER NOT NULL DEFAULT 0,
      stock_qty INTEGER NOT NULL DEFAULT 0, mrp INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY, bill_no TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
      customer_phone TEXT NOT NULL DEFAULT '', customer_address TEXT NOT NULL DEFAULT '', items_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL, discount INTEGER NOT NULL DEFAULT 0, grand_total INTEGER NOT NULL,
      paid_amount INTEGER NOT NULL DEFAULT 0, balance_amount INTEGER NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'Cash', status TEXT NOT NULL DEFAULT 'confirmed',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), business_name TEXT NOT NULL DEFAULT 'Furniture Expo',
      subtitle TEXT NOT NULL DEFAULT 'Live Billing Desk', gstin TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '', gst_rate INTEGER NOT NULL DEFAULT 18,
      bill_prefix TEXT NOT NULL DEFAULT 'EXP', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC)"),
  ]);
  await db.prepare(`CREATE TRIGGER IF NOT EXISTS bill_stock_guard
    BEFORE INSERT ON bills
    BEGIN
      SELECT CASE WHEN EXISTS (
        SELECT 1 FROM json_each(NEW.items_json) item
        LEFT JOIN products p ON p.id = json_extract(item.value, '$.productId')
        WHERE COALESCE(json_extract(item.value, '$.againstOrder'), 0) = 0
          AND (p.id IS NULL OR p.stock_qty < CAST(json_extract(item.value, '$.qty') AS INTEGER))
      ) THEN RAISE(ABORT, 'INSUFFICIENT_STOCK') END;
      UPDATE products
      SET stock_qty = stock_qty - COALESCE((
        SELECT SUM(CAST(json_extract(item.value, '$.qty') AS INTEGER))
        FROM json_each(NEW.items_json) item
        WHERE json_extract(item.value, '$.productId') = products.id
          AND COALESCE(json_extract(item.value, '$.againstOrder'), 0) = 0
      ), 0), updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT json_extract(item.value, '$.productId') FROM json_each(NEW.items_json) item
        WHERE COALESCE(json_extract(item.value, '$.againstOrder'), 0) = 0
      );
    END`).run();
  await db.prepare(`CREATE TRIGGER IF NOT EXISTS bill_cancel_restore
    AFTER UPDATE OF status ON bills
    WHEN OLD.status <> 'cancelled' AND NEW.status = 'cancelled'
    BEGIN
      UPDATE products
      SET stock_qty = stock_qty + COALESCE((
        SELECT SUM(CAST(json_extract(item.value, '$.qty') AS INTEGER))
        FROM json_each(OLD.items_json) item
        WHERE json_extract(item.value, '$.productId') = products.id
          AND COALESCE(json_extract(item.value, '$.againstOrder'), 0) = 0
      ), 0), updated_at = CURRENT_TIMESTAMP
      WHERE id IN (
        SELECT json_extract(item.value, '$.productId') FROM json_each(OLD.items_json) item
        WHERE COALESCE(json_extract(item.value, '$.againstOrder'), 0) = 0
      );
    END`).run();
  await db.prepare(`INSERT OR IGNORE INTO settings (id, business_name, subtitle, gst_rate, bill_prefix)
    VALUES (1, 'Furniture Expo', 'Live Billing Desk', 18, 'EXP')`).run();
  await db.prepare("INSERT OR IGNORE INTO counters (key, value) VALUES ('bill', 0)").run();

  const count = await db.prepare("SELECT COUNT(*) AS count FROM products").first<{ count: number }>();
  if (!count?.count) {
    await db.batch(SAMPLE_PRODUCTS.map((product) => productUpsertStatement(product)));
  }
}

function productUpsertStatement(input: ProductInput) {
  const code = clean(input.code).toUpperCase();
  const id = clean(input.id) || `prd-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-") || crypto.randomUUID()}`;
  return env.DB.prepare(`INSERT INTO products
    (id, code, hsn_code, name, category, size, wood_type, price, stock_qty, mrp, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(code) DO UPDATE SET
      hsn_code=excluded.hsn_code, name=excluded.name, category=excluded.category,
      size=excluded.size, wood_type=excluded.wood_type, price=excluded.price,
      stock_qty=excluded.stock_qty, mrp=excluded.mrp, notes=excluded.notes,
      updated_at=CURRENT_TIMESTAMP`)
    .bind(id, code, clean(input.hsnCode), clean(input.name), clean(input.category, "Others"),
      clean(input.size), clean(input.woodType), number(input.price), number(input.stockQty),
      number(input.mrp), clean(input.notes));
}

async function readState() {
  const [products, bills, settings] = await Promise.all([
    env.DB.prepare(`SELECT id, code, hsn_code AS hsnCode, name, category, size,
      wood_type AS woodType, price, stock_qty AS stockQty, mrp, notes, updated_at AS updatedAt
      FROM products ORDER BY category, name`).all(),
    env.DB.prepare(`SELECT id, bill_no AS billNo, customer_name AS customerName,
      customer_phone AS customerPhone, customer_address AS customerAddress,
      items_json AS itemsJson, subtotal, discount, grand_total AS grandTotal,
      paid_amount AS paidAmount, balance_amount AS balanceAmount, payment_mode AS paymentMode,
      status, created_at AS createdAt FROM bills ORDER BY created_at DESC LIMIT 300`).all(),
    env.DB.prepare(`SELECT business_name AS businessName, subtitle, gstin, phone, address,
      gst_rate AS gstRate, bill_prefix AS billPrefix, updated_at AS updatedAt
      FROM settings WHERE id=1`).first(),
  ]);
  return {
    products: products.results,
    bills: bills.results.map((bill) => ({
      ...bill,
      items: JSON.parse(String((bill as Record<string, unknown>).itemsJson || "[]")),
      itemsJson: undefined,
    })),
    settings,
    syncedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    await ensureSchema();
    return Response.json(await readState(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load expo data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const payload = await request.json() as Record<string, unknown>;
    const action = clean(payload.action);

    if (action === "saveProduct") {
      const product = payload.product as ProductInput;
      if (!clean(product?.code) || !clean(product?.name) || number(product?.price) <= 0) {
        return Response.json({ error: "Product code, name and expo price are required." }, { status: 400 });
      }
      await productUpsertStatement(product).run();
    } else if (action === "importProducts") {
      const rows = Array.isArray(payload.products) ? payload.products as ProductInput[] : [];
      const valid = rows.filter((product) => clean(product.code) && clean(product.name) && number(product.price) > 0).slice(0, 1000);
      if (!valid.length) return Response.json({ error: "No valid products found in this file." }, { status: 400 });
      const chunkSize = 75;
      for (let i = 0; i < valid.length; i += chunkSize) {
        await env.DB.batch(valid.slice(i, i + chunkSize).map(productUpsertStatement));
      }
    } else if (action === "deleteProduct") {
      await env.DB.prepare("DELETE FROM products WHERE id=?").bind(clean(payload.id)).run();
    } else if (action === "createBill") {
      const bill = payload.bill as Record<string, unknown>;
      const items = Array.isArray(bill?.items) ? bill.items as BillItem[] : [];
      if (!items.length) return Response.json({ error: "Add at least one product." }, { status: 400 });
      const counter = await env.DB.prepare("UPDATE counters SET value=value+1 WHERE key='bill' RETURNING value").first<{ value: number }>();
      const settings = await env.DB.prepare("SELECT bill_prefix AS billPrefix FROM settings WHERE id=1").first<{ billPrefix: string }>();
      const billNo = `${settings?.billPrefix || "EXP"}-${String(counter?.value || Date.now()).padStart(4, "0")}`;
      await env.DB.prepare(`INSERT INTO bills
        (id, bill_no, customer_name, customer_phone, customer_address, items_json,
        subtotal, discount, grand_total, paid_amount, balance_amount, payment_mode, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`)
        .bind(uid("bill"), billNo, clean(bill.customerName, "Walk-in Customer") || "Walk-in Customer",
          clean(bill.customerPhone), clean(bill.customerAddress), JSON.stringify(items),
          number(bill.subtotal), number(bill.discount), number(bill.grandTotal),
          number(bill.paidAmount), number(bill.balanceAmount), clean(bill.paymentMode, "Cash")).run();
    } else if (action === "cancelBill") {
      await env.DB.prepare("UPDATE bills SET status='cancelled' WHERE id=? AND status<>'cancelled'").bind(clean(payload.id)).run();
    } else if (action === "addPayment") {
      const id = clean(payload.id);
      const amount = number(payload.amount);
      await env.DB.prepare(`UPDATE bills SET paid_amount=MIN(grand_total, paid_amount+?),
        balance_amount=MAX(0, grand_total-(paid_amount+?)) WHERE id=? AND status<>'cancelled'`)
        .bind(amount, amount, id).run();
    } else if (action === "saveSettings") {
      const value = payload.settings as Record<string, unknown>;
      await env.DB.prepare(`UPDATE settings SET business_name=?, subtitle=?, gstin=?, phone=?, address=?,
        gst_rate=?, bill_prefix=?, updated_at=CURRENT_TIMESTAMP WHERE id=1`)
        .bind(clean(value.businessName, "Furniture Expo"), clean(value.subtitle, "Live Billing Desk"),
          clean(value.gstin), clean(value.phone), clean(value.address), number(value.gstRate, 18),
          clean(value.billPrefix, "EXP").toUpperCase()).run();
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }

    return Response.json(await readState());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save expo data";
    const friendly = message.includes("INSUFFICIENT_STOCK")
      ? "Stock changed at another counter. Refresh and try again."
      : message;
    return Response.json({ error: friendly }, { status: 409 });
  }
}
