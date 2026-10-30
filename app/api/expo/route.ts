import { env } from "../../lib/runtime";
import { getSessionUser, isAuthenticated, unauthorized, type AppUser } from "../../lib/auth";

type ProductInput = {
  id?: string; code?: string; hsnCode?: string; name?: string; category?: string;
  size?: string; woodType?: string; price?: number; stockQty?: number; mrp?: number;
  notes?: string; imageKey?: string;
};

type BillItemInput = {
  productId?: string; code?: string; hsnCode?: string; name?: string; size?: string;
  woodType?: string; price?: number; qty?: number; againstOrder?: boolean;
  againstOrderExtra?: number; customizeDetails?: string; imageKey?: string; imageUrl?: string;
};

type PaymentRecord = { id: string; amount: number; mode: string; note: string; date: string };
type SupplierInput = { id?: string; name?: string; contactPerson?: string; phone?: string; gstin?: string; address?: string; categories?: string; bankDetails?: string; notes?: string; status?: string };
type TaskInput = {
  id?: string; category?: string; title?: string; details?: string; assignedTo?: string;
  dueDate?: string; priority?: string; status?: string; linkedBillId?: string; linkedCustomerPhone?: string;
  customerName?: string; customerPhone?: string; enquiredProducts?: string; attendedBy?: string;
  commitmentDate?: string; notes?: string; completionReason?: string;
};
type InteractionInput = { id?: string; customerName?: string; customerPhone?: string; type?: string; details?: string; assignedTo?: string; nextFollowUp?: string; status?: string; billId?: string };
type AssignmentInput = { id?: string; billId?: string; billNo?: string; productId?: string; productCode?: string; productName?: string; qty?: number; supplierId?: string; purchaseCost?: number; advancePaid?: number; expectedDate?: string; status?: string; notes?: string };
type LeadInput = { id?: string; customerName?: string; phone?: string; source?: string; interest?: string; assignedTo?: string; followUpDate?: string; status?: string; notes?: string };
type JobCardInput = { id?: string; jobNo?: string; customerName?: string; phone?: string; billId?: string; measurements?: string; woodMaterial?: string; fabric?: string; foam?: string; polish?: string; referenceImages?: string[]; estimatedCost?: number; assignedTo?: string; expectedDate?: string; stage?: string; notes?: string };

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
function moneyForTask(value: number) { return `₹${round2(value).toLocaleString("en-IN")}`; }
function uid(prefix: string) { return `${prefix}-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`; }
function safeJson<T>(value: unknown, fallback: T): T { try { return typeof value === "string" ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function cleanList(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return [...new Set(value.map((item) => clean(item)).filter(Boolean))].slice(0, 100);
}

async function ensureColumn(table: "products" | "bills" | "settings" | "tasks", column: string, definition: string) {
  const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if (!info.results.some((item: { name: string }) => item.name === column)) {
    await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

async function ensureSchema() {
  const db = env.DB;
  if (db.dialect === "postgres") {
    await db.ensureSchema();
    await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL DEFAULT '',
      entity_id TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'Walk-in',
      interest TEXT NOT NULL DEFAULT '', assigned_to TEXT NOT NULL DEFAULT '', follow_up_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New', notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS job_cards (
      id TEXT PRIMARY KEY, job_no TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
      bill_id TEXT NOT NULL DEFAULT '', measurements TEXT NOT NULL DEFAULT '', wood_material TEXT NOT NULL DEFAULT '',
      fabric TEXT NOT NULL DEFAULT '', foam TEXT NOT NULL DEFAULT '', polish TEXT NOT NULL DEFAULT '',
      reference_images_json TEXT NOT NULL DEFAULT '[]', estimated_cost REAL NOT NULL DEFAULT 0,
      assigned_to TEXT NOT NULL DEFAULT '', expected_date TEXT NOT NULL DEFAULT '', stage TEXT NOT NULL DEFAULT 'New',
      notes TEXT NOT NULL DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS held_orders (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS stock_verifications (
      id TEXT PRIMARY KEY, checked_by TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', lines_json TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_job_cards_expected ON job_cards(expected_date)"),
    db.prepare("ALTER TABLE bills ADD COLUMN IF NOT EXISTS client_key TEXT NOT NULL DEFAULT 'SHF'"),
    db.prepare("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT ''"),
    db.prepare("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT ''"),
    db.prepare("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS enquired_products TEXT NOT NULL DEFAULT ''"),
    db.prepare("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attended_by TEXT NOT NULL DEFAULT ''"),
    db.prepare("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS commitment_date TEXT NOT NULL DEFAULT ''"),
    db.prepare("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''"),
    db.prepare("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_reason TEXT NOT NULL DEFAULT ''"),
    ]);
    await db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)").run();
    await db.prepare(`INSERT OR IGNORE INTO settings (id,business_name,subtitle,gst_rate,bill_prefix) VALUES (1,'Smaarthome Furniture','Showroom Billing & Operations',18,'SHF')`).run();
    await db.prepare(`UPDATE settings SET business_name='Smaarthome Furniture',subtitle='Showroom Billing & Operations',bill_prefix=CASE WHEN bill_prefix='EXP' THEN 'SHF' ELSE bill_prefix END WHERE business_name='Furniture Expo'`).run();
    await db.prepare("INSERT OR IGNORE INTO counters (key,value) VALUES ('bill',0)").run();
    const count = await db.prepare("SELECT COUNT(*) AS count FROM products").first<{ count: number }>();
    if (!Number(count?.count || 0)) await db.batch(SAMPLE_PRODUCTS.map(productUpsertStatement));
    return;
  }
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
      against_order_extra REAL NOT NULL DEFAULT 0, card_charge REAL NOT NULL DEFAULT 0,
      transport_charge REAL NOT NULL DEFAULT 0, other_charge REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL, discount_type TEXT NOT NULL DEFAULT 'amount',
      discount_value REAL NOT NULL DEFAULT 0, discount REAL NOT NULL DEFAULT 0, taxable_value REAL NOT NULL DEFAULT 0,
      cgst REAL NOT NULL DEFAULT 0, sgst REAL NOT NULL DEFAULT 0, gst REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL, paid_amount REAL NOT NULL DEFAULT 0, balance_amount REAL NOT NULL DEFAULT 0,
      payment_mode TEXT NOT NULL DEFAULT 'CASH', payment_history_json TEXT NOT NULL DEFAULT '[]',
      delivery_date TEXT NOT NULL DEFAULT '', delivery_status TEXT NOT NULL DEFAULT 'Pending', delivered_at TEXT NOT NULL DEFAULT '',
      order_notes TEXT NOT NULL DEFAULT '', accountant_name TEXT NOT NULL DEFAULT '', manager_name TEXT NOT NULL DEFAULT '',
      document_type TEXT NOT NULL DEFAULT 'order_slip',
      status TEXT NOT NULL DEFAULT 'confirmed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1), business_name TEXT NOT NULL DEFAULT 'Smaarthome Furniture',
      subtitle TEXT NOT NULL DEFAULT 'Showroom Billing & Operations', gstin TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '', gst_rate REAL NOT NULL DEFAULT 18, bill_prefix TEXT NOT NULL DEFAULT 'SHF',
      staff_names_json TEXT NOT NULL DEFAULT '[]', counter_names_json TEXT NOT NULL DEFAULT '["Counter 1"]',
      default_counter TEXT NOT NULL DEFAULT 'Counter 1', invoice_terms TEXT NOT NULL DEFAULT 'Goods once sold cannot be returned without approval.',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_type TEXT NOT NULL DEFAULT '',
      entity_id TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY, customer_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'Walk-in',
      interest TEXT NOT NULL DEFAULT '', assigned_to TEXT NOT NULL DEFAULT '', follow_up_date TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New', notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS job_cards (
      id TEXT PRIMARY KEY, job_no TEXT NOT NULL UNIQUE, customer_name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
      bill_id TEXT NOT NULL DEFAULT '', measurements TEXT NOT NULL DEFAULT '', wood_material TEXT NOT NULL DEFAULT '',
      fabric TEXT NOT NULL DEFAULT '', foam TEXT NOT NULL DEFAULT '', polish TEXT NOT NULL DEFAULT '',
      reference_images_json TEXT NOT NULL DEFAULT '[]', estimated_cost REAL NOT NULL DEFAULT 0,
      assigned_to TEXT NOT NULL DEFAULT '', expected_date TEXT NOT NULL DEFAULT '', stage TEXT NOT NULL DEFAULT 'New',
      notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS held_orders (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, payload_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS stock_verifications (
      id TEXT PRIMARY KEY, checked_by TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '', lines_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_date)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_job_cards_expected ON job_cards(expected_date)"),
  ]);

  const additions: Array<["products" | "bills" | "settings" | "tasks", string, string]> = [
    ["products", "image_key", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "client_request_id", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "client_key", "TEXT NOT NULL DEFAULT 'SHF'"],
    ["bills", "staff_name", "TEXT NOT NULL DEFAULT ''"], ["bills", "counter_name", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "product_total", "REAL NOT NULL DEFAULT 0"], ["bills", "against_order_extra", "REAL NOT NULL DEFAULT 0"],
    ["bills", "card_charge", "REAL NOT NULL DEFAULT 0"], ["bills", "transport_charge", "REAL NOT NULL DEFAULT 0"],
    ["bills", "other_charge", "REAL NOT NULL DEFAULT 0"],
    ["bills", "discount_type", "TEXT NOT NULL DEFAULT 'amount'"], ["bills", "discount_value", "REAL NOT NULL DEFAULT 0"],
    ["bills", "taxable_value", "REAL NOT NULL DEFAULT 0"], ["bills", "cgst", "REAL NOT NULL DEFAULT 0"],
    ["bills", "sgst", "REAL NOT NULL DEFAULT 0"], ["bills", "gst", "REAL NOT NULL DEFAULT 0"],
    ["bills", "payment_history_json", "TEXT NOT NULL DEFAULT '[]'"], ["bills", "delivery_date", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "delivery_status", "TEXT NOT NULL DEFAULT 'Pending'"], ["bills", "delivered_at", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "order_notes", "TEXT NOT NULL DEFAULT ''"], ["bills", "accountant_name", "TEXT NOT NULL DEFAULT ''"],
    ["bills", "manager_name", "TEXT NOT NULL DEFAULT ''"], ["bills", "document_type", "TEXT NOT NULL DEFAULT 'order_slip'"],
    ["settings", "staff_names_json", "TEXT NOT NULL DEFAULT '[]'"],
    ["settings", "counter_names_json", "TEXT NOT NULL DEFAULT '[\"Counter 1\"]'"],
    ["settings", "default_counter", "TEXT NOT NULL DEFAULT 'Counter 1'"],
    ["settings", "invoice_terms", "TEXT NOT NULL DEFAULT 'Goods once sold cannot be returned without approval.'"],
    ["tasks", "customer_name", "TEXT NOT NULL DEFAULT ''"], ["tasks", "customer_phone", "TEXT NOT NULL DEFAULT ''"],
    ["tasks", "enquired_products", "TEXT NOT NULL DEFAULT ''"], ["tasks", "attended_by", "TEXT NOT NULL DEFAULT ''"],
    ["tasks", "commitment_date", "TEXT NOT NULL DEFAULT ''"], ["tasks", "notes", "TEXT NOT NULL DEFAULT ''"],
    ["tasks", "completion_reason", "TEXT NOT NULL DEFAULT ''"],
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
  await db.prepare(`INSERT OR IGNORE INTO settings (id,business_name,subtitle,gst_rate,bill_prefix) VALUES (1,'Smaarthome Furniture','Showroom Billing & Operations',18,'SHF')`).run();
  await db.prepare(`UPDATE settings SET business_name='Smaarthome Furniture',subtitle='Showroom Billing & Operations',bill_prefix=CASE WHEN bill_prefix='EXP' THEN 'SHF' ELSE bill_prefix END WHERE business_name='Furniture Expo'`).run();
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

async function readState(scopeKey = "all") {
  const [productRows, billRows, settingRow, supplierRows, taskRows, interactionRows, assignmentRows, auditRows, leadRows, jobRows, heldRows, verificationRows] = await Promise.all([
    env.DB.prepare(`SELECT id,code,hsn_code AS hsnCode,name,category,size,wood_type AS woodType,price,
      stock_qty AS stockQty,mrp,notes,image_key AS imageKey,updated_at AS updatedAt FROM products ORDER BY category,name`).all(),
    env.DB.prepare(`SELECT id,bill_no AS billNo,customer_name AS customerName,customer_phone AS customerPhone,
      customer_address AS customerAddress,items_json AS itemsJson,staff_name AS staffName,counter_name AS counterName,
      product_total AS productTotal,against_order_extra AS againstOrderExtra,card_charge AS cardCharge,
      transport_charge AS transportCharge,other_charge AS otherCharge,subtotal,discount_type AS discountType,
      discount_value AS discountValue,discount,taxable_value AS taxableValue,cgst,sgst,gst,grand_total AS grandTotal,
      paid_amount AS paidAmount,balance_amount AS balanceAmount,payment_mode AS paymentMode,
      payment_history_json AS paymentHistoryJson,client_request_id AS clientRequestId,delivery_date AS deliveryDate,delivery_status AS deliveryStatus,
      delivered_at AS deliveredAt,order_notes AS orderNotes,accountant_name AS accountantName,
      manager_name AS managerName,document_type AS documentType,client_key AS clientKey,status,created_at AS createdAt
      FROM bills ${scopeKey === "all" ? "" : "WHERE client_key=?"} ORDER BY created_at DESC LIMIT 1000`).bind(...(scopeKey === "all" ? [] : [scopeKey])).all(),
    env.DB.prepare(`SELECT business_name AS businessName,subtitle,gstin,phone,address,gst_rate AS gstRate,
      bill_prefix AS billPrefix,staff_names_json AS staffNamesJson,counter_names_json AS counterNamesJson,
      default_counter AS defaultCounter,invoice_terms AS invoiceTerms,updated_at AS updatedAt FROM settings WHERE id=1`).first(),
    env.DB.prepare(`SELECT id,name,contact_person AS contactPerson,phone,gstin,address,categories,bank_details AS bankDetails,
      notes,status,created_at AS createdAt,updated_at AS updatedAt FROM suppliers ORDER BY name`).all(),
    env.DB.prepare(`SELECT id,category,title,details,assigned_to AS assignedTo,due_date AS dueDate,priority,status,
      linked_bill_id AS linkedBillId,linked_customer_phone AS linkedCustomerPhone,customer_name AS customerName,
      customer_phone AS customerPhone,enquired_products AS enquiredProducts,attended_by AS attendedBy,
      commitment_date AS commitmentDate,notes,completion_reason AS completionReason,created_at AS createdAt,
      updated_at AS updatedAt FROM tasks ORDER BY CASE status WHEN 'Completed' THEN 1 ELSE 0 END,due_date,created_at DESC`).all(),
    env.DB.prepare(`SELECT id,customer_name AS customerName,customer_phone AS customerPhone,type,details,
      assigned_to AS assignedTo,next_follow_up AS nextFollowUp,status,bill_id AS billId,created_at AS createdAt,
      updated_at AS updatedAt FROM customer_interactions ORDER BY CASE status WHEN 'Closed' THEN 1 ELSE 0 END,next_follow_up,created_at DESC`).all(),
    env.DB.prepare(`SELECT id,bill_id AS billId,bill_no AS billNo,product_id AS productId,product_code AS productCode,
      product_name AS productName,qty,supplier_id AS supplierId,purchase_cost AS purchaseCost,advance_paid AS advancePaid,
      expected_date AS expectedDate,status,notes,created_at AS createdAt,updated_at AS updatedAt
      FROM supplier_assignments ORDER BY CASE status WHEN 'Closed' THEN 1 ELSE 0 END,expected_date,created_at DESC`).all(),
    env.DB.prepare(`SELECT id,action,entity_type AS entityType,entity_id AS entityId,summary,created_at AS createdAt
      FROM audit_logs ORDER BY created_at DESC LIMIT 250`).all(),
    env.DB.prepare(`SELECT id,customer_name AS customerName,phone,source,interest,assigned_to AS assignedTo,
      follow_up_date AS followUpDate,status,notes,created_at AS createdAt,updated_at AS updatedAt
      FROM leads ORDER BY CASE status WHEN 'Won' THEN 2 WHEN 'Lost' THEN 2 ELSE 0 END,follow_up_date,created_at DESC`).all(),
    env.DB.prepare(`SELECT id,job_no AS jobNo,customer_name AS customerName,phone,bill_id AS billId,measurements,
      wood_material AS woodMaterial,fabric,foam,polish,reference_images_json AS referenceImagesJson,
      estimated_cost AS estimatedCost,assigned_to AS assignedTo,expected_date AS expectedDate,stage,notes,
      created_at AS createdAt,updated_at AS updatedAt FROM job_cards ORDER BY expected_date,created_at DESC`).all(),
    env.DB.prepare(`SELECT id,name,payload_json AS payloadJson,created_at AS createdAt,updated_at AS updatedAt
      FROM held_orders ORDER BY updated_at DESC`).all(),
    env.DB.prepare(`SELECT id,checked_by AS checkedBy,notes,lines_json AS linesJson,created_at AS createdAt
      FROM stock_verifications ORDER BY created_at DESC LIMIT 50`).all(),
  ]);
  const products = productRows.results.map((row: Record<string, unknown>) => ({ ...row, imageUrl: row.imageKey ? `/api/images/${encodeURIComponent(String(row.imageKey))}` : "" }));
  const gstRate = Number((settingRow as Record<string, unknown> | null)?.gstRate ?? 18);
  const bills = billRows.results.map((row: Record<string, unknown>) => {
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
  return {
    products,
    bills,
    settings,
    suppliers: supplierRows.results,
    tasks: taskRows.results,
    interactions: interactionRows.results,
    supplierAssignments: assignmentRows.results,
    auditLogs: auditRows.results,
    leads: leadRows.results,
    jobCards: jobRows.results.map((row: Record<string, unknown>) => ({ ...row, referenceImages: safeJson(row.referenceImagesJson, []), referenceImagesJson: undefined })),
    heldOrders: heldRows.results.map((row: Record<string, unknown>) => ({ ...row, payload: safeJson(row.payloadJson, {}), payloadJson: undefined })),
    stockVerifications: verificationRows.results.map((row: Record<string, unknown>) => ({ ...row, lines: safeJson(row.linesJson, []), linesJson: undefined })),
    syncedAt: new Date().toISOString(),
  };
}

function auditDescription(action: string, payload: Record<string, unknown>) {
  const bill = (payload.bill || {}) as Record<string, unknown>;
  const product = (payload.product || {}) as Record<string, unknown>;
  const task = (payload.task || {}) as Record<string, unknown>;
  const interaction = (payload.interaction || {}) as Record<string, unknown>;
  const lead = (payload.lead || {}) as Record<string, unknown>;
  const jobCard = (payload.jobCard || {}) as Record<string, unknown>;
  const heldOrder = (payload.heldOrder || {}) as Record<string, unknown>;
  const labels: Record<string, string> = {
    createBill: `Order saved for ${clean(bill.customerName, "customer")}`,
    updateBill: `Order details updated`, updateBillDetails: `Order details updated`, removeBillItem: `Product removed from order`, addPayment: `Payment recorded`, cancelBill: `Order cancelled`,
    setDelivery: `Delivery completion changed`, setDeliveryStatus: `Delivery moved to ${clean(payload.deliveryStatus, "new status")}`,
    saveProduct: `Product ${clean(product.code)} saved`, deleteProduct: `Product removed`, adjustStock: `Stock quantity adjusted`,
    saveTask: `Task ${clean(task.title)} saved`, deleteTask: `Task removed`,
    saveInteraction: `${clean(interaction.type, "Customer activity")} saved`, deleteInteraction: `Customer activity removed`,
    saveSupplier: `Supplier saved`, deleteSupplier: `Supplier removed`, saveSupplierAssignments: `Supplier assignment updated`,
    deleteSupplierAssignment: `Supplier assignment removed`, saveSettings: `Showroom settings updated`,
    saveLead: `Lead ${clean(lead.customerName, "customer")} saved`, deleteLead: `Lead removed`,
    saveJobCard: `Job card ${clean(jobCard.jobNo, "custom work")} saved`, deleteJobCard: `Job card removed`,
    saveHeldOrder: `Bill held as ${clean(heldOrder.name, "draft")}`, deleteHeldOrder: `Held bill removed`,
    saveStockVerification: `Physical stock verification completed`,
  };
  const entityType = action.toLowerCase().includes("bill") || action.startsWith("setDelivery") || action === "addPayment" ? "order"
    : action.toLowerCase().includes("product") || action === "adjustStock" ? "product"
      : action.toLowerCase().includes("task") ? "task"
        : action.toLowerCase().includes("interaction") ? "customer"
          : action.toLowerCase().includes("lead") ? "lead"
            : action.toLowerCase().includes("jobcard") ? "job-card"
              : action.toLowerCase().includes("heldorder") ? "held-order"
                : action === "saveStockVerification" ? "stock-check"
          : action.toLowerCase().includes("supplier") ? "supplier" : "settings";
  const entityId = clean(payload.id) || clean(bill.id) || clean(product.id) || clean(task.id) || clean(interaction.id) || clean(lead.id) || clean(jobCard.id) || clean(heldOrder.id);
  return { entityType, entityId, summary: labels[action] || `${action} completed` };
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user || !await isAuthenticated(request)) return unauthorized();
  try { await ensureSchema(); return Response.json(await readState(user.role === "md" ? "all" : user.clientKey), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Unable to load expo data" }, { status: 500 }); }
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user || !await isAuthenticated(request)) return unauthorized();
  try {
    await ensureSchema();
    const payload = await request.json() as Record<string, unknown>;
    const action = clean(payload.action);
    if (["updateBillDetails", "removeBillItem", "cancelBill"].includes(action) && user.role !== "md") {
      return Response.json({ error: "MD approval required. Ask Managing Director to sign in and approve this bill change." }, { status: 403 });
    }
    if (["resetDemoWorkspace", "saveSettings"].includes(action) && user.role !== "md") {
      return Response.json({ error: "Only Managing Director can change showroom-wide settings." }, { status: 403 });
    }

    if (action === "clearShowroomRecords") {
      if (user.role !== "md" || clean(payload.confirmation) !== "CLEAR_SHOWROOM_RECORDS_2026") {
        return Response.json({ error: "Managing Director confirmation is required." }, { status: 403 });
      }
      await env.DB.batch([
        env.DB.prepare("DELETE FROM supplier_assignments WHERE 1=1"),
        env.DB.prepare("DELETE FROM customer_interactions WHERE 1=1"),
        env.DB.prepare("DELETE FROM tasks WHERE 1=1"),
        env.DB.prepare("DELETE FROM held_orders WHERE 1=1"),
        env.DB.prepare("UPDATE bills SET status='cancelled' WHERE status<>'cancelled'"),
        env.DB.prepare("DELETE FROM bills WHERE 1=1"),
        env.DB.prepare("DELETE FROM counters WHERE 1=1"),
      ]);
      return Response.json(await readState("all"), { headers: { "Cache-Control": "no-store" } });
    }

    if (action === "resetDemoWorkspace") {
      const runtime = env as typeof env & { APP_SESSION_SECRET?: string };
      if (!runtime.APP_SESSION_SECRET || clean(payload.confirmation) !== runtime.APP_SESSION_SECRET) {
        return Response.json({ error: "Reset authorization failed." }, { status: 403 });
      }
      await env.DB.batch([
        env.DB.prepare("DELETE FROM supplier_assignments WHERE 1=1"),
        env.DB.prepare("DELETE FROM customer_interactions WHERE 1=1"),
        env.DB.prepare("DELETE FROM tasks WHERE 1=1"),
        // Cancelling first lets the stock restoration trigger reverse every
        // ready-stock sample sale before its historical row is removed.
        env.DB.prepare("UPDATE bills SET status='cancelled' WHERE status<>'cancelled'"),
        env.DB.prepare("DELETE FROM bills WHERE 1=1"),
        env.DB.prepare("UPDATE counters SET value=0 WHERE key='bill'"),
      ]);
    } else if (action === "saveProduct") {
      const product = payload.product as ProductInput;
      if (!clean(product?.code) || !clean(product?.name) || numeric(product?.price) <= 0) {
        return Response.json({ error: "Product code, name and showroom price are required." }, { status: 400 });
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
      if (user.role === "md") return Response.json({ error: "Managing Director login is view-only. Use a showroom login to create a new order." }, { status: 403 });
      const bill = payload.bill as Record<string, unknown>;
      const clientRequestId = clean(bill?.clientRequestId) || crypto.randomUUID();
      const existing = await env.DB.prepare("SELECT id FROM bills WHERE client_request_id=?").bind(clientRequestId).first();
      if (existing) return Response.json(await readState(user.clientKey), { headers: { "Cache-Control": "no-store" } });
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
        imageKey: clean(item.imageKey), imageUrl: clean(item.imageUrl),
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
      const goodsTotal = round2(Math.max(0, subtotal - discount));
      const paymentMode = clean(bill.paymentMode, "CASH").toUpperCase();
      const cardCharge = paymentMode === "CARD" ? round2(numeric(bill.cardCharge)) : 0;
      const transportCharge = round2(numeric(bill.transportCharge));
      const otherCharge = round2(numeric(bill.otherCharge));
      const grandTotal = round2(goodsTotal + cardCharge + transportCharge + otherCharge);
      const gstRate = Math.max(0, Number(setting?.gstRate ?? 18));
      const taxableValue = gstRate > 0 ? round2(goodsTotal / (1 + gstRate / 100)) : goodsTotal;
      const gst = round2(goodsTotal - taxableValue);
      const cgst = round2(gst / 2);
      const sgst = round2(gst - cgst);
      const paidAmount = round2(Math.min(grandTotal, numeric(bill.paidAmount)));
      const balanceAmount = round2(grandTotal - paidAmount);
      const now = new Date();
      const history: PaymentRecord[] = paidAmount > 0 ? [{ id: uid("pay"), amount: paidAmount, mode: paymentMode, note: "Initial Payment", date: now.toISOString() }] : [];
      // `first()` uses the read/query RPC, which wraps SQL in a SELECT. An
      // UPDATE ... RETURNING statement cannot be used inside that wrapper and
      // fails in Postgres with `syntax error at or near "SET"`. Keep the
      // counter write on the exec RPC, then read its value with a real SELECT.
      const billPrefix = user.role === "client" ? user.clientKey.toUpperCase() : clean(setting?.billPrefix, "SHF").toUpperCase();
      const counterKey = `bill_${billPrefix}`;
      await env.DB.prepare("INSERT OR IGNORE INTO counters (key,value) VALUES (?,0)").bind(counterKey).run();
      await env.DB.prepare("UPDATE counters SET value=value+1 WHERE key=?").bind(counterKey).run();
      const counter = await env.DB.prepare("SELECT value FROM counters WHERE key=?").bind(counterKey).first<{ value: number }>();
      const billNo = `${billPrefix}-${String(counter?.value || Date.now()).padStart(2, "0")}`;
      const billId = uid("bill");
      const columns = `id,bill_no,client_request_id,client_key,customer_name,customer_phone,customer_address,items_json,staff_name,counter_name,
        product_total,against_order_extra,card_charge,transport_charge,other_charge,subtotal,discount_type,discount_value,
        discount,taxable_value,cgst,sgst,gst,grand_total,paid_amount,balance_amount,payment_mode,payment_history_json,
        delivery_date,delivery_status,order_notes,accountant_name,manager_name,document_type,status`;
      const inserted = await env.DB.prepare(`INSERT INTO bills (${columns})
        SELECT ${Array.from({ length: 35 }, () => "?").join(",")}
        WHERE NOT EXISTS (SELECT 1 FROM bills WHERE client_request_id=?)`)
        .bind(billId, billNo, clientRequestId, user.role === "client" ? user.clientKey : "SHF", customerName, customerPhone, clean(bill.customerAddress), JSON.stringify(items),
          clean(bill.staffName), clean(bill.counterName, setting?.defaultCounter || "Counter 1"), productTotal,
          againstOrderExtra, cardCharge, transportCharge, otherCharge, subtotal, discountType, round2(discountValue),
          discount, taxableValue, cgst, sgst, gst, grandTotal, paidAmount, balanceAmount, paymentMode, JSON.stringify(history),
          clean(bill.deliveryDate), "Order Booked", clean(bill.orderNotes), clean(bill.accountantName), clean(bill.managerName),
          "order_slip", "confirmed", clientRequestId).run();
      if (!inserted.meta.changes) return Response.json(await readState(user.clientKey), { headers: { "Cache-Control": "no-store" } });
      const deliveryDate = clean(bill.deliveryDate);
      const followUpDate = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
      const followUpStatements = [
        env.DB.prepare(`INSERT INTO customer_interactions
          (id,customer_name,customer_phone,type,details,assigned_to,next_follow_up,status,bill_id,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
          .bind(uid("crm"), customerName, customerPhone, "Order Follow-up", `Confirm order and delivery details for ${billNo}.`, clean(bill.staffName), followUpDate, "Open", billId),
      ];
      if (deliveryDate) followUpStatements.push(env.DB.prepare(`INSERT INTO tasks
        (id,category,title,details,assigned_to,due_date,priority,status,linked_bill_id,linked_customer_phone,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
        .bind(uid("task"), "Delivery", `Deliver ${billNo} to ${customerName}`, "Confirm readiness, transport and customer availability.", clean(bill.staffName), deliveryDate, "High", "Pending", billId, customerPhone));
      if (balanceAmount > 0) followUpStatements.push(env.DB.prepare(`INSERT INTO tasks
        (id,category,title,details,assigned_to,due_date,priority,status,linked_bill_id,linked_customer_phone,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
        .bind(uid("task"), "Financial", `Collect ${moneyForTask(balanceAmount)} balance · ${billNo}`, "Collect the pending amount before delivery.", clean(bill.accountantName), deliveryDate || followUpDate, "High", "Pending", billId, customerPhone));
      try {
        await env.DB.batch(followUpStatements);
      } catch (automationError) {
        console.error("Order saved but follow-up automation failed", automationError);
      }
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
    } else if (action === "removeBillItem") {
      const id = clean(payload.id);
      const itemIndex = Math.trunc(numeric(payload.itemIndex, -1));
      const bill = await env.DB.prepare(`SELECT bill_no AS billNo,items_json AS itemsJson,status,discount_type AS discountType,
        discount_value AS discountValue,card_charge AS cardCharge,transport_charge AS transportCharge,
        other_charge AS otherCharge,paid_amount AS paidAmount FROM bills WHERE id=?`).bind(id).first<Record<string, unknown>>();
      if (!bill || bill.status === "cancelled") return Response.json({ error: "Cancelled or missing order cannot be edited." }, { status: 400 });
      const items = safeJson<BillItemInput[]>(bill.itemsJson, []);
      if (items.length <= 1) return Response.json({ error: "An order must keep at least one product. Cancel the order if it is fully incorrect." }, { status: 400 });
      if (itemIndex < 0 || itemIndex >= items.length) return Response.json({ error: "Choose a valid product to remove." }, { status: 400 });
      const removed = items[itemIndex];
      const remaining = items.filter((_, index) => index !== itemIndex);
      const productTotal = round2(remaining.reduce((sum, item) => sum + numeric(item.price) * Math.max(1, whole(item.qty, 1)), 0));
      const againstOrderExtra = round2(remaining.reduce((sum, item) => sum + (item.againstOrder ? numeric(item.againstOrderExtra) : 0), 0));
      const subtotal = round2(productTotal + againstOrderExtra);
      const discountType = clean(bill.discountType, "amount") === "percent" ? "percent" : "amount";
      const discountValue = numeric(bill.discountValue);
      const discount = round2(discountType === "percent" ? subtotal * Math.min(100, discountValue) / 100 : Math.min(subtotal, discountValue));
      const goodsTotal = round2(Math.max(0, subtotal - discount));
      const cardCharge = round2(numeric(bill.cardCharge));
      const transportCharge = round2(numeric(bill.transportCharge));
      const otherCharge = round2(numeric(bill.otherCharge));
      const grandTotal = round2(goodsTotal + cardCharge + transportCharge + otherCharge);
      const paidAmount = round2(numeric(bill.paidAmount));
      if (paidAmount > grandTotal) return Response.json({ error: "This product cannot be removed because collected payment exceeds the new total. Record the refund first." }, { status: 400 });
      const setting = await env.DB.prepare("SELECT gst_rate AS gstRate FROM settings WHERE id=1").first<{ gstRate: number }>();
      const gstRate = Math.max(0, Number(setting?.gstRate ?? 18));
      const taxableValue = gstRate > 0 ? round2(goodsTotal / (1 + gstRate / 100)) : goodsTotal;
      const gst = round2(goodsTotal - taxableValue);
      const cgst = round2(gst / 2);
      const sgst = round2(gst - cgst);
      const balanceAmount = round2(grandTotal - paidAmount);
      const statements = [];
      if (!removed.againstOrder && clean(removed.productId)) statements.push(env.DB.prepare(
        "UPDATE products SET stock_qty=stock_qty+?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
      ).bind(Math.max(1, whole(removed.qty, 1)), clean(removed.productId)));
      statements.push(env.DB.prepare(`UPDATE bills SET items_json=?,product_total=?,against_order_extra=?,subtotal=?,discount=?,
        taxable_value=?,cgst=?,sgst=?,gst=?,grand_total=?,balance_amount=? WHERE id=?`)
        .bind(JSON.stringify(remaining), productTotal, againstOrderExtra, subtotal, discount, taxableValue, cgst, sgst, gst, grandTotal, balanceAmount, id));
      if (!remaining.some((item) => clean(item.productId) === clean(removed.productId) && item.againstOrder)) {
        statements.push(env.DB.prepare("DELETE FROM supplier_assignments WHERE bill_id=? AND product_id=?").bind(id, clean(removed.productId)));
      }
      statements.push(env.DB.prepare(`UPDATE tasks SET title=?,status=?,updated_at=CURRENT_TIMESTAMP
        WHERE linked_bill_id=? AND category='Financial'`)
        .bind(`Collect ${moneyForTask(balanceAmount)} balance · ${clean(bill.billNo)}`, balanceAmount > 0 ? "Pending" : "Completed", id));
      await env.DB.batch(statements);
    } else if (action === "updateBillDetails") {
      const value = payload.bill as Record<string, unknown>;
      if (!clean(value.customerName) || !clean(value.customerPhone)) return Response.json({ error: "Customer name and phone are required." }, { status: 400 });
      const id = clean(value.id);
      const existing = await env.DB.prepare(`SELECT items_json AS itemsJson,status,discount_type AS discountType,discount_value AS discountValue,
        card_charge AS cardCharge,transport_charge AS transportCharge,other_charge AS otherCharge,paid_amount AS paidAmount,bill_no AS billNo
        FROM bills WHERE id=?`).bind(id).first<Record<string, unknown>>();
      if (!existing || existing.status === "cancelled") return Response.json({ error: "Cancelled or missing order cannot be edited." }, { status: 400 });
      const incoming = Array.isArray(value.items) ? value.items as BillItemInput[] : [];
      const items = incoming.map((item) => ({
        productId: clean(item.productId), code: clean(item.code).toUpperCase(), hsnCode: clean(item.hsnCode),
        name: clean(item.name), size: clean(item.size), woodType: clean(item.woodType), price: round2(numeric(item.price)),
        qty: Math.max(1, whole(item.qty, 1)), againstOrder: Boolean(item.againstOrder),
        againstOrderExtra: item.againstOrder ? round2(numeric(item.againstOrderExtra)) : 0,
        customizeDetails: clean(item.customizeDetails),
        imageKey: clean(item.imageKey), imageUrl: clean(item.imageUrl),
      })).filter((item) => item.name && item.productId);
      if (!items.length) return Response.json({ error: "Keep at least one valid product in the order." }, { status: 400 });
      const oldItems = safeJson<BillItemInput[]>(existing.itemsJson, []);
      const readyQty = (rows: BillItemInput[]) => rows.reduce((map, item) => {
        if (!item.againstOrder && clean(item.productId)) map.set(clean(item.productId), (map.get(clean(item.productId)) || 0) + Math.max(1, whole(item.qty, 1)));
        return map;
      }, new Map<string, number>());
      const oldReady = readyQty(oldItems), newReady = readyQty(items);
      const productIds = [...new Set([...oldReady.keys(), ...newReady.keys()])];
      const productStock = new Map<string, number>();
      if (productIds.length) {
        const rows = await env.DB.prepare(`SELECT id,stock_qty AS stockQty FROM products WHERE id IN (${productIds.map(() => "?").join(",")})`).bind(...productIds).all<{ id: string; stockQty: number }>();
        rows.results.forEach((row) => productStock.set(row.id, Number(row.stockQty)));
      }
      for (const productId of productIds) {
        const extraNeeded = (newReady.get(productId) || 0) - (oldReady.get(productId) || 0);
        if (extraNeeded > (productStock.get(productId) || 0)) return Response.json({ error: "Not enough ready stock for the edited quantity." }, { status: 409 });
      }
      const productTotal = round2(items.reduce((sum, item) => sum + item.price * item.qty, 0));
      const againstOrderExtra = round2(items.reduce((sum, item) => sum + item.againstOrderExtra, 0));
      const subtotal = round2(productTotal + againstOrderExtra);
      const discountType = clean(existing.discountType, "amount") === "percent" ? "percent" : "amount";
      const discountValue = numeric(existing.discountValue);
      const discount = round2(discountType === "percent" ? subtotal * Math.min(100, discountValue) / 100 : Math.min(subtotal, discountValue));
      const goodsTotal = round2(Math.max(0, subtotal - discount));
      const setting = await env.DB.prepare("SELECT gst_rate AS gstRate FROM settings WHERE id=1").first<{ gstRate: number }>();
      const gstRate = Math.max(0, Number(setting?.gstRate ?? 18));
      const taxableValue = gstRate > 0 ? round2(goodsTotal / (1 + gstRate / 100)) : goodsTotal;
      const gst = round2(goodsTotal - taxableValue), cgst = round2(gst / 2), sgst = round2(gst - cgst);
      const grandTotal = round2(goodsTotal + numeric(existing.cardCharge) + numeric(existing.transportCharge) + numeric(existing.otherCharge));
      const paidAmount = round2(numeric(existing.paidAmount));
      if (paidAmount > grandTotal) return Response.json({ error: "Collected payment is higher than the edited total. Record the refund before reducing this order." }, { status: 400 });
      const statements = productIds.map((productId) => env.DB.prepare("UPDATE products SET stock_qty=stock_qty+?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
        .bind((oldReady.get(productId) || 0) - (newReady.get(productId) || 0), productId));
      statements.push(env.DB.prepare(`UPDATE bills SET customer_name=?,customer_phone=?,customer_address=?,items_json=?,staff_name=?,counter_name=?,delivery_date=?,
        order_notes=?,accountant_name=?,manager_name=?,product_total=?,against_order_extra=?,subtotal=?,discount=?,taxable_value=?,cgst=?,sgst=?,gst=?,grand_total=?,balance_amount=?
        WHERE id=? AND status<>'cancelled'`).bind(clean(value.customerName), clean(value.customerPhone), clean(value.customerAddress), JSON.stringify(items),
          clean(value.staffName), clean(value.counterName), clean(value.deliveryDate), clean(value.orderNotes), clean(value.accountantName), clean(value.managerName),
          productTotal, againstOrderExtra, subtotal, discount, taxableValue, cgst, sgst, gst, grandTotal, round2(grandTotal - paidAmount), id));
      const assignments = await env.DB.prepare("SELECT id,product_id AS productId FROM supplier_assignments WHERE bill_id=?").bind(id).all<{ id: string; productId: string }>();
      for (const assignment of assignments.results) {
        const item = items.find((row) => row.productId === assignment.productId && row.againstOrder);
        statements.push(item
          ? env.DB.prepare("UPDATE supplier_assignments SET product_code=?,product_name=?,qty=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(item.code, item.name, item.qty, assignment.id)
          : env.DB.prepare("DELETE FROM supplier_assignments WHERE id=?").bind(assignment.id));
      }
      statements.push(env.DB.prepare(`UPDATE tasks SET title=?,status=?,updated_at=CURRENT_TIMESTAMP WHERE linked_bill_id=? AND category='Financial'`)
        .bind(`Collect ${moneyForTask(round2(grandTotal - paidAmount))} balance · ${clean(existing.billNo)}`, grandTotal - paidAmount > 0 ? "Pending" : "Completed", id));
      await env.DB.batch(statements);
    } else if (action === "setDelivery") {
      const delivered = Boolean(payload.delivered);
      const billId = clean(payload.id);
      await env.DB.prepare("UPDATE bills SET delivery_status=?,delivered_at=? WHERE id=? AND status<>'cancelled'")
        .bind(delivered ? "Delivered" : "Pending", delivered ? new Date().toISOString() : "", billId).run();
      if (delivered) {
        const deliveredBill = await env.DB.prepare("SELECT customer_name AS customerName,customer_phone AS customerPhone,staff_name AS staffName,bill_no AS billNo FROM bills WHERE id=?")
          .bind(billId).first<Record<string, unknown>>();
        const existingHappyCall = await env.DB.prepare("SELECT id FROM customer_interactions WHERE bill_id=? AND type='Happy Call' LIMIT 1").bind(billId).first();
        if (deliveredBill && !existingHappyCall) {
          const followUp = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
          await env.DB.prepare(`INSERT INTO customer_interactions
            (id,customer_name,customer_phone,type,details,assigned_to,next_follow_up,status,bill_id,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
            .bind(uid("crm"), clean(deliveredBill.customerName), clean(deliveredBill.customerPhone), "Happy Call",
              `Confirm delivery satisfaction, product condition and service needs for ${clean(deliveredBill.billNo)}.`,
              clean(deliveredBill.staffName), followUp, "Open", billId).run();
        }
      }
    } else if (action === "setDeliveryStatus") {
      const allowed = new Set(["Order Booked", "Supplier Assigned", "In Production", "Ready", "Out for Delivery", "Delivered"]);
      const deliveryStatus = clean(payload.deliveryStatus);
      if (!allowed.has(deliveryStatus)) return Response.json({ error: "Choose a valid order status." }, { status: 400 });
      await env.DB.prepare("UPDATE bills SET delivery_status=?,delivered_at=? WHERE id=? AND status<>'cancelled'")
        .bind(deliveryStatus, deliveryStatus === "Delivered" ? new Date().toISOString() : "", clean(payload.id)).run();
      if (deliveryStatus === "Delivered") {
        const billId = clean(payload.id);
        const deliveredBill = await env.DB.prepare("SELECT customer_name AS customerName,customer_phone AS customerPhone,staff_name AS staffName,bill_no AS billNo FROM bills WHERE id=?")
          .bind(billId).first<Record<string, unknown>>();
        if (deliveredBill) {
          const existingHappyCall = await env.DB.prepare("SELECT id FROM customer_interactions WHERE bill_id=? AND type='Happy Call' LIMIT 1").bind(billId).first();
          if (!existingHappyCall) {
            const followUp = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
            await env.DB.prepare(`INSERT INTO customer_interactions
              (id,customer_name,customer_phone,type,details,assigned_to,next_follow_up,status,bill_id,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
              .bind(uid("crm"), clean(deliveredBill.customerName), clean(deliveredBill.customerPhone), "Happy Call",
                `Confirm delivery satisfaction, product condition and service needs for ${clean(deliveredBill.billNo)}.`,
                clean(deliveredBill.staffName), followUp, "Open", billId).run();
          }
        }
      }
    } else if (action === "saveSupplier") {
      const value = payload.supplier as SupplierInput;
      if (!clean(value?.name) || !clean(value?.phone)) return Response.json({ error: "Supplier name and phone are required." }, { status: 400 });
      const id = clean(value.id) || uid("sup");
      await env.DB.prepare(`INSERT INTO suppliers
        (id,name,contact_person,phone,gstin,address,categories,bank_details,notes,status,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,contact_person=excluded.contact_person,phone=excluded.phone,
        gstin=excluded.gstin,address=excluded.address,categories=excluded.categories,bank_details=excluded.bank_details,
        notes=excluded.notes,status=excluded.status,updated_at=CURRENT_TIMESTAMP`)
        .bind(id, clean(value.name), clean(value.contactPerson), clean(value.phone), clean(value.gstin).toUpperCase(),
          clean(value.address), clean(value.categories), clean(value.bankDetails), clean(value.notes), clean(value.status, "Active")).run();
    } else if (action === "deleteSupplier") {
      const id = clean(payload.id);
      const used = await env.DB.prepare("SELECT COUNT(*) AS count FROM supplier_assignments WHERE supplier_id=?").bind(id).first<{ count: number }>();
      if (used?.count) return Response.json({ error: "Supplier has order history. Mark the supplier inactive instead of deleting." }, { status: 400 });
      await env.DB.prepare("DELETE FROM suppliers WHERE id=?").bind(id).run();
    } else if (action === "saveTask") {
      const value = payload.task as TaskInput;
      if (!clean(value?.title)) return Response.json({ error: "Task title is required." }, { status: 400 });
      const id = clean(value.id) || uid("task");
      const duplicate = await env.DB.prepare(`SELECT id FROM tasks WHERE id<>? AND lower(trim(category))=lower(trim(?))
        AND lower(trim(title))=lower(trim(?)) AND lower(trim(details))=lower(trim(?)) AND lower(trim(assigned_to))=lower(trim(?))
        AND due_date=? AND linked_customer_phone=? AND lower(trim(customer_name))=lower(trim(?))
        AND customer_phone=? AND lower(trim(enquired_products))=lower(trim(?)) AND lower(trim(attended_by))=lower(trim(?))
        AND commitment_date=? LIMIT 1`).bind(id, clean(value.category, "General"), clean(value.title), clean(value.details),
          clean(value.assignedTo), clean(value.dueDate), clean(value.linkedCustomerPhone), clean(value.customerName),
          clean(value.customerPhone), clean(value.enquiredProducts), clean(value.attendedBy), clean(value.commitmentDate)).first<{ id: string }>();
      if (duplicate) return Response.json({ error: "This exact task is already saved. Open the existing task instead of creating a duplicate." }, { status: 409 });
      await env.DB.prepare(`INSERT INTO tasks
        (id,category,title,details,assigned_to,due_date,priority,status,linked_bill_id,linked_customer_phone,customer_name,customer_phone,enquired_products,attended_by,commitment_date,notes,completion_reason,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET category=excluded.category,title=excluded.title,details=excluded.details,
        assigned_to=excluded.assigned_to,due_date=excluded.due_date,priority=excluded.priority,status=excluded.status,
        linked_bill_id=excluded.linked_bill_id,linked_customer_phone=excluded.linked_customer_phone,
        customer_name=excluded.customer_name,customer_phone=excluded.customer_phone,enquired_products=excluded.enquired_products,
        attended_by=excluded.attended_by,commitment_date=excluded.commitment_date,notes=excluded.notes,
        completion_reason=excluded.completion_reason,updated_at=CURRENT_TIMESTAMP`)
        .bind(id, clean(value.category, "General"), clean(value.title), clean(value.details), clean(value.assignedTo), clean(value.dueDate),
          clean(value.priority, "Normal"), clean(value.status, "Pending"), clean(value.linkedBillId), clean(value.linkedCustomerPhone),
          clean(value.customerName), clean(value.customerPhone), clean(value.enquiredProducts), clean(value.attendedBy),
          clean(value.commitmentDate), clean(value.notes), clean(value.completionReason)).run();
    } else if (action === "deleteTask") {
      await env.DB.prepare("DELETE FROM tasks WHERE id=?").bind(clean(payload.id)).run();
    } else if (action === "saveInteraction") {
      const value = payload.interaction as InteractionInput;
      if (!clean(value?.customerName) || !clean(value?.customerPhone)) return Response.json({ error: "Customer name and phone are required." }, { status: 400 });
      const id = clean(value.id) || uid("crm");
      await env.DB.prepare(`INSERT INTO customer_interactions
        (id,customer_name,customer_phone,type,details,assigned_to,next_follow_up,status,bill_id,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET customer_name=excluded.customer_name,customer_phone=excluded.customer_phone,
        type=excluded.type,details=excluded.details,assigned_to=excluded.assigned_to,next_follow_up=excluded.next_follow_up,
        status=excluded.status,bill_id=excluded.bill_id,updated_at=CURRENT_TIMESTAMP`)
        .bind(id, clean(value.customerName), clean(value.customerPhone), clean(value.type, "Follow-up"), clean(value.details),
          clean(value.assignedTo), clean(value.nextFollowUp), clean(value.status, "Open"), clean(value.billId)).run();
    } else if (action === "deleteInteraction") {
      await env.DB.prepare("DELETE FROM customer_interactions WHERE id=?").bind(clean(payload.id)).run();
    } else if (action === "saveSupplierAssignments") {
      const rows = Array.isArray(payload.assignments) ? payload.assignments as AssignmentInput[] : [];
      const valid = rows.filter((value) => clean(value.billId) && clean(value.productName) && clean(value.supplierId));
      if (!valid.length) return Response.json({ error: "Select a supplier for at least one product." }, { status: 400 });
      await env.DB.batch(valid.map((value) => {
        const id = clean(value.id) || uid("assign");
        return env.DB.prepare(`INSERT INTO supplier_assignments
          (id,bill_id,bill_no,product_id,product_code,product_name,qty,supplier_id,purchase_cost,advance_paid,expected_date,status,notes,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
          ON CONFLICT(id) DO UPDATE SET supplier_id=excluded.supplier_id,purchase_cost=excluded.purchase_cost,
          advance_paid=excluded.advance_paid,expected_date=excluded.expected_date,status=excluded.status,notes=excluded.notes,
          updated_at=CURRENT_TIMESTAMP`)
          .bind(id, clean(value.billId), clean(value.billNo), clean(value.productId), clean(value.productCode), clean(value.productName),
            Math.max(1, whole(value.qty, 1)), clean(value.supplierId), round2(numeric(value.purchaseCost)), round2(numeric(value.advancePaid)),
            clean(value.expectedDate), clean(value.status, "Not ordered"), clean(value.notes));
      }));
    } else if (action === "deleteSupplierAssignment") {
      await env.DB.prepare("DELETE FROM supplier_assignments WHERE id=?").bind(clean(payload.id)).run();
    } else if (action === "saveLead") {
      const value = payload.lead as LeadInput;
      if (!clean(value?.customerName) || !clean(value?.phone)) return Response.json({ error: "Lead name and phone are required." }, { status: 400 });
      const id = clean(value.id) || uid("lead");
      await env.DB.prepare(`INSERT INTO leads
        (id,customer_name,phone,source,interest,assigned_to,follow_up_date,status,notes,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET customer_name=excluded.customer_name,phone=excluded.phone,source=excluded.source,
        interest=excluded.interest,assigned_to=excluded.assigned_to,follow_up_date=excluded.follow_up_date,
        status=excluded.status,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`)
        .bind(id, clean(value.customerName), clean(value.phone), clean(value.source, "Walk-in"), clean(value.interest),
          clean(value.assignedTo), clean(value.followUpDate), clean(value.status, "New"), clean(value.notes)).run();
    } else if (action === "deleteLead") {
      await env.DB.prepare("DELETE FROM leads WHERE id=?").bind(clean(payload.id)).run();
    } else if (action === "saveJobCard") {
      const value = payload.jobCard as JobCardInput;
      if (!clean(value?.customerName)) return Response.json({ error: "Job card customer name is required." }, { status: 400 });
      const id = clean(value.id) || uid("job");
      let jobNo = clean(value.jobNo).toUpperCase();
      if (!jobNo) {
        const next = await env.DB.prepare("SELECT COUNT(*) AS count FROM job_cards").first<{ count: number }>();
        jobNo = `JOB-${String(Number(next?.count || 0) + 1).padStart(4, "0")}`;
      }
      await env.DB.prepare(`INSERT INTO job_cards
        (id,job_no,customer_name,phone,bill_id,measurements,wood_material,fabric,foam,polish,reference_images_json,
        estimated_cost,assigned_to,expected_date,stage,notes,updated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET job_no=excluded.job_no,customer_name=excluded.customer_name,phone=excluded.phone,
        bill_id=excluded.bill_id,measurements=excluded.measurements,wood_material=excluded.wood_material,fabric=excluded.fabric,
        foam=excluded.foam,polish=excluded.polish,reference_images_json=excluded.reference_images_json,
        estimated_cost=excluded.estimated_cost,assigned_to=excluded.assigned_to,expected_date=excluded.expected_date,
        stage=excluded.stage,notes=excluded.notes,updated_at=CURRENT_TIMESTAMP`)
        .bind(id, jobNo, clean(value.customerName), clean(value.phone), clean(value.billId), clean(value.measurements),
          clean(value.woodMaterial), clean(value.fabric), clean(value.foam), clean(value.polish),
          JSON.stringify(cleanList(value.referenceImages)), round2(numeric(value.estimatedCost)), clean(value.assignedTo),
          clean(value.expectedDate), clean(value.stage, "New"), clean(value.notes)).run();
    } else if (action === "deleteJobCard") {
      await env.DB.prepare("DELETE FROM job_cards WHERE id=?").bind(clean(payload.id)).run();
    } else if (action === "saveHeldOrder") {
      const value = payload.heldOrder as Record<string, unknown>;
      const id = clean(value?.id) || uid("hold");
      const name = clean(value?.name, `Held bill ${new Date().toISOString().slice(0, 16).replace("T", " ")}`);
      if (!value?.payload || typeof value.payload !== "object") return Response.json({ error: "There is no bill data to hold." }, { status: 400 });
      await env.DB.prepare(`INSERT INTO held_orders (id,name,payload_json,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET name=excluded.name,payload_json=excluded.payload_json,updated_at=CURRENT_TIMESTAMP`)
        .bind(id, name, JSON.stringify(value.payload)).run();
    } else if (action === "deleteHeldOrder") {
      await env.DB.prepare("DELETE FROM held_orders WHERE id=?").bind(clean(payload.id)).run();
    } else if (action === "saveStockVerification") {
      const lines = Array.isArray(payload.lines) ? payload.lines as Array<Record<string, unknown>> : [];
      const valid = lines.map((line) => ({
        productId: clean(line.productId), code: clean(line.code), name: clean(line.name),
        systemQty: whole(line.systemQty), countedQty: whole(line.countedQty),
      })).filter((line) => line.productId);
      if (!valid.length) return Response.json({ error: "Enter at least one physical stock count." }, { status: 400 });
      await env.DB.batch(valid.map((line) => env.DB.prepare("UPDATE products SET stock_qty=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(line.countedQty, line.productId)));
      await env.DB.prepare("INSERT INTO stock_verifications (id,checked_by,notes,lines_json) VALUES (?,?,?,?)")
        .bind(uid("stock-check"), clean(payload.checkedBy), clean(payload.notes), JSON.stringify(valid)).run();
    } else if (action === "importLegacySnapshot") {
      const snapshot = payload.snapshot as Record<string, unknown>;
      const products = Array.isArray(snapshot?.products) ? snapshot.products as ProductInput[] : [];
      const bills = Array.isArray(snapshot?.bills) ? snapshot.bills as Array<Record<string, unknown>> : [];
      const importedSuppliers = Array.isArray(snapshot?.suppliers) ? snapshot.suppliers as Array<Record<string, unknown>> : [];
      const importedTasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks as Array<Record<string, unknown>> : [];
      const importedInteractions = Array.isArray(snapshot?.interactions) ? snapshot.interactions as Array<Record<string, unknown>> : [];
      const importedAssignments = Array.isArray(snapshot?.supplierAssignments) ? snapshot.supplierAssignments as Array<Record<string, unknown>> : [];
      const importedSettings = snapshot?.settings as Record<string, unknown> | undefined;
      const snapshotBillKeys = new Set(bills.flatMap((bill) => [clean(bill.id), clean(bill.billNo)]).filter(Boolean));
      const existingBillRows = await env.DB.prepare("SELECT id,bill_no AS billNo FROM bills").all<{ id: string; billNo: string }>();
      if (existingBillRows.results.some((bill: { id: string; billNo: string }) => !snapshotBillKeys.has(bill.id) && !snapshotBillKeys.has(bill.billNo))) {
        return Response.json({ error: "Import is only allowed before new bills are created in this app." }, { status: 409 });
      }
      for (let index = 0; index < products.length; index += 60) await env.DB.batch(products.slice(index, index + 60).map(productUpsertStatement));
      for (const bill of bills) {
        const billId = clean(bill.id);
        const billNo = clean(bill.billNo);
        const alreadyImported = await env.DB.prepare("SELECT id FROM bills WHERE id=? OR bill_no=? LIMIT 1").bind(billId, billNo).first();
        if (alreadyImported) continue;
        const items = Array.isArray(bill.items) ? bill.items : [];
        const history = Array.isArray(bill.paymentHistory) ? bill.paymentHistory : [];
        const readyStockItems = items.filter((item) => !item.againstOrder && clean(item.productId));
        if (readyStockItems.length) {
          await env.DB.batch(readyStockItems.map((item) => env.DB.prepare(
            "UPDATE products SET stock_qty=stock_qty+? WHERE id=?"
          ).bind(whole(item.qty, 1), clean(item.productId))));
        }
        await env.DB.prepare(`INSERT OR IGNORE INTO bills
          (id,bill_no,client_request_id,customer_name,customer_phone,customer_address,items_json,staff_name,counter_name,
          product_total,against_order_extra,subtotal,discount_type,discount_value,discount,taxable_value,cgst,sgst,gst,
          grand_total,paid_amount,balance_amount,payment_mode,payment_history_json,delivery_date,delivery_status,delivered_at,status,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(clean(bill.id) || uid("bill"), clean(bill.billNo), clean(bill.clientRequestId), clean(bill.customerName, "Walk-in Customer"),
            clean(bill.customerPhone), clean(bill.customerAddress), JSON.stringify(items), clean(bill.staffName), clean(bill.counterName),
            round2(numeric(bill.productTotal)), round2(numeric(bill.againstOrderExtra)), round2(numeric(bill.subtotal)), clean(bill.discountType, "amount"),
            round2(numeric(bill.discountValue)), round2(numeric(bill.discount)), round2(numeric(bill.taxableValue)), round2(numeric(bill.cgst)),
            round2(numeric(bill.sgst)), round2(numeric(bill.gst)), round2(numeric(bill.grandTotal)), round2(numeric(bill.paidAmount)),
            round2(numeric(bill.balanceAmount)), clean(bill.paymentMode, "CASH"), JSON.stringify(history), clean(bill.deliveryDate),
            clean(bill.deliveryStatus, "Pending"), clean(bill.deliveredAt), clean(bill.status, "confirmed"), clean(bill.createdAt, new Date().toISOString())).run();
      }
      // The snapshot already contains the final stock balance. Reapply it after
      // historical bills so stock triggers cannot double-deduct old sales.
      for (let index = 0; index < products.length; index += 60) await env.DB.batch(products.slice(index, index + 60).map(productUpsertStatement));
      if (importedSettings) {
        const counters = cleanList(importedSettings.counterNames, ["Counter 1"]);
        await env.DB.prepare(`UPDATE settings SET business_name=?,subtitle=?,gstin=?,phone=?,address=?,gst_rate=?,bill_prefix=?,
          staff_names_json=?,counter_names_json=?,default_counter=?,invoice_terms=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`)
          .bind(clean(importedSettings.businessName, "Smaarthome Furniture"), clean(importedSettings.subtitle, "Showroom Billing & Operations"),
            clean(importedSettings.gstin), clean(importedSettings.phone), clean(importedSettings.address), round2(numeric(importedSettings.gstRate, 18)),
            clean(importedSettings.billPrefix, "SHF"), JSON.stringify(cleanList(importedSettings.staffNames)), JSON.stringify(counters),
            clean(importedSettings.defaultCounter, counters[0] || "Counter 1"), clean(importedSettings.invoiceTerms)).run();
      }
      for (let index = 0; index < importedSuppliers.length; index += 60) {
        await env.DB.batch(importedSuppliers.slice(index, index + 60).map((value) => env.DB.prepare(`INSERT INTO suppliers
          (id,name,contact_person,phone,gstin,address,categories,bank_details,notes,status,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,contact_person=excluded.contact_person,
          phone=excluded.phone,gstin=excluded.gstin,address=excluded.address,categories=excluded.categories,
          bank_details=excluded.bank_details,notes=excluded.notes,status=excluded.status,updated_at=excluded.updated_at`)
          .bind(clean(value.id) || uid("supplier"), clean(value.name), clean(value.contactPerson), clean(value.phone), clean(value.gstin),
            clean(value.address), clean(value.categories), clean(value.bankDetails), clean(value.notes), clean(value.status, "Active"),
            clean(value.createdAt, new Date().toISOString()), clean(value.updatedAt, new Date().toISOString()))));
      }
      for (let index = 0; index < importedTasks.length; index += 60) {
        await env.DB.batch(importedTasks.slice(index, index + 60).map((value) => env.DB.prepare(`INSERT INTO tasks
          (id,category,title,details,assigned_to,due_date,priority,status,linked_bill_id,linked_customer_phone,customer_name,customer_phone,enquired_products,attended_by,commitment_date,notes,completion_reason,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET category=excluded.category,title=excluded.title,
          details=excluded.details,assigned_to=excluded.assigned_to,due_date=excluded.due_date,priority=excluded.priority,
          status=excluded.status,linked_bill_id=excluded.linked_bill_id,linked_customer_phone=excluded.linked_customer_phone,
          customer_name=excluded.customer_name,customer_phone=excluded.customer_phone,enquired_products=excluded.enquired_products,
          attended_by=excluded.attended_by,commitment_date=excluded.commitment_date,notes=excluded.notes,
          completion_reason=excluded.completion_reason,
          updated_at=excluded.updated_at`)
          .bind(clean(value.id) || uid("task"), clean(value.category, "General"), clean(value.title), clean(value.details),
            clean(value.assignedTo), clean(value.dueDate), clean(value.priority, "Normal"), clean(value.status, "Pending"),
            clean(value.linkedBillId), clean(value.linkedCustomerPhone), clean(value.customerName), clean(value.customerPhone),
            clean(value.enquiredProducts), clean(value.attendedBy), clean(value.commitmentDate), clean(value.notes),
            clean(value.completionReason), clean(value.createdAt, new Date().toISOString()),
            clean(value.updatedAt, new Date().toISOString()))));
      }
      for (let index = 0; index < importedInteractions.length; index += 60) {
        await env.DB.batch(importedInteractions.slice(index, index + 60).map((value) => env.DB.prepare(`INSERT INTO customer_interactions
          (id,customer_name,customer_phone,type,details,assigned_to,next_follow_up,status,bill_id,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET customer_name=excluded.customer_name,
          customer_phone=excluded.customer_phone,type=excluded.type,details=excluded.details,assigned_to=excluded.assigned_to,
          next_follow_up=excluded.next_follow_up,status=excluded.status,bill_id=excluded.bill_id,updated_at=excluded.updated_at`)
          .bind(clean(value.id) || uid("crm"), clean(value.customerName), clean(value.customerPhone), clean(value.type, "Follow-up"),
            clean(value.details), clean(value.assignedTo), clean(value.nextFollowUp), clean(value.status, "Open"), clean(value.billId),
            clean(value.createdAt, new Date().toISOString()), clean(value.updatedAt, new Date().toISOString()))));
      }
      for (let index = 0; index < importedAssignments.length; index += 60) {
        await env.DB.batch(importedAssignments.slice(index, index + 60).map((value) => env.DB.prepare(`INSERT INTO supplier_assignments
          (id,bill_id,bill_no,product_id,product_code,product_name,qty,supplier_id,purchase_cost,advance_paid,expected_date,status,notes,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET bill_id=excluded.bill_id,bill_no=excluded.bill_no,
          product_id=excluded.product_id,product_code=excluded.product_code,product_name=excluded.product_name,qty=excluded.qty,
          supplier_id=excluded.supplier_id,purchase_cost=excluded.purchase_cost,advance_paid=excluded.advance_paid,
          expected_date=excluded.expected_date,status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at`)
          .bind(clean(value.id) || uid("assign"), clean(value.billId), clean(value.billNo), clean(value.productId), clean(value.productCode),
            clean(value.productName), Math.max(1, whole(value.qty, 1)), clean(value.supplierId), round2(numeric(value.purchaseCost)),
            round2(numeric(value.advancePaid)), clean(value.expectedDate), clean(value.status, "Not ordered"), clean(value.notes),
            clean(value.createdAt, new Date().toISOString()), clean(value.updatedAt, new Date().toISOString()))));
      }
      const maxBill = bills.reduce((max, bill) => Math.max(max, Number(clean(bill.billNo).match(/(\d+)$/)?.[1] || 0)), 0);
      await env.DB.prepare("UPDATE counters SET value=? WHERE key='bill'").bind(maxBill).run();
    } else if (action === "saveSettings") {
      const value = payload.settings as Record<string, unknown>;
      const counters = cleanList(value.counterNames, ["Counter 1"]);
      const defaultCounter = clean(value.defaultCounter, counters[0] || "Counter 1");
      await env.DB.prepare(`UPDATE settings SET business_name=?,subtitle=?,gstin=?,phone=?,address=?,gst_rate=?,bill_prefix=?,
        staff_names_json=?,counter_names_json=?,default_counter=?,invoice_terms=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`)
        .bind(clean(value.businessName, "Smaarthome Furniture"), clean(value.subtitle, "Showroom Billing & Operations"), clean(value.gstin).toUpperCase(),
          clean(value.phone), clean(value.address), round2(numeric(value.gstRate, 18)), clean(value.billPrefix, "SHF").toUpperCase(),
          JSON.stringify(cleanList(value.staffNames)), JSON.stringify(counters.length ? counters : ["Counter 1"]), defaultCounter,
          clean(value.invoiceTerms, "Goods once sold cannot be returned without approval.")).run();
    } else {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    if (!new Set(["importLegacySnapshot", "resetDemoWorkspace"]).has(action)) {
      try {
        const audit = auditDescription(action, payload);
        await env.DB.prepare(`INSERT INTO audit_logs (id,action,entity_type,entity_id,summary,created_at)
          VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)`).bind(uid("audit"), action, audit.entityType, audit.entityId, audit.summary).run();
      } catch (auditError) {
        console.error("Primary action saved but audit logging failed", auditError);
      }
    }
    return Response.json(await readState(user.role === "md" ? "all" : user.clientKey));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save showroom data";
    return Response.json({ error: message.includes("INSUFFICIENT_STOCK") ? "Stock changed at another counter. Refresh and try again." : message }, { status: 409 });
  }
}
