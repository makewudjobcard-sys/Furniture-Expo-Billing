"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id: string;
  code: string;
  hsnCode: string;
  name: string;
  category: string;
  size: string;
  woodType: string;
  price: number;
  stockQty: number;
  mrp: number;
  notes: string;
};

type CartItem = Product & { qty: number; againstOrder: boolean };

type Bill = {
  id: string;
  billNo: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{ productId: string; code: string; name: string; price: number; qty: number; againstOrder?: boolean }>;
  subtotal: number;
  discount: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: string;
  status: string;
  createdAt: string;
};

type ExpoSettings = {
  businessName: string;
  subtitle: string;
  gstin: string;
  phone: string;
  address: string;
  gstRate: number;
  billPrefix: string;
};

type ExpoState = {
  products: Product[];
  bills: Bill[];
  settings: ExpoSettings;
  syncedAt: string;
};

const EMPTY_PRODUCT = {
  code: "", hsnCode: "", name: "", category: "Sofa", size: "", woodType: "",
  price: 0, stockQty: 0, mrp: 0, notes: "",
};

const DEFAULT_SETTINGS: ExpoSettings = {
  businessName: "Furniture Expo",
  subtitle: "Live Billing Desk",
  gstin: "",
  phone: "",
  address: "",
  gstRate: 18,
  billPrefix: "EXP",
};

const categories = ["All", "Sofa", "Wooden Sofa", "Cot / Bed", "Teapoy", "Dining Chair", "Suit Chair", "Others"];
const palette = ["clay", "sage", "sand", "ink", "ochre", "rose"];

function money(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function productTone(product: Product) {
  const seed = [...product.code].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

export default function Home() {
  const [active, setActive] = useState<"billing" | "products" | "bills" | "settings">("billing");
  const [state, setState] = useState<ExpoState>({ products: [], bills: [], settings: DEFAULT_SETTINGS, syncedAt: "" });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [busy, setBusy] = useState(true);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState("");
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [showProductForm, setShowProductForm] = useState(false);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "" });
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [billSearch, setBillSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const fileRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) setBusy(true);
    try {
      const response = await fetch("/api/expo", { cache: "no-store" });
      const data = await response.json() as ExpoState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Cloud sync unavailable");
      setState(data);
      setSettingsForm(data.settings || DEFAULT_SETTINGS);
      setOnline(true);
    } catch (error) {
      setOnline(false);
      if (!silent) notify(error instanceof Error ? error.message : "Unable to connect");
    } finally {
      if (!silent) setBusy(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 12000);
    const refresh = () => load(true);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [load]);

  async function mutate(payload: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/expo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as ExpoState & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save");
      setState(data);
      setSettingsForm(data.settings || DEFAULT_SETTINGS);
      setOnline(true);
      notify(success);
      return data;
    } catch (error) {
      setOnline(false);
      notify(error instanceof Error ? error.message : "Unable to save");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    return state.products.filter((product) => {
      const categoryMatch = category === "All" || product.category === category;
      const queryMatch = !query || [product.code, product.name, product.category, product.size, product.woodType]
        .some((value) => value?.toLowerCase().includes(query));
      return categoryMatch && queryMatch;
    });
  }, [state.products, search, category]);

  const filteredBills = useMemo(() => {
    const query = billSearch.toLowerCase().trim();
    return state.bills.filter((bill) => !query || [bill.billNo, bill.customerName, bill.customerPhone]
      .some((value) => value?.toLowerCase().includes(query)));
  }, [state.bills, billSearch]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const grandTotal = Math.max(0, subtotal - discount);
  const balance = Math.max(0, grandTotal - paidAmount);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id && !item.againstOrder);
      if (existing) {
        if (existing.qty >= product.stockQty) {
          notify("Ready stock limit reached. Use Against Order if needed.");
          return current;
        }
        return current.map((item) => item === existing ? { ...item, qty: item.qty + 1 } : item);
      }
      if (product.stockQty <= 0) {
        return [...current, { ...product, qty: 1, againstOrder: true }];
      }
      return [...current, { ...product, qty: 1, againstOrder: false }];
    });
  }

  function updateCart(id: string, patch: Partial<CartItem>) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  async function confirmBill() {
    if (!cart.length) return notify("Add a product to start billing.");
    if (!online) return notify("Internet is required to confirm a bill safely.");
    const data = await mutate({
      action: "createBill",
      bill: {
        customerName: customer.name || "Walk-in Customer",
        customerPhone: customer.phone,
        customerAddress: customer.address,
        items: cart.map((item) => ({
          productId: item.id, code: item.code, name: item.name, price: item.price,
          qty: item.qty, againstOrder: item.againstOrder,
        })),
        subtotal, discount, grandTotal,
        paidAmount: Math.min(grandTotal, paidAmount),
        balanceAmount: balance,
        paymentMode,
      },
    }, "Bill confirmed and stock updated.");
    if (data) {
      setCart([]);
      setCustomer({ name: "", phone: "", address: "" });
      setDiscount(0); setPaidAmount(0); setPaymentMode("Cash");
      setActive("bills");
      setSelectedBill(data.bills[0] || null);
    }
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    const data = await mutate({ action: "saveProduct", product: productForm }, "Product saved to cloud inventory.");
    if (data) { setShowProductForm(false); setProductForm(EMPTY_PRODUCT); }
  }

  async function importExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const pick = (row: Record<string, unknown>, ...keys: string[]) => {
        const actual = Object.keys(row).find((key) => keys.some((candidate) => key.trim().toLowerCase() === candidate.toLowerCase()));
        return actual ? row[actual] : "";
      };
      const products = rows.map((row) => ({
        code: String(pick(row, "Product Code", "Code", "SKU")).trim(),
        hsnCode: String(pick(row, "HSN Code", "HSN")).trim(),
        name: String(pick(row, "Product Name", "Name")).trim(),
        category: String(pick(row, "Category")).trim() || "Others",
        size: String(pick(row, "Size")).trim(),
        woodType: String(pick(row, "Wood Type", "Wood")).trim(),
        price: Number(pick(row, "Expo Price (Incl. GST)", "Expo Price", "Price")) || 0,
        stockQty: Number(pick(row, "Stock Qty", "Stock", "Quantity")) || 0,
        mrp: Number(pick(row, "MRP")) || 0,
        notes: String(pick(row, "Notes")).trim(),
      }));
      await mutate({ action: "importProducts", products }, `${products.length} product rows imported.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not read this Excel file.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  function editProduct(product: Product) {
    setProductForm({ ...product });
    setShowProductForm(true);
  }

  function printBill(bill: Bill) {
    const settings = state.settings;
    const popup = window.open("", "invoice", "width=820,height=900");
    if (!popup) return notify("Allow popups to print the invoice.");
    popup.document.write(`<!doctype html><html><head><title>${bill.billNo}</title><style>
      body{font-family:Arial,sans-serif;color:#251a14;padding:32px;max-width:760px;margin:auto}h1{margin:0;font-size:28px}
      .muted{color:#766a62}.top{display:flex;justify-content:space-between;border-bottom:2px solid #251a14;padding-bottom:20px}
      table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:10px 6px;border-bottom:1px solid #ddd;text-align:left}
      th:last-child,td:last-child{text-align:right}.total{margin-left:auto;width:320px;margin-top:24px}.row{display:flex;justify-content:space-between;padding:7px 0}.grand{font-size:20px;font-weight:bold;border-top:2px solid #251a14}.tag{font-size:12px;padding:4px 8px;background:#eee;border-radius:20px}
      @media print{body{padding:0}}
    </style></head><body><div class="top"><div><h1>${settings.businessName}</h1><div class="muted">${settings.subtitle}</div><div class="muted">${settings.address || "Furniture Expo Billing"}</div></div><div><b>${bill.billNo}</b><br><span class="muted">${shortDate(bill.createdAt)}</span></div></div>
    <p><b>Customer:</b> ${bill.customerName}<br><span class="muted">${bill.customerPhone || "No phone"}${bill.customerAddress ? ` · ${bill.customerAddress}` : ""}</span></p>
    <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${bill.items.map((item) => `<tr><td>${item.name}<br><small class="muted">${item.code} ${item.againstOrder ? "· Against Order" : ""}</small></td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(item.price * item.qty)}</td></tr>`).join("")}</tbody></table>
    <div class="total"><div class="row"><span>Subtotal</span><b>${money(bill.subtotal)}</b></div><div class="row"><span>Discount</span><b>− ${money(bill.discount)}</b></div><div class="row grand"><span>Total</span><span>${money(bill.grandTotal)}</span></div><div class="row"><span>Paid (${bill.paymentMode})</span><b>${money(bill.paidAmount)}</b></div><div class="row"><span>Balance</span><b>${money(bill.balanceAmount)}</b></div></div>
    <p style="margin-top:48px;text-align:center" class="muted">Thank you for visiting ${settings.businessName}.</p><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }

  function shareWhatsApp(bill: Bill) {
    const text = `${state.settings.businessName}\nInvoice: ${bill.billNo}\nCustomer: ${bill.customerName}\nTotal: ${money(bill.grandTotal)}\nPaid: ${money(bill.paidAmount)}\nBalance: ${money(bill.balanceAmount)}\nThank you!`;
    const phone = bill.customerPhone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone ? (phone.startsWith("91") ? phone : `91${phone}`) : ""}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  const totalStock = state.products.reduce((sum, product) => sum + product.stockQty, 0);
  const inventoryValue = state.products.reduce((sum, product) => sum + product.stockQty * product.price, 0);
  const today = new Date().toDateString();
  const todayBills = state.bills.filter((bill) => new Date(bill.createdAt).toDateString() === today && bill.status !== "cancelled");
  const todaySales = todayBills.reduce((sum, bill) => sum + bill.grandTotal, 0);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark"><span>FE</span><div><strong>{state.settings.businessName}</strong><small>{state.settings.subtitle}</small></div></div>
        <nav aria-label="Main navigation">
          <NavButton active={active === "billing"} onClick={() => setActive("billing")} icon="₹" label="New bill" />
          <NavButton active={active === "products"} onClick={() => setActive("products")} icon="▦" label="Products" />
          <NavButton active={active === "bills"} onClick={() => setActive("bills")} icon="≡" label="Bills" />
          <NavButton active={active === "settings"} onClick={() => setActive("settings")} icon="⚙" label="Settings" />
        </nav>
        <div className={`sync-card ${online ? "online" : "offline"}`}>
          <span className="sync-dot" />
          <div><strong>{online ? "Cloud live" : "Offline"}</strong><small>{state.syncedAt ? `Synced ${new Date(state.syncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Connecting…"}</small></div>
          <button onClick={() => load()} aria-label="Sync now">↻</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <div className="brand-mark compact"><span>FE</span><div><strong>{state.settings.businessName}</strong><small>{online ? "Cloud live" : "Offline"}</small></div></div>
          <button className="icon-button" onClick={() => load()} aria-label="Sync now">↻</button>
        </header>

        <div className="mobile-tabs" role="tablist">
          <NavButton active={active === "billing"} onClick={() => setActive("billing")} icon="₹" label="Bill" />
          <NavButton active={active === "products"} onClick={() => setActive("products")} icon="▦" label="Stock" />
          <NavButton active={active === "bills"} onClick={() => setActive("bills")} icon="≡" label="Bills" />
          <NavButton active={active === "settings"} onClick={() => setActive("settings")} icon="⚙" label="Setup" />
        </div>

        {active === "billing" && (
          <section className="billing-layout">
            <div className="catalog-panel">
              <div className="section-heading">
                <div><span className="eyebrow">Expo counter</span><h1>Build a bill, fast.</h1><p>Search by product, code, size or wood type.</p></div>
                <div className="today-pill"><span>Today</span><strong>{money(todaySales)}</strong><small>{todayBills.length} confirmed bills</small></div>
              </div>
              <label className="search-box"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product or scan code…" autoFocus /><kbd>F2</kbd></label>
              <div className="category-row" aria-label="Product categories">
                {categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}
              </div>
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <button className="product-hit" onClick={() => addToCart(product)} aria-label={`Add ${product.name} to bill`}>
                      <div className={`product-visual ${productTone(product)}`}><span>{product.category.slice(0, 2).toUpperCase()}</span><small>{product.code}</small></div>
                      <div className="product-copy"><div className="product-meta"><span>{product.category}</span><em className={product.stockQty <= 1 ? "low" : ""}>{product.stockQty > 0 ? `${product.stockQty} ready` : "Order only"}</em></div><h3>{product.name}</h3><p>{[product.size, product.woodType].filter(Boolean).join(" · ") || product.code}</p><div className="price-line"><strong>{money(product.price)}</strong>{product.mrp > product.price && <del>{money(product.mrp)}</del>}<span>＋</span></div></div>
                    </button>
                  </article>
                ))}
                {!busy && !filteredProducts.length && <div className="empty-state"><strong>No matching furniture</strong><span>Try another category or import your inventory.</span></div>}
              </div>
            </div>

            <aside className="cart-panel">
              <div className="cart-title"><div><span className="eyebrow">Current order</span><h2>Bill summary</h2></div><span className="count-badge">{cart.reduce((sum, item) => sum + item.qty, 0)}</span></div>
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item.id}>
                    <div className={`cart-thumb ${productTone(item)}`}>{item.name.slice(0, 1)}</div>
                    <div className="cart-item-main"><div className="cart-item-head"><strong>{item.name}</strong><button onClick={() => setCart((current) => current.filter((value) => value.id !== item.id))} aria-label={`Remove ${item.name}`}>×</button></div><small>{item.code} · {money(item.price)}</small>
                      <div className="cart-controls"><div className="stepper"><button onClick={() => item.qty <= 1 ? setCart((current) => current.filter((value) => value.id !== item.id)) : updateCart(item.id, { qty: item.qty - 1 })}>−</button><span>{item.qty}</span><button onClick={() => item.againstOrder || item.qty < item.stockQty ? updateCart(item.id, { qty: item.qty + 1 }) : notify("Ready stock limit reached.")}>＋</button></div><strong>{money(item.price * item.qty)}</strong></div>
                      <label className="order-toggle"><input type="checkbox" checked={item.againstOrder} onChange={(event) => updateCart(item.id, { againstOrder: event.target.checked })} /><span>Against order</span></label>
                    </div>
                  </div>
                ))}
                {!cart.length && <div className="cart-empty"><span>＋</span><strong>Your bill is empty</strong><small>Tap a product card to add it here.</small></div>}
              </div>

              <div className="customer-fields"><label>Customer name<input value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} placeholder="Walk-in Customer" /></label><div className="field-pair"><label>Mobile<input inputMode="tel" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} placeholder="98765 43210" /></label><label>Payment<select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Mixed</option></select></label></div></div>
              <div className="totals"><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><label><span>Discount</span><input type="number" min="0" max={subtotal} value={discount || ""} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value)))} placeholder="₹0" /></label><div className="grand-total"><span>Grand total</span><strong>{money(grandTotal)}</strong></div><label><span>Amount paid</span><input type="number" min="0" max={grandTotal} value={paidAmount || ""} onChange={(event) => setPaidAmount(Math.max(0, Number(event.target.value)))} placeholder="₹0" /></label><div className="balance-line"><span>Balance due</span><strong>{money(balance)}</strong></div></div>
              <button className="primary-action" disabled={!cart.length || busy || !online} onClick={confirmBill}>{busy ? "Syncing…" : "Confirm bill"}<span>→</span></button>
              <p className="stock-note">Stock is reduced only for ready-stock items after cloud confirmation.</p>
            </aside>
          </section>
        )}

        {active === "products" && (
          <section className="page-section">
            <div className="section-heading with-actions"><div><span className="eyebrow">Inventory</span><h1>Every piece, accounted for.</h1><p>Import your expo sheet or manage products individually.</p></div><div className="heading-actions"><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={importExcel} /><button className="secondary-action" onClick={() => fileRef.current?.click()}>↑ Import Excel</button><button className="primary-small" onClick={() => { setProductForm(EMPTY_PRODUCT); setShowProductForm(true); }}>＋ Add product</button></div></div>
            <div className="metric-grid"><Metric label="Product models" value={String(state.products.length)} note="Active catalogue" /><Metric label="Ready stock" value={String(totalStock)} note="Pieces available" /><Metric label="Inventory value" value={money(inventoryValue)} note="At expo price" /><Metric label="Low stock" value={String(state.products.filter((product) => product.stockQty <= 1).length)} note="Needs attention" alert /></div>
            <div className="inventory-toolbar"><label className="search-box compact-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find in inventory…" /></label><button className="text-button" onClick={() => load()}>↻ Refresh stock</button></div>
            <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Specification</th><th>Expo price</th><th>Stock</th><th /></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><div className="table-product"><div className={`table-thumb ${productTone(product)}`}>{product.name.slice(0, 1)}</div><div><strong>{product.name}</strong><small>{product.code} · HSN {product.hsnCode || "—"}</small></div></div></td><td><span className="soft-tag">{product.category}</span></td><td>{[product.size, product.woodType].filter(Boolean).join(" · ") || "—"}</td><td><strong>{money(product.price)}</strong>{product.mrp > 0 && <small className="block-muted">MRP {money(product.mrp)}</small>}</td><td><span className={`stock-badge ${product.stockQty <= 1 ? "low" : ""}`}>{product.stockQty}</span></td><td><div className="row-actions"><button onClick={() => editProduct(product)}>Edit</button><button className="danger-link" onClick={() => window.confirm(`Delete ${product.name}?`) && mutate({ action: "deleteProduct", id: product.id }, "Product deleted.")}>Delete</button></div></td></tr>)}</tbody></table></div>
          </section>
        )}

        {active === "bills" && (
          <section className="page-section">
            <div className="section-heading"><div><span className="eyebrow">Sales ledger</span><h1>Bills, payments & balance.</h1><p>Every confirmed invoice stays synced across your counters.</p></div><div className="today-pill"><span>All sales</span><strong>{money(state.bills.filter((bill) => bill.status !== "cancelled").reduce((sum, bill) => sum + bill.grandTotal, 0))}</strong><small>{state.bills.length} invoice records</small></div></div>
            <div className="inventory-toolbar"><label className="search-box compact-search"><span>⌕</span><input value={billSearch} onChange={(event) => setBillSearch(event.target.value)} placeholder="Bill no, customer or mobile…" /></label><button className="text-button" onClick={() => load()}>↻ Sync bills</button></div>
            <div className="bill-list">{filteredBills.map((bill) => <article className={`bill-row ${bill.status === "cancelled" ? "cancelled" : ""}`} key={bill.id}><button className="bill-main" onClick={() => setSelectedBill(bill)}><div className="bill-id"><span>{bill.billNo}</span><small>{shortDate(bill.createdAt)}</small></div><div><strong>{bill.customerName}</strong><small>{bill.customerPhone || "No mobile"}</small></div><div><span className={`payment-status ${bill.status === "cancelled" ? "cancelled" : bill.balanceAmount > 0 ? "due" : "paid"}`}>{bill.status === "cancelled" ? "Cancelled" : bill.balanceAmount > 0 ? `${money(bill.balanceAmount)} due` : "Paid"}</span><small>{bill.items.reduce((sum, item) => sum + item.qty, 0)} items · {bill.paymentMode}</small></div><strong className="bill-total">{money(bill.grandTotal)}</strong><span className="chevron">›</span></button></article>)}{!filteredBills.length && <div className="empty-state"><strong>No bills yet</strong><span>Your first confirmed invoice will appear here.</span></div>}</div>
          </section>
        )}

        {active === "settings" && (
          <section className="page-section settings-page">
            <div className="section-heading"><div><span className="eyebrow">Expo setup</span><h1>Make the desk yours.</h1><p>These details appear on invoices and billing screens.</p></div></div>
            <form className="settings-card" onSubmit={async (event) => { event.preventDefault(); await mutate({ action: "saveSettings", settings: settingsForm }, "Expo settings saved."); }}>
              <div className="form-section"><div><strong>Business identity</strong><p>Name and billing contact shown to customers.</p></div><div className="form-grid"><label className="wide">Business name<input value={settingsForm.businessName} onChange={(event) => setSettingsForm({ ...settingsForm, businessName: event.target.value })} required /></label><label>Desk subtitle<input value={settingsForm.subtitle} onChange={(event) => setSettingsForm({ ...settingsForm, subtitle: event.target.value })} /></label><label>GSTIN<input value={settingsForm.gstin} onChange={(event) => setSettingsForm({ ...settingsForm, gstin: event.target.value.toUpperCase() })} placeholder="Optional" /></label><label>Phone<input value={settingsForm.phone} onChange={(event) => setSettingsForm({ ...settingsForm, phone: event.target.value })} /></label><label>Bill prefix<input value={settingsForm.billPrefix} onChange={(event) => setSettingsForm({ ...settingsForm, billPrefix: event.target.value.toUpperCase() })} maxLength={8} /></label><label className="wide">Address<textarea value={settingsForm.address} onChange={(event) => setSettingsForm({ ...settingsForm, address: event.target.value })} rows={3} /></label></div></div>
              <div className="form-section"><div><strong>Tax & workflow</strong><p>Expo prices are treated as GST-inclusive.</p></div><div className="form-grid"><label>GST rate (%)<input type="number" min="0" max="100" value={settingsForm.gstRate} onChange={(event) => setSettingsForm({ ...settingsForm, gstRate: Number(event.target.value) })} /></label><div className="info-box"><strong>Cloud stock safety</strong><p>Ready stock is checked and reduced in one database operation. Against Order items do not reduce stock.</p></div></div></div>
              <div className="settings-footer"><span>Changes sync to all counters.</span><button className="primary-small" disabled={busy}>Save settings</button></div>
            </form>
          </section>
        )}
      </main>

      {showProductForm && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setShowProductForm(false)}><form className="modal-card" onSubmit={saveProduct}><div className="modal-head"><div><span className="eyebrow">Inventory item</span><h2>{productForm.code ? "Edit product" : "Add product"}</h2></div><button type="button" onClick={() => setShowProductForm(false)} aria-label="Close">×</button></div><div className="form-grid"><label>Product code<input value={productForm.code} onChange={(event) => setProductForm({ ...productForm, code: event.target.value.toUpperCase() })} required /></label><label>HSN code<input value={productForm.hsnCode} onChange={(event) => setProductForm({ ...productForm, hsnCode: event.target.value })} /></label><label className="wide">Product name<input value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} required /></label><label>Category<input list="category-list" value={productForm.category} onChange={(event) => setProductForm({ ...productForm, category: event.target.value })} /><datalist id="category-list">{categories.slice(1).map((item) => <option value={item} key={item} />)}</datalist></label><label>Size<input value={productForm.size} onChange={(event) => setProductForm({ ...productForm, size: event.target.value })} /></label><label>Wood type<input value={productForm.woodType} onChange={(event) => setProductForm({ ...productForm, woodType: event.target.value })} /></label><label>Expo price<input type="number" min="1" value={productForm.price || ""} onChange={(event) => setProductForm({ ...productForm, price: Number(event.target.value) })} required /></label><label>Stock quantity<input type="number" min="0" value={productForm.stockQty || ""} onChange={(event) => setProductForm({ ...productForm, stockQty: Number(event.target.value) })} /></label><label>MRP<input type="number" min="0" value={productForm.mrp || ""} onChange={(event) => setProductForm({ ...productForm, mrp: Number(event.target.value) })} /></label><label className="wide">Notes<textarea rows={3} value={productForm.notes} onChange={(event) => setProductForm({ ...productForm, notes: event.target.value })} /></label></div><div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowProductForm(false)}>Cancel</button><button className="primary-small" disabled={busy}>Save product</button></div></form></div>}

      {selectedBill && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelectedBill(null)}><div className="modal-card invoice-modal"><div className="modal-head"><div><span className="eyebrow">Invoice</span><h2>{selectedBill.billNo}</h2></div><button onClick={() => setSelectedBill(null)} aria-label="Close">×</button></div><div className="invoice-meta"><div><span>Customer</span><strong>{selectedBill.customerName}</strong><small>{selectedBill.customerPhone || "No mobile"}</small></div><div><span>Created</span><strong>{shortDate(selectedBill.createdAt)}</strong><small>{selectedBill.paymentMode}</small></div></div><div className="invoice-items">{selectedBill.items.map((item, index) => <div key={`${item.code}-${index}`}><div><strong>{item.name}</strong><small>{item.code}{item.againstOrder ? " · Against Order" : ""}</small></div><span>{item.qty} × {money(item.price)}</span><strong>{money(item.qty * item.price)}</strong></div>)}</div><div className="invoice-totals"><div><span>Subtotal</span><strong>{money(selectedBill.subtotal)}</strong></div><div><span>Discount</span><strong>− {money(selectedBill.discount)}</strong></div><div className="grand-total"><span>Grand total</span><strong>{money(selectedBill.grandTotal)}</strong></div><div><span>Paid</span><strong>{money(selectedBill.paidAmount)}</strong></div><div><span>Balance</span><strong>{money(selectedBill.balanceAmount)}</strong></div></div>{selectedBill.status !== "cancelled" && selectedBill.balanceAmount > 0 && <div className="quick-payment"><input id="payment-add" type="number" min="1" max={selectedBill.balanceAmount} placeholder="Add payment amount" /><button className="secondary-action" onClick={async () => { const input = document.getElementById("payment-add") as HTMLInputElement; const amount = Number(input.value); if (!amount) return notify("Enter payment amount."); const data = await mutate({ action: "addPayment", id: selectedBill.id, amount }, "Payment updated."); if (data) setSelectedBill(data.bills.find((bill) => bill.id === selectedBill.id) || null); }}>Add payment</button></div>}<div className="modal-actions invoice-actions"><button className="secondary-action" onClick={() => printBill(selectedBill)}>Print invoice</button><button className="secondary-action" onClick={() => shareWhatsApp(selectedBill)}>WhatsApp</button>{selectedBill.status !== "cancelled" && <button className="danger-button" onClick={async () => { if (!window.confirm("Cancel this bill and restore ready stock?")) return; const data = await mutate({ action: "cancelBill", id: selectedBill.id }, "Bill cancelled. Ready stock restored."); if (data) setSelectedBill(data.bills.find((bill) => bill.id === selectedBill.id) || null); }}>Cancel bill</button>}</div></div></div>}

      {busy && <div className="busy-bar" aria-label="Syncing" />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: string; label: string }) {
  return <button className={active ? "active" : ""} onClick={onClick}><span>{icon}</span><b>{label}</b></button>;
}

function Metric({ label, value, note, alert = false }: { label: string; value: string; note: string; alert?: boolean }) {
  return <article className={`metric-card ${alert ? "alert" : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}
