"use client";

/* Product photos are dynamic R2 object URLs, so native img elements are intentional. */
/* eslint-disable @next/next/no-img-element */

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { extractEmbeddedExcelImages } from "./lib/excel-images";

type Page =
  | "dashboard"
  | "billing"
  | "products"
  | "bills"
  | "deliveries"
  | "operations"
  | "suppliers"
  | "reports"
  | "settings";
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
  imageKey: string;
  imageUrl: string;
};
type CartItem = Product & {
  qty: number;
  againstOrder: boolean;
  againstOrderExtra: number;
  customizeDetails: string;
};
type PaymentRecord = {
  id: string;
  amount: number;
  mode: string;
  note: string;
  date: string;
};
type BillItem = {
  productId: string;
  code: string;
  hsnCode?: string;
  name: string;
  size?: string;
  woodType?: string;
  price: number;
  qty: number;
  againstOrder?: boolean;
  orderType?: string;
  againstOrderExtra?: number;
  customizeDetails?: string;
};
type Bill = {
  id: string;
  billNo: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: BillItem[];
  staffName: string;
  counterName: string;
  productTotal: number;
  againstOrderExtra: number;
  cardCharge: number;
  transportCharge: number;
  otherCharge: number;
  subtotal: number;
  discountType: string;
  discountValue: number;
  discount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  gst: number;
  grandTotal: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMode: string;
  paymentHistory: PaymentRecord[];
  deliveryDate: string;
  deliveryStatus: string;
  deliveredAt: string;
  orderNotes: string;
  accountantName: string;
  managerName: string;
  documentType: string;
  status: string;
  createdAt: string;
};
type Supplier = {
  id: string; name: string; contactPerson: string; phone: string; gstin: string;
  address: string; categories: string; bankDetails: string; notes: string;
  status: string; createdAt: string; updatedAt: string;
};
type ExpoTask = {
  id: string; category: string; title: string; details: string; assignedTo: string;
  dueDate: string; priority: string; status: string; linkedBillId: string;
  linkedCustomerPhone: string; createdAt: string; updatedAt: string;
};
type CustomerInteraction = {
  id: string; customerName: string; customerPhone: string; type: string;
  details: string; assignedTo: string; nextFollowUp: string; status: string;
  billId: string; createdAt: string; updatedAt: string;
};
type SupplierAssignment = {
  id: string; billId: string; billNo: string; productId: string; productCode: string;
  productName: string; qty: number; supplierId: string; purchaseCost: number;
  advancePaid: number; expectedDate: string; status: string; notes: string;
  createdAt: string; updatedAt: string;
};
type AuditLog = {
  id: string; action: string; entityType: string; entityId: string;
  summary: string; createdAt: string;
};
type ExpoSettings = {
  businessName: string;
  subtitle: string;
  gstin: string;
  phone: string;
  address: string;
  gstRate: number;
  billPrefix: string;
  staffNames: string[];
  counterNames: string[];
  defaultCounter: string;
  invoiceTerms: string;
};
type ExpoState = {
  products: Product[];
  bills: Bill[];
  settings: ExpoSettings;
  suppliers: Supplier[];
  tasks: ExpoTask[];
  interactions: CustomerInteraction[];
  supplierAssignments: SupplierAssignment[];
  auditLogs: AuditLog[];
  syncedAt: string;
};
type ReportData = {
  title: string;
  subtitle: string;
  summary: Array<[string, string]>;
  headers: string[];
  rows: Array<Array<string | number>>;
};
type DashboardAction = {
  id: string;
  group: "urgent" | "today" | "routine";
  icon: string;
  title: string;
  detail: string;
  action: string;
  open: () => void;
  perform?: () => void | Promise<unknown>;
};
type ThemeName = "teak" | "forest" | "light" | "midnight" | "ocean" | "rose";
type DensityName = "comfortable" | "compact";

const EMPTY_PRODUCT = {
  id: "",
  code: "",
  hsnCode: "",
  name: "",
  category: "Sofa",
  size: "",
  woodType: "",
  price: 0,
  stockQty: 0,
  mrp: 0,
  notes: "",
  imageKey: "",
  imageUrl: "",
};
const DEFAULT_SETTINGS: ExpoSettings = {
  businessName: "Smaarthome Furniture",
  subtitle: "Showroom Billing & Operations",
  gstin: "",
  phone: "",
  address: "",
  gstRate: 18,
  billPrefix: "SHF",
  staffNames: [],
  counterNames: ["Counter 1"],
  defaultCounter: "Counter 1",
  invoiceTerms: "Goods once sold cannot be returned without approval.",
};
const categories = [
  "All",
  "Sofa",
  "Wooden Sofa",
  "Cot / Bed",
  "Teapoy",
  "Dining Table",
  "Dining Chair",
  "Suit Chair",
  "Chair",
  "Recliner",
  "Wardrobe",
  "Dressing Table",
  "TV Unit",
  "Office Furniture",
  "Mattress",
  "Table",
  "Others",
];
const paymentModes = ["CASH", "GPAY", "CARD", "RTGS", "BAJAJ", "CHEQUE"];
const deliveryStages = ["Order Booked", "Supplier Assigned", "In Production", "Ready", "Out for Delivery", "Delivered"];
const taskTemplates = [
  { icon: "☎", category: "Follow-up", title: "Customer follow-up", details: "Call the customer and record the next action." },
  { icon: "✦", category: "Cleaning", title: "Showroom cleaning check", details: "Check entrance, displays, products and billing counter." },
  { icon: "◎", category: "Marketing", title: "Marketing activity", details: "Plan today’s promotion, social post or lead follow-up." },
  { icon: "↗", category: "Development", title: "Business development", details: "Review improvement ideas, staff needs and showroom growth work." },
  { icon: "₹", category: "Financial Commitment", title: "Payment commitment", details: "Record the payable/receivable amount and completion plan." },
];
const themes: Array<{ id: ThemeName; label: string; colors: string[] }> = [
  { id: "teak", label: "Teak & Ivory", colors: ["#563a2c", "#fffaf0", "#b76a3c"] },
  { id: "forest", label: "Dark Green", colors: ["#17372d", "#ffffff", "#d96b3d"] },
  { id: "light", label: "Clean White", colors: ["#ffffff", "#f1f4f2", "#25634f"] },
  { id: "midnight", label: "Midnight", colors: ["#111827", "#202a3a", "#60a5fa"] },
  { id: "ocean", label: "Ocean Blue", colors: ["#123b57", "#f5fbff", "#2787b7"] },
  { id: "rose", label: "Soft Rose", colors: ["#4a2635", "#fff8fa", "#bf5d7a"] },
];
const palette = ["clay", "sage", "sand", "ink", "ochre", "rose"];

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}
function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
function printSafe(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}
function productTone(product: { code: string }) {
  const seed = [...product.code].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return palette[seed % palette.length];
}
function normalizePhone(value: string) {
  return value.replace(/\D/g, "").slice(-10);
}
function safeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
function imageSrc(product: Pick<Product, "imageUrl">) {
  return product.imageUrl || "";
}
function deliveryBucket(bill: Bill) {
  if (bill.status === "cancelled") return "cancelled";
  if (bill.deliveryStatus === "Delivered") return "delivered";
  const today = isoDate();
  if (!bill.deliveryDate || bill.deliveryDate < today) return "pending";
  if (bill.deliveryDate === today) return "today";
  return "upcoming";
}
function deliveryLabel(bucket: string) {
  return bucket === "today"
    ? "Today"
    : bucket === "upcoming"
      ? "Upcoming"
      : bucket === "delivered"
        ? "Delivered"
        : "Pending / Overdue";
}

async function compressImage(
  file: File,
  maxDimension = 1000,
  quality = 0.8,
): Promise<File> {
  if (file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Image compression failed.")),
      "image/jpeg",
      quality,
    ),
  );
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}

async function uploadImage(file: File) {
  const form = new FormData();
  form.append("image", await compressImage(file));
  const response = await fetch("/api/images", { method: "POST", body: form });
  const data = (await response.json()) as {
    key?: string;
    url?: string;
    error?: string;
  };
  if (!response.ok || !data.key)
    throw new Error(data.error || "Image upload failed.");
  return { key: data.key, url: data.url || "" };
}

export default function Home() {
  const [authStatus, setAuthStatus] = useState<"checking" | "logged_out" | "logged_in">("checking");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [active, setActive] = useState<Page>("dashboard");
  const [state, setState] = useState<ExpoState>({
    products: [],
    bills: [],
    settings: DEFAULT_SETTINGS,
    suppliers: [],
    tasks: [],
    interactions: [],
    supplierAssignments: [],
    auditLogs: [],
    syncedAt: "",
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [stockFilter, setStockFilter] = useState("all");
  const [busy, setBusy] = useState(true);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState("");
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [stockEntry, setStockEntry] = useState<{ product: Product | null; quantity: number }>({ product: null, quantity: 1 });
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    staffName: "",
    counterName: "Counter 1",
    deliveryDate: "",
    accountantName: "",
    managerName: "",
    orderNotes: "",
  });
  const [customerHint, setCustomerHint] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount",
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [cardCharge, setCardCharge] = useState(0);
  const [transportCharge, setTransportCharge] = useState(0);
  const [otherCharge, setOtherCharge] = useState(0);
  const [billSearch, setBillSearch] = useState("");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    mode: "CASH",
    note: "",
  });
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS);
  const [staffText, setStaffText] = useState("");
  const [counterText, setCounterText] = useState("Counter 1");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [reportType, setReportType] = useState("sales");
  const [reportFrom, setReportFrom] = useState(
    () =>
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [reportTo, setReportTo] = useState(() => isoDate());
  const [qrProduct, setQrProduct] = useState<Product | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState(
    "Point the camera at the product QR code.",
  );
  const [manualScanCode, setManualScanCode] = useState("");
  const [operationsTab, setOperationsTab] = useState<"tasks" | "customers">("tasks");
  const [taskFilter, setTaskFilter] = useState<"active" | "completed" | "all">("active");
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("forest");
  const [billingStep, setBillingStep] = useState<1 | 2 | 3>(1);
  const [density, setDensity] = useState<DensityName>("comfortable");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [restoredOffline, setRestoredOffline] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({ status: "Active" });
  const [taskForm, setTaskForm] = useState<Partial<ExpoTask>>({ category: "Follow-up", priority: "Normal", status: "Pending" });
  const [interactionForm, setInteractionForm] = useState<Partial<CustomerInteraction>>({ type: "Follow-up", status: "Open" });
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [assignmentBill, setAssignmentBill] = useState<Bill | null>(null);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Array<Partial<SupplierAssignment>>>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkImagesRef = useRef<HTMLInputElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const scanVideoRef = useRef<HTMLVideoElement>(null);
  const scanControlsRef = useRef<{ stop: () => void } | null>(null);
  const billRequestIdRef = useRef("");
  const taskSaveLockRef = useRef(false);
  const draftLoadedRef = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3400);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("smaarthome-theme") as ThemeName | null;
    const next = themes.some((item) => item.id === saved) ? saved! : "teak";
    const savedDensity = window.localStorage.getItem("smaarthome-density") as DensityName | null;
    const nextDensity = savedDensity === "compact" ? "compact" : "comfortable";
    const frame = window.requestAnimationFrame(() => {
      setTheme(next);
      setDensity(nextDensity);
      document.documentElement.dataset.theme = next;
      document.documentElement.dataset.density = nextDensity;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  function changeTheme(next: ThemeName) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("smaarthome-theme", next);
  }

  function changeDensity(next: DensityName) {
    setDensity(next);
    document.documentElement.dataset.density = next;
    window.localStorage.setItem("smaarthome-density", next);
  }

  useEffect(() => {
    let current = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean }) => {
        if (current) {
          setAuthStatus(result.authenticated ? "logged_in" : "logged_out");
          if (result.authenticated) window.localStorage.setItem("smaarthome-offline-session", "ready");
        }
      })
      .catch(() => {
        if (current) setAuthStatus(window.localStorage.getItem("smaarthome-offline-session") === "ready" ? "logged_in" : "logged_out");
      });
    return () => { current = false; };
  }, []);

  async function submitLogin(event: FormEvent) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      setAuthStatus("logged_in");
      window.localStorage.setItem("smaarthome-offline-session", "ready");
      setLoginForm({ username: "", password: "" });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setState({ products: [], bills: [], settings: DEFAULT_SETTINGS, suppliers: [], tasks: [], interactions: [], supplierAssignments: [], auditLogs: [], syncedAt: "" });
    setCart([]);
    window.localStorage.removeItem("smaarthome-offline-session");
    setAuthStatus("logged_out");
  }

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setBusy(true);
      try {
        const response = await fetch("/api/expo", { cache: "no-store" });
        const data = (await response.json()) as ExpoState & { error?: string };
        if (response.status === 401) setAuthStatus("logged_out");
        if (!response.ok)
          throw new Error(data.error || "Cloud sync unavailable");
        setState(data);
        window.localStorage.setItem("smaarthome-offline-state", JSON.stringify(data));
        setRestoredOffline(false);
        setSettingsForm(data.settings || DEFAULT_SETTINGS);
        setStaffText((data.settings?.staffNames || []).join(", "));
        setCounterText(
          (data.settings?.counterNames || ["Counter 1"]).join(", "),
        );
        setCustomer((current) => ({
          ...current,
          counterName:
            current.counterName || data.settings?.defaultCounter || "Counter 1",
        }));
        setOnline(true);
      } catch (error) {
        setOnline(false);
        const cached = window.localStorage.getItem("smaarthome-offline-state");
        if (cached) {
          try {
            const restored = JSON.parse(cached) as ExpoState;
            setState({ ...restored, auditLogs: restored.auditLogs || [] });
            setRestoredOffline(true);
          } catch {
            window.localStorage.removeItem("smaarthome-offline-state");
          }
        }
        if (!silent)
          notify(error instanceof Error ? error.message : "Unable to connect");
      } finally {
        if (!silent) setBusy(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    if (authStatus !== "logged_in") return;
    const initial = window.setTimeout(() => load(), 0);
    const timer = window.setInterval(() => load(true), 6000);
    const refresh = () => load(true);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load, authStatus]);

  useEffect(() => {
    if (authStatus !== "logged_in" || draftLoadedRef.current) return;
    draftLoadedRef.current = true;
    const saved = window.localStorage.getItem("smaarthome-order-draft");
    if (!saved) return;
    try {
      const draft = JSON.parse(saved) as {
        cart?: CartItem[]; customer?: typeof customer; billingStep?: 1 | 2 | 3;
        discountType?: "amount" | "percent"; discountValue?: number; paidAmount?: number;
        paymentMode?: string; cardCharge?: number; transportCharge?: number; otherCharge?: number;
      };
      if (draft.cart?.length || draft.customer?.name || draft.customer?.phone || draft.customer?.deliveryDate) {
        window.setTimeout(() => {
          setCart(draft.cart || []);
          setCustomer((current) => ({ ...current, ...draft.customer }));
          setBillingStep(draft.billingStep || 1);
          setDiscountType(draft.discountType || "amount");
          setDiscountValue(draft.discountValue || 0);
          setPaidAmount(draft.paidAmount || 0);
          setPaymentMode(draft.paymentMode || "CASH");
          setCardCharge(draft.cardCharge || 0);
          setTransportCharge(draft.transportCharge || 0);
          setOtherCharge(draft.otherCharge || 0);
          notify("Your unfinished order draft was restored.");
        }, 0);
      }
    } catch {
      window.localStorage.removeItem("smaarthome-order-draft");
    }
  }, [authStatus, notify]);

  useEffect(() => {
    if (authStatus !== "logged_in" || !draftLoadedRef.current) return;
    const hasDraft = cart.length > 0 || Boolean(customer.name || customer.phone || customer.address || customer.deliveryDate || customer.orderNotes);
    if (!hasDraft) {
      window.localStorage.removeItem("smaarthome-order-draft");
      return;
    }
    window.localStorage.setItem("smaarthome-order-draft", JSON.stringify({
      cart, customer, billingStep, discountType, discountValue, paidAmount,
      paymentMode, cardCharge, transportCharge, otherCharge,
    }));
  }, [authStatus, cart, customer, billingStep, discountType, discountValue, paidAmount, paymentMode, cardCharge, transportCharge, otherCharge]);

  async function mutate(payload: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/expo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as ExpoState & { error?: string };
      if (response.status === 401) setAuthStatus("logged_out");
      if (!response.ok) throw new Error(data.error || "Unable to save");
      setState(data);
      window.localStorage.setItem("smaarthome-offline-state", JSON.stringify(data));
      setRestoredOffline(false);
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
    return state.products.filter(
      (product) =>
        (category === "All" || product.category === category) &&
        (!query ||
          [
            product.code,
            product.name,
            product.category,
            product.size,
            product.woodType,
          ].some((value) => value?.toLowerCase().includes(query))),
    );
  }, [state.products, search, category]);
  const inventoryProducts = useMemo(() => filteredProducts.filter((product) =>
    stockFilter === "all" ||
    (stockFilter === "available" && product.stockQty > 2) ||
    (stockFilter === "low" && product.stockQty > 0 && product.stockQty <= 2) ||
    (stockFilter === "out" && product.stockQty <= 0),
  ), [filteredProducts, stockFilter]);

  async function adjustStock(product: Product, delta: number) {
    if (delta < 0 && product.stockQty <= 0) return;
    await mutate({ action: "adjustStock", id: product.id, delta }, `${product.code} stock ${delta > 0 ? "added" : "reduced"}.`);
  }

  function stockIn(product: Product) {
    setStockEntry({ product, quantity: 1 });
  }

  async function saveStockEntry(event: FormEvent) {
    event.preventDefault();
    if (!stockEntry.product || stockEntry.quantity <= 0) return notify("Enter a valid stock quantity above zero.");
    await adjustStock(stockEntry.product, Math.floor(stockEntry.quantity));
    setStockEntry({ product: null, quantity: 1 });
  }
  const filteredBills = useMemo(() => {
    const query = billSearch.toLowerCase().trim();
    return state.bills.filter(
      (bill) =>
        !query ||
        [
          bill.billNo,
          bill.customerName,
          bill.customerPhone,
          bill.staffName,
          bill.counterName,
        ].some((value) => value?.toLowerCase().includes(query)),
    );
  }, [state.bills, billSearch]);
  const activeBills = useMemo(
    () => state.bills.filter((bill) => bill.status !== "cancelled"),
    [state.bills],
  );
  const productTotal = cart.reduce(
    (sum, item) => sum + item.price * item.qty,
    0,
  );
  const againstOrderExtra = cart.reduce(
    (sum, item) => sum + (item.againstOrder ? item.againstOrderExtra : 0),
    0,
  );
  const subtotal = productTotal + againstOrderExtra;
  const discount =
    discountType === "percent"
      ? (subtotal * Math.min(100, discountValue)) / 100
      : Math.min(subtotal, discountValue);
  const goodsTotal = Math.max(0, subtotal - discount);
  const appliedCardCharge = paymentMode === "CARD" ? cardCharge : 0;
  const extraCharges = appliedCardCharge + transportCharge + otherCharge;
  const grandTotal = goodsTotal + extraCharges;
  const taxableValue =
    state.settings.gstRate > 0
      ? goodsTotal / (1 + state.settings.gstRate / 100)
      : goodsTotal;
  const gst = goodsTotal - taxableValue;
  const cgst = gst / 2;
  const sgst = gst - cgst;
  const balance = Math.max(0, grandTotal - paidAmount);

  function stockUsed(productId: string, exclude = -1) {
    return cart.reduce(
      (sum, item, index) =>
        sum +
        (index !== exclude && item.id === productId && !item.againstOrder
          ? item.qty
          : 0),
      0,
    );
  }
  function addToCart(product: Product, requested = 1) {
    setCart((current) => {
      const used = current.reduce(
        (sum, item) =>
          sum + (item.id === product.id && !item.againstOrder ? item.qty : 0),
        0,
      );
      const ready = Math.max(0, product.stockQty - used);
      const toStock = Math.min(requested, ready);
      const toOrder = requested - toStock;
      const next = [...current];
      if (toStock > 0) {
        const index = next.findIndex(
          (item) => item.id === product.id && !item.againstOrder,
        );
        if (index >= 0)
          next[index] = { ...next[index], qty: next[index].qty + toStock };
        else
          next.push({
            ...product,
            qty: toStock,
            againstOrder: false,
            againstOrderExtra: 0,
            customizeDetails: "",
          });
      }
      if (toOrder > 0) {
        const index = next.findIndex(
          (item) => item.id === product.id && item.againstOrder,
        );
        if (index >= 0)
          next[index] = { ...next[index], qty: next[index].qty + toOrder };
        else
          next.push({
            ...product,
            qty: toOrder,
            againstOrder: true,
            againstOrderExtra: 0,
            customizeDetails: "",
          });
        notify(
          product.stockQty
            ? "Stock limit reached — extra quantity moved to Against Order."
            : "Out of stock — added as Against Order.",
        );
      }
      return next;
    });
  }
  function removeCart(index: number) {
    setCart((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }
  function updateCart(index: number, patch: Partial<CartItem>) {
    setCart((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }
  function changeQty(index: number, nextQty: number) {
    const item = cart[index];
    if (!item) return;
    if (nextQty <= 0) return removeCart(index);
    if (item.againstOrder) return updateCart(index, { qty: nextQty });
    const capacity = Math.max(0, item.stockQty - stockUsed(item.id, index));
    if (nextQty <= capacity) return updateCart(index, { qty: nextQty });
    const overflow = nextQty - capacity;
    setCart((current) => {
      const next = current
        .map((value, itemIndex) =>
          itemIndex === index ? { ...value, qty: capacity } : value,
        )
        .filter((value) => value.qty > 0);
      const orderIndex = next.findIndex(
        (value) => value.id === item.id && value.againstOrder,
      );
      if (orderIndex >= 0)
        next[orderIndex] = {
          ...next[orderIndex],
          qty: next[orderIndex].qty + overflow,
        };
      else
        next.push({
          ...item,
          qty: overflow,
          againstOrder: true,
          againstOrderExtra: 0,
          customizeDetails: "",
        });
      return next;
    });
    notify(`${capacity} kept as Stock · ${overflow} moved to Against Order.`);
  }
  function changeOrderType(index: number, against: boolean) {
    const item = cart[index];
    if (!item || item.againstOrder === against) return;
    if (against) return updateCart(index, { againstOrder: true });
    const capacity = Math.max(0, item.stockQty - stockUsed(item.id, index));
    if (!capacity)
      return notify("No ready stock available. Keep this as Against Order.");
    if (item.qty <= capacity)
      return updateCart(index, {
        againstOrder: false,
        againstOrderExtra: 0,
        customizeDetails: "",
      });
    setCart((current) => {
      const next = current.map((value, itemIndex) =>
        itemIndex === index ? { ...value, qty: item.qty - capacity } : value,
      );
      const stockIndex = next.findIndex(
        (value, itemIndex) =>
          itemIndex !== index && value.id === item.id && !value.againstOrder,
      );
      if (stockIndex >= 0)
        next[stockIndex] = {
          ...next[stockIndex],
          qty: next[stockIndex].qty + capacity,
        };
      else
        next.push({
          ...item,
          qty: capacity,
          againstOrder: false,
          againstOrderExtra: 0,
          customizeDetails: "",
        });
      return next;
    });
    notify(
      `${capacity} moved to Stock · ${item.qty - capacity} kept as Against Order.`,
    );
  }

  function handleCustomerPhone(value: string) {
    setCustomer((current) => ({ ...current, phone: value }));
    const phone = normalizePhone(value);
    if (phone.length < 6) return setCustomerHint("");
    const prior = activeBills.find(
      (bill) => normalizePhone(bill.customerPhone) === phone,
    );
    if (prior) {
      setCustomer((current) => ({
        ...current,
        name: prior.customerName,
        address: prior.customerAddress,
      }));
      setCustomerHint(`Existing customer · Last order ${prior.billNo}`);
    } else setCustomerHint("New customer");
  }

  async function confirmBill() {
    if (!cart.length) return notify("Add at least one product.");
    if (!customer.name.trim() || !customer.phone.trim())
      return notify("Customer name and phone number are required.");
    if (!online)
      return notify("Internet is required to save an order safely.");
    if (!billRequestIdRef.current) billRequestIdRef.current = crypto.randomUUID();
    const data = await mutate(
      {
        action: "createBill",
        bill: {
          clientRequestId: billRequestIdRef.current,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address,
          staffName: customer.staffName,
          counterName: customer.counterName,
          deliveryDate: customer.deliveryDate,
          accountantName: customer.accountantName,
          managerName: customer.managerName,
          orderNotes: customer.orderNotes,
          items: cart.map((item) => ({
            productId: item.id,
            code: item.code,
            hsnCode: item.hsnCode,
            name: item.name,
            size: item.size,
            woodType: item.woodType,
            price: item.price,
            qty: item.qty,
            againstOrder: item.againstOrder,
            againstOrderExtra: item.againstOrderExtra,
            customizeDetails: item.customizeDetails,
          })),
          discountType,
          discountValue,
          paidAmount,
          paymentMode,
          cardCharge: appliedCardCharge,
          transportCharge,
          otherCharge,
        },
      },
      "Order booked, follow-ups created and stock synced.",
    );
    if (data) {
      billRequestIdRef.current = "";
      const created = data.bills[0];
      setCart([]);
      setCustomer({
        name: "",
        phone: "",
        address: "",
        staffName: "",
        counterName: data.settings.defaultCounter || "Counter 1",
        deliveryDate: "",
        accountantName: "",
        managerName: "",
        orderNotes: "",
      });
      setDiscountType("amount");
      setDiscountValue(0);
      setPaidAmount(0);
      setPaymentMode("CASH");
      setCardCharge(0);
      setTransportCharge(0);
      setOtherCharge(0);
      setBillingStep(1);
      window.localStorage.removeItem("smaarthome-order-draft");
      setActive("bills");
      setSelectedBill(created || null);
      const againstItems = created?.items.filter((item) => item.againstOrder) || [];
      if (created && againstItems.length) {
        setAssignmentBill(created);
        setAssignmentDrafts(againstItems.map((item) => ({
          billId: created.id,
          billNo: created.billNo,
          productId: item.productId,
          productCode: item.code,
          productName: item.name,
          qty: item.qty,
          supplierId: "",
          purchaseCost: 0,
          advancePaid: 0,
          expectedDate: created.deliveryDate,
          status: "Not ordered",
          notes: item.customizeDetails || "",
        })));
      }
    }
  }

  function continueBilling() {
    if (billingStep === 1) {
      if (!customer.name.trim() || !customer.phone.trim())
        return notify("Enter customer name and mobile number to continue.");
      if (!customer.deliveryDate) return notify("Choose the expected delivery date.");
      setBillingStep(2);
      return;
    }
    if (!cart.length) return notify("Add at least one product to continue.");
    setMobileSummaryOpen(false);
    setBillingStep(3);
  }

  function downloadBackup() {
    const backup = {
      app: "Smaarthome Furniture Billing",
      exportedAt: new Date().toISOString(),
      version: 2,
      data: state,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `smaarthome-furniture-backup-${isoDate()}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
    notify("Full showroom data backup downloaded.");
  }

  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    let next = { ...productForm };
    try {
      if (productImageFile) {
        setBusy(true);
        const uploaded = await uploadImage(productImageFile);
        next = { ...next, imageKey: uploaded.key, imageUrl: uploaded.url };
      }
    } catch (error) {
      setBusy(false);
      return notify(
        error instanceof Error ? error.message : "Image upload failed.",
      );
    }
    const data = await mutate(
      { action: "saveProduct", product: next },
      "Product and image saved to cloud stock.",
    );
    if (data) closeProductForm();
  }
  function closeProductForm() {
    setShowProductForm(false);
    setProductForm(EMPTY_PRODUCT);
    setProductImageFile(null);
    if (productImagePreview.startsWith("blob:"))
      URL.revokeObjectURL(productImagePreview);
    setProductImagePreview("");
  }
  function editProduct(product: Product) {
    setProductForm({ ...product });
    setProductImageFile(null);
    setProductImagePreview(product.imageUrl || "");
    setShowProductForm(true);
  }
  function selectProductImage(file: File | undefined) {
    if (!file) return;
    if (productImagePreview.startsWith("blob:"))
      URL.revokeObjectURL(productImagePreview);
    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
  }

  async function importExcel(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, {
        header: 1,
        defval: "",
      });
      if (!rows.length) throw new Error("Excel has no rows.");
      const headers = rows[0].map((value) =>
        String(value).trim().toLowerCase(),
      );
      const index = (...names: string[]) =>
        headers.findIndex((header) =>
          names.some((name) => header === name.toLowerCase()),
        );
      const columns = {
        code: index("Product Code", "Code", "SKU"),
        hsn: index("HSN Code", "HSN"),
        name: index("Product Name", "Name"),
        image: index("Product Image"),
        category: index("Category"),
        size: index("Size"),
        wood: index("Wood Type", "Wood"),
        price: index("Showroom Price (Incl. GST)", "Showroom Price", "Expo Price (Incl. GST)", "Expo Price", "Price"),
        stock: index("Stock Qty", "Stock", "Quantity"),
        mrp: index("MRP"),
        notes: index("Notes"),
      };
      if (columns.name < 0 || columns.price < 0)
        throw new Error("Product Name and Showroom Price columns are required.");
      const embedded = file.name.toLowerCase().endsWith(".xlsx")
        ? await extractEmbeddedExcelImages(buffer)
        : [];
      const products: Array<Record<string, unknown>> = [];
      let imageCount = 0;
      for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const value = (column: number) =>
          column >= 0 ? String(row[column] ?? "").trim() : "";
        const name = value(columns.name);
        const price = Number(value(columns.price).replace(/[,₹\s]/g, ""));
        if (!name || !Number.isFinite(price) || price <= 0) continue;
        const code = (
          value(columns.code) ||
          `PRD-${String(products.length + 1).padStart(3, "0")}`
        ).toUpperCase();
        const image =
          embedded.find(
            (item) =>
              item.row === rowIndex + 1 &&
              (columns.image < 0 || item.col === columns.image),
          ) || embedded.find((item) => item.row === rowIndex + 1);
        let imageKey = "";
        if (image) {
          const uploaded = await uploadImage(image.file);
          imageKey = uploaded.key;
          imageCount++;
        }
        products.push({
          code,
          hsnCode: value(columns.hsn),
          name,
          category: value(columns.category) || "Others",
          size: value(columns.size),
          woodType: value(columns.wood),
          price,
          stockQty: Number(value(columns.stock).replace(/[,\s]/g, "")) || 0,
          mrp: Number(value(columns.mrp).replace(/[,₹\s]/g, "")) || 0,
          notes: value(columns.notes),
          imageKey,
        });
      }
      const data = await mutate(
        { action: "importProducts", products },
        `${products.length} products imported · ${imageCount} embedded images saved.`,
      );
      if (data) setActive("products");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not read this Excel file.",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function importBulkImages(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    setBusy(true);
    let matched = 0;
    const unmatched: string[] = [];
    try {
      for (const file of files) {
        const base = file.name
          .replace(/\.[^.]+$/, "")
          .trim()
          .toLowerCase();
        const product = state.products.find(
          (item) =>
            item.code.toLowerCase() === base ||
            safeName(item.code) === safeName(base),
        );
        if (!product) {
          unmatched.push(file.name);
          continue;
        }
        const uploaded = await uploadImage(file);
        await mutate(
          {
            action: "saveProduct",
            product: { ...product, imageKey: uploaded.key },
          },
          `${product.code} image saved.`,
        );
        matched++;
      }
      notify(
        `${matched} images matched${unmatched.length ? ` · ${unmatched.length} unmatched` : ""}. Name files with the Product Code.`,
      );
    } catch (error) {
      notify(
        error instanceof Error ? error.message : "Bulk image import failed.",
      );
    } finally {
      setBusy(false);
      event.target.value = "";
      await load(true);
    }
  }

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const rows = [
      [
        "Product Code",
        "HSN Code",
        "Product Name",
        "Product Image",
        "Category",
        "Size",
        "Wood Type",
        "Showroom Price (Incl. GST)",
        "Stock Qty",
        "MRP",
        "Notes",
      ],
      [
        "SOFA-001",
        "94016100",
        "3 Seater Fabric Sofa",
        "Paste image in this cell",
        "Sofa",
        "3 Seater",
        "",
        55000,
        2,
        65000,
        "Sample row",
      ],
    ];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [14, 14, 28, 22, 18, 16, 18, 24, 12, 14, 24].map(
      (wch) => ({ wch }),
    );
    XLSX.utils.book_append_sheet(workbook, sheet, "Product Inventory");
    XLSX.writeFile(workbook, "Smaarthome_Furniture_Product_Inventory_Template.xlsx");
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    const staffNames = staffText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const counterNames = counterText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    await mutate(
      {
        action: "saveSettings",
        settings: {
          ...settingsForm,
          staffNames,
          counterNames,
          defaultCounter: counterNames.includes(settingsForm.defaultCounter)
            ? settingsForm.defaultCounter
            : counterNames[0] || "Counter 1",
        },
      },
      "Showroom settings, GST and staff lists saved.",
    );
  }

  async function saveSupplier(event: FormEvent) {
    event.preventDefault();
    const data = await mutate({ action: "saveSupplier", supplier: supplierForm }, supplierForm.id ? "Supplier updated." : "Supplier added.");
    if (data) { setSupplierForm({ status: "Active" }); setShowSupplierForm(false); }
  }
  async function saveTask(event: FormEvent) {
    event.preventDefault();
    if (taskSaveLockRef.current) return;
    taskSaveLockRef.current = true;
    try {
      const data = await mutate({ action: "saveTask", task: taskForm }, taskForm.id ? "Task updated." : "Task added to dashboard.");
      if (data) { setTaskForm({ category: "Follow-up", priority: "Normal", status: "Pending" }); setShowTaskForm(false); }
    } finally {
      taskSaveLockRef.current = false;
    }
  }
  async function saveInteraction(event: FormEvent) {
    event.preventDefault();
    const data = await mutate({ action: "saveInteraction", interaction: interactionForm }, interactionForm.id ? "Customer activity updated." : "Customer activity added.");
    if (data) { setInteractionForm({ type: "Follow-up", status: "Open" }); setShowInteractionForm(false); }
  }
  async function saveAssignments(event: FormEvent) {
    event.preventDefault();
    const data = await mutate({ action: "saveSupplierAssignments", assignments: assignmentDrafts }, "Supplier order assignments saved.");
    if (data) { setAssignmentBill(null); setAssignmentDrafts([]); setActive("suppliers"); }
  }
  function editAssignment(assignment: SupplierAssignment) {
    const bill = state.bills.find((item) => item.id === assignment.billId) || null;
    setAssignmentBill(bill);
    setAssignmentDrafts([{ ...assignment }]);
  }
  function openAssignmentForBill(bill: Bill) {
    const againstItems = bill.items.filter((item) => item.againstOrder);
    if (!againstItems.length) return notify("This order has no Against Order items.");
    setAssignmentBill(bill);
    setAssignmentDrafts(againstItems.map((item) => {
      const existing = state.supplierAssignments.find((assignment) => assignment.billId === bill.id && assignment.productId === item.productId);
      return existing || { billId: bill.id, billNo: bill.billNo, productId: item.productId, productCode: item.code, productName: item.name, qty: item.qty, supplierId: "", purchaseCost: 0, advancePaid: 0, expectedDate: bill.deliveryDate, status: "Not ordered", notes: item.customizeDetails || "" };
    }));
  }

  function printBill(bill: Bill, mode: "order" | "invoice" = "order") {
    const popup = window.open("", `${mode}-${bill.billNo}`, "width=980,height=900");
    if (!popup) return notify("Allow popups to print the order slip.");
    const settings = state.settings;
    const title = mode === "invoice" ? "FINAL GST INVOICE" : "ORDER BOOKING SLIP";
    const productImages = bill.items
      .map((item) => state.products.find((product) => product.id === item.productId || product.code === item.code))
      .filter((product): product is Product => Boolean(product?.imageUrl));
    const gstRows = mode === "invoice" ? `<div class="sumrow"><span>Taxable value</span><b>${money(bill.taxableValue)}</b></div><div class="sumrow"><span>CGST ${state.settings.gstRate / 2}%</span><b>${money(bill.cgst)}</b></div><div class="sumrow"><span>SGST ${state.settings.gstRate / 2}%</span><b>${money(bill.sgst)}</b></div>` : "";
    const extraRows = [
      ["Card charge", bill.cardCharge],
      ["Transport charge", bill.transportCharge],
      ["Other charge", bill.otherCharge],
    ].filter(([, value]) => Number(value) > 0).map(([label, value]) => `<div class="sumrow"><span>${label}</span><b>${money(Number(value))}</b></div>`).join("");
    popup.document.write(`<!doctype html><html><head><title>${printSafe(title)} · ${printSafe(bill.billNo)}</title><style>
      *{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17120f;padding:22px;max-width:900px;margin:auto;font-size:12px}.brand{text-align:center;border:1px solid #222;padding:14px}.brand h1{margin:0;font-size:30px;letter-spacing:.04em}.muted{color:#655b54;font-size:11px}.doc-title{text-align:center;background:#dbe9f6;border:1px solid #222;border-top:0;padding:7px;font-size:17px;font-weight:800}.meta{display:grid;grid-template-columns:1fr 260px;border-left:1px solid #222}.meta>div{display:grid;grid-template-columns:105px 1fr}.meta span,.meta b{padding:7px;border-right:1px solid #222;border-bottom:1px solid #222}.meta span{background:#e9f1f8;font-weight:700}.meta b{font-weight:600}table{width:100%;border-collapse:collapse}th,td{border:1px solid #222;padding:7px;text-align:center}th{background:#dbe9f6}td:nth-child(2){text-align:left}.totals-wrap{display:grid;grid-template-columns:1fr 340px;border-left:1px solid #222}.note{padding:10px;border-right:1px solid #222;border-bottom:1px solid #222}.summary{border-right:1px solid #222}.sumrow{display:flex;justify-content:space-between;padding:6px 9px;border-bottom:1px solid #222}.sumrow.grand{background:#dbe9f6;font-size:15px}.photos{display:flex;gap:5px;padding:7px;border:1px solid #222;border-top:0;min-height:120px}.photos img{width:150px;height:110px;object-fit:cover;border:1px solid #aaa}.payment{display:grid;grid-template-columns:repeat(6,1fr);border-left:1px solid #222}.payment span{padding:8px;text-align:center;border-right:1px solid #222;border-bottom:1px solid #222;font-weight:700}.payment .active{background:#ffef57}.signatures{display:grid;grid-template-columns:1fr 1.5fr 1fr;border-left:1px solid #222}.signatures div{min-height:64px;padding:8px;text-align:center;border-right:1px solid #222;border-bottom:1px solid #222}.cancel{padding:10px;text-align:center;color:#a6251d;background:#f8dddd;font-weight:800}.history{margin-top:15px}.history div{display:flex;justify-content:space-between;padding:5px;border-bottom:1px solid #ddd}@media print{body{padding:0}.no-print{display:none}}
    </style></head><body>
      ${bill.status === "cancelled" ? '<div class="cancel">CANCELLED ORDER</div>' : ""}
      <div class="brand"><h1>${printSafe(settings.businessName)}</h1><div>${printSafe(settings.address || settings.subtitle)}</div><div class="muted">${settings.gstin ? `GSTIN: ${printSafe(settings.gstin)} · ` : ""}${settings.phone ? `Contact: ${printSafe(settings.phone)}` : ""}</div></div>
      <div class="doc-title">${title}</div>
      <div class="meta"><div><span>Name</span><b>${printSafe(bill.customerName)}</b><span>Contact</span><b>${printSafe(bill.customerPhone)}</b><span>Address</span><b>${printSafe(bill.customerAddress || "—")}</b></div><div><span>Order No.</span><b>${printSafe(bill.billNo)}</b><span>Order Date</span><b>${printSafe(shortDate(bill.createdAt))}</b><span>Status</span><b>${printSafe(bill.deliveryStatus)}</b><span>Expected Date</span><b>${printSafe(bill.deliveryDate || "Not set")}</b></div></div>
      <table><thead><tr><th>S.No</th><th>Product and Model</th><th>Size</th><th>Unit Price</th><th>Qty</th><th>Total</th></tr></thead><tbody>${bill.items.map((item, index) => `<tr><td>${index + 1}</td><td><b>${printSafe(item.name)}</b><br><span class="muted">${printSafe(item.code)} · ${item.againstOrder ? "Against Order" : "Stock"}${item.customizeDetails ? `<br>${printSafe(item.customizeDetails)}` : ""}</span></td><td>${printSafe(item.size || "—")}</td><td>${money(item.price)}</td><td>${item.qty}</td><td>${money(item.price * item.qty + Number(item.againstOrderExtra || 0))}</td></tr>`).join("")}</tbody></table>
      <div class="totals-wrap"><div class="note"><b>Note:</b><br>${printSafe(bill.orderNotes || settings.invoiceTerms)}</div><div class="summary"><div class="sumrow"><span>Product total</span><b>${money(bill.productTotal + bill.againstOrderExtra)}</b></div>${bill.discount ? `<div class="sumrow"><span>Discount</span><b>− ${money(bill.discount)}</b></div>` : ""}${gstRows}${extraRows}<div class="sumrow grand"><span>Grand Total</span><b>${money(bill.grandTotal)}</b></div><div class="sumrow"><span>Advance</span><b>${money(bill.paidAmount)}</b></div><div class="sumrow"><span>Balance</span><b>${money(bill.balanceAmount)}</b></div></div></div>
      ${productImages.length ? `<div class="photos">${productImages.slice(0, 5).map((product) => `<img src="${printSafe(product.imageUrl)}" alt="${printSafe(product.name)}">`).join("")}</div>` : ""}
      <div class="payment">${paymentModes.map((payment) => `<span class="${bill.paymentMode === payment ? "active" : ""}">${payment}</span>`).join("")}</div>
      <div class="signatures"><div><b>Accountant</b><br><br>${printSafe(bill.accountantName || "")}</div><div><b>Order Booking Staff</b><br><br>${printSafe(bill.staffName || "")}</div><div><b>Manager</b><br><br>${printSafe(bill.managerName || "")}</div></div>
      ${bill.paymentHistory.length ? `<div class="history"><b>Payment History</b>${bill.paymentHistory.map((payment) => `<div><span>${printSafe(shortDate(payment.date))} · ${printSafe(payment.mode)}${payment.note ? ` · ${printSafe(payment.note)}` : ""}</span><b>${money(payment.amount)}</b></div>`).join("")}</div>` : ""}
      <script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  }
  function shareWhatsApp(bill: Bill) {
    const text = `${state.settings.businessName}\nOrder: ${bill.billNo}\nCustomer: ${bill.customerName}\nTotal: ${money(bill.grandTotal)}\nAdvance: ${money(bill.paidAmount)}\nBalance: ${money(bill.balanceAmount)}\nExpected delivery: ${bill.deliveryDate || "Not set"}\nStatus: ${bill.deliveryStatus}\nThank you!`;
    const phone = bill.customerPhone.replace(/\D/g, "");
    window.open(
      `https://wa.me/${phone.startsWith("91") ? phone : `91${phone}`}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  async function downloadBillExcel(bill: Bill) {
    const XLSX = await import("xlsx");
    const rows: Array<Array<string | number>> = [
      [state.settings.businessName],
      ["Order No", bill.billNo, "Date", shortDate(bill.createdAt)],
      ["Customer", bill.customerName, "Phone", bill.customerPhone],
      ["Order Booking Staff", bill.staffName, "Accountant", bill.accountantName],
      ["Manager", bill.managerName, "Payment Mode", bill.paymentMode],
      [],
      [
        "Code",
        "HSN",
        "Product",
        "Type",
        "Customize",
        "Qty",
        "Unit Price",
        "Extra",
        "Line Total",
      ],
      ...bill.items.map((item) => [
        item.code,
        item.hsnCode || "",
        item.name,
        item.againstOrder ? "Against Order" : "Stock",
        item.customizeDetails || "",
        item.qty,
        item.price,
        Number(item.againstOrderExtra || 0),
        item.price * item.qty + Number(item.againstOrderExtra || 0),
      ]),
      [],
      ["Product Total", bill.productTotal],
      ["Against Order Extra", bill.againstOrderExtra],
      ["Discount", bill.discount],
      ["Taxable Value", bill.taxableValue],
      [`CGST ${state.settings.gstRate / 2}%`, bill.cgst],
      [`SGST ${state.settings.gstRate / 2}%`, bill.sgst],
      ["GST Total", bill.gst],
      ["Card Charge", bill.cardCharge],
      ["Transport Charge", bill.transportCharge],
      ["Other Charge", bill.otherCharge],
      ["Grand Total", bill.grandTotal],
      ["Advance", bill.paidAmount],
      ["Balance", bill.balanceAmount],
      ["Expected Delivery", bill.deliveryDate],
      ["Delivery Status", bill.deliveryStatus],
      ["Order Notes", bill.orderNotes],
      [],
      ["Payment History"],
      ["Date", "Mode", "Note", "Amount"],
      ...bill.paymentHistory.map((payment) => [
        shortDate(payment.date),
        payment.mode,
        payment.note,
        payment.amount,
      ]),
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(rows),
      "Order Slip",
    );
    XLSX.writeFile(workbook, `${bill.billNo}.xlsx`);
  }

  const deliveryBills = useMemo(
    () =>
      activeBills
        .filter(
          (bill) =>
            deliveryFilter === "all" || deliveryBucket(bill) === deliveryFilter,
        )
        .sort((a, b) =>
          (a.deliveryDate || "9999").localeCompare(b.deliveryDate || "9999"),
        ),
    [activeBills, deliveryFilter],
  );
  const inRange = useCallback(
    (bill: Bill, delivery = false) => {
      const key = delivery ? bill.deliveryDate : bill.createdAt.slice(0, 10);
      if (!key) return !reportFrom && !reportTo;
      return (
        (!reportFrom || key >= reportFrom) && (!reportTo || key <= reportTo)
      );
    },
    [reportFrom, reportTo],
  );
  const reportData = useMemo<ReportData>(
    () =>
      buildReport(
        reportType,
        activeBills,
        state.products,
        reportFrom,
        reportTo,
        inRange,
        state.settings.gstRate,
        state.suppliers,
        state.tasks,
        state.interactions,
        state.supplierAssignments,
      ),
    [
      reportType,
      activeBills,
      state.products,
      reportFrom,
      reportTo,
      inRange,
      state.settings.gstRate,
      state.suppliers,
      state.tasks,
      state.interactions,
      state.supplierAssignments,
    ],
  );
  async function downloadReport() {
    const XLSX = await import("xlsx");
    const rows = [
      [reportData.title],
      [reportData.subtitle],
      [],
      ["Summary", "Value"],
      ...reportData.summary,
      [],
      reportData.headers,
      ...reportData.rows,
    ];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      reportData.title.slice(0, 31),
    );
    XLSX.writeFile(workbook, `${safeName(reportData.title)}-${isoDate()}.xlsx`);
  }
  function printReport() {
    const popup = window.open("", "report", "width=1100,height=900");
    if (!popup) return notify("Allow popups to print the report.");
    popup.document.write(
      `<!doctype html><html><head><title>${reportData.title}</title><style>body{font-family:Arial;padding:24px;color:#241a15}h1{margin-bottom:3px}.muted{color:#777}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.card{border:1px solid #ddd;padding:10px;border-radius:8px}.card span{font-size:10px;color:#777}.card b{display:block;margin-top:4px}table{border-collapse:collapse;width:100%;font-size:10px}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#eee}@media print{body{padding:0}.cards{grid-template-columns:repeat(4,1fr)}}</style></head><body><h1>${state.settings.businessName}</h1><div class="muted">${reportData.title} · ${reportData.subtitle}</div><div class="cards">${reportData.summary.map(([label, value]) => `<div class="card"><span>${label}</span><b>${value}</b></div>`).join("")}</div><table><thead><tr>${reportData.headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${reportData.rows.map((row) => `<tr>${row.map((cell, cellIndex) => `<td>${formatReportCell(reportData.headers[cellIndex], cell)}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`,
    );
    popup.document.close();
  }
  useEffect(() => {
    if (!qrProduct || !qrCanvasRef.current) return;
    import("qrcode").then((QRCode) =>
      QRCode.toCanvas(qrCanvasRef.current!, qrProduct.code.toUpperCase(), {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#271b15", light: "#fffdf9" },
      }),
    );
  }, [qrProduct]);
  function downloadQr() {
    if (!qrCanvasRef.current || !qrProduct) return;
    const anchor = document.createElement("a");
    anchor.href = qrCanvasRef.current.toDataURL("image/png");
    anchor.download = `${qrProduct.code}-QR.png`;
    anchor.click();
  }
  function printQr() {
    if (!qrCanvasRef.current || !qrProduct) return;
    const popup = window.open("", "product-qr", "width=480,height=620");
    if (!popup) return notify("Allow popups to print the QR tag.");
    popup.document.write(
      `<!doctype html><html><head><title>${qrProduct.code}</title><style>body{font-family:Arial;text-align:center;padding:28px;color:#271b15}.tag{border:2px solid #271b15;border-radius:16px;padding:24px}img{width:280px;max-width:100%}h1{font-size:22px;margin:12px 0 5px}p{margin:0;color:#77685e;font-weight:bold}@media print{body{padding:0}.tag{break-inside:avoid}}</style></head><body><div class="tag"><img src="${qrCanvasRef.current.toDataURL("image/png")}" alt="QR"><h1>${qrProduct.name}</h1><p>${qrProduct.code}</p></div><script>window.onload=()=>window.print()</script></body></html>`,
    );
    popup.document.close();
  }
  const closeScanner = useCallback(() => {
    scanControlsRef.current?.stop();
    scanControlsRef.current = null;
    setScannerOpen(false);
  }, []);
  async function startScanner() {
    setScannerOpen(true);
    setScanStatus("Starting camera…");
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (!scanVideoRef.current) return;
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });
      setScanStatus("Point the camera at the product QR code.");
      scanControlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        scanVideoRef.current,
        (result, _error, controls) => {
          if (!result) return;
          const code = result.getText().trim().toUpperCase();
          const product = state.products.find((item) => item.code.toUpperCase() === code);
          if (product) {
            controls.stop();
            scanControlsRef.current = null;
            addToCart(product);
            notify(`${product.name} added by QR.`);
            setScannerOpen(false);
          } else {
            setScanStatus(`Code ${code} is not in inventory.`);
          }
        }
      );
    } catch (error) {
      setScanStatus(
        error instanceof Error
          ? `Camera unavailable: ${error.message}`
          : "Camera permission unavailable. Allow camera access and retry.",
      );
    }
  }

  function submitManualScan() {
    const code = manualScanCode.trim().toUpperCase();
    const product = state.products.find((item) => item.code.toUpperCase() === code);
    if (!product) return setScanStatus(code ? `Code ${code} is not in inventory.` : "Enter a product code.");
    addToCart(product);
    notify(`${product.name} added by product code.`);
    setManualScanCode("");
    closeScanner();
  }

  const totalStock = state.products.reduce(
    (sum, product) => sum + product.stockQty,
    0,
  );
  const inventoryValue = state.products.reduce(
    (sum, product) => sum + product.stockQty * product.price,
    0,
  );
  const todayBills = activeBills.filter(
    (bill) => bill.createdAt.slice(0, 10) === isoDate(),
  );
  const todaySales = todayBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
  const pendingAmount = activeBills.reduce(
    (sum, bill) => sum + bill.balanceAmount,
    0,
  );
  const deliveryCounts = {
    today: activeBills.filter((bill) => deliveryBucket(bill) === "today")
      .length,
    upcoming: activeBills.filter((bill) => deliveryBucket(bill) === "upcoming")
      .length,
    pending: activeBills.filter((bill) => deliveryBucket(bill) === "pending")
      .length,
    delivered: activeBills.filter(
      (bill) => deliveryBucket(bill) === "delivered",
    ).length,
  };
  const openTasks = state.tasks.filter((task) => task.status !== "Completed");
  const dueTasks = openTasks.filter((task) => !task.dueDate || task.dueDate <= isoDate());
  const openInteractions = state.interactions.filter((item) => item.status !== "Closed");
  const followUpsDue = openInteractions.filter((item) => item.nextFollowUp && item.nextFollowUp <= isoDate());
  const openComplaints = openInteractions.filter((item) => item.type === "Complaint");
  const supplierOrdersOpen = state.supplierAssignments.filter((item) => !["Received", "Closed", "Cancelled"].includes(item.status));
  const supplierOrdersDelayed = supplierOrdersOpen.filter((item) => item.expectedDate && item.expectedDate < isoDate());
  const supplierPending = state.supplierAssignments.reduce((sum, item) => sum + Math.max(0, item.purchaseCost - item.advancePaid), 0);
  const todayActionItems: DashboardAction[] = [
    ...activeBills
      .filter((bill) => bill.deliveryStatus !== "Delivered" && bill.deliveryDate && bill.deliveryDate < isoDate())
      .map((bill) => ({ id: `delivery-${bill.id}`, group: "urgent" as const, icon: "⇢", title: `Delayed delivery · ${bill.customerName}`, detail: `${bill.billNo} · Expected ${bill.deliveryDate}`, action: "View order", open: () => setSelectedBill(bill) })),
    ...openComplaints.map((item) => ({ id: `complaint-${item.id}`, group: "urgent" as const, icon: "!", title: `Complaint · ${item.customerName}`, detail: item.details, action: "Resolve", open: () => { setOperationsTab("customers"); setActive("operations"); } })),
    ...supplierOrdersDelayed.map((item) => ({ id: `supplier-${item.id}`, group: "urgent" as const, icon: "◇", title: `Supplier delay · ${item.productName}`, detail: `${item.billNo} · Expected ${item.expectedDate}`, action: "Update", open: () => setActive("suppliers") })),
    ...dueTasks.map((task) => ({ id: `task-${task.id}`, group: (["High", "Urgent"].includes(task.priority) ? "urgent" : "today") as "urgent" | "today", icon: "✓", title: task.title, detail: `${task.category}${task.assignedTo ? ` · ${task.assignedTo}` : ""}${task.dueDate ? ` · Due ${task.dueDate}` : ""}`, action: "Done", open: () => { setTaskForm(task); setShowTaskForm(true); }, perform: () => mutate({ action: "saveTask", task: { ...task, status: "Completed" } }, "Task completed. Open Completed history to view or reopen it.") })),
    ...followUpsDue.filter((item) => item.type !== "Complaint").map((item) => ({ id: `follow-${item.id}`, group: "today" as const, icon: "☎", title: `${item.type} · ${item.customerName}`, detail: `${item.customerPhone}${item.details ? ` · ${item.details}` : ""}`, action: "Open", open: () => { setOperationsTab("customers"); setActive("operations"); } })),
    ...activeBills.filter((bill) => bill.deliveryStatus !== "Delivered" && bill.deliveryDate === isoDate()).map((bill) => ({ id: `today-delivery-${bill.id}`, group: "today" as const, icon: "⇢", title: `Delivery today · ${bill.customerName}`, detail: `${bill.billNo} · ${bill.customerPhone}`, action: "View", open: () => setSelectedBill(bill) })),
    ...activeBills.filter((bill) => bill.balanceAmount > 0).map((bill) => ({ id: `balance-${bill.id}`, group: "today" as const, icon: "₹", title: `Collect balance · ${bill.customerName}`, detail: `${bill.billNo} · ${money(bill.balanceAmount)}`, action: "Collect", open: () => setSelectedBill(bill) })),
    ...state.products.filter((product) => product.stockQty <= 2).map((product) => ({ id: `stock-${product.id}`, group: "routine" as const, icon: "▦", title: `Low stock · ${product.name}`, detail: `${product.code} · ${product.stockQty > 0 ? `${product.stockQty} remaining` : "Out of stock"}`, action: "Stock", open: () => { setSearch(product.code); setStockFilter("all"); setActive("products"); } })),
  ];
  const completedToday = state.tasks.filter((task) => task.status === "Completed" && task.updatedAt?.slice(0, 10) === isoDate()).length;
  const completedTasks = state.tasks
    .filter((task) => task.status === "Completed")
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const visibleTasks = state.tasks.filter((task) =>
    taskFilter === "all" || (taskFilter === "completed" ? task.status === "Completed" : task.status !== "Completed"),
  );
  const currentMonth = isoDate().slice(0, 7);
  const staffPerformance = [...activeBills
    .filter((bill) => bill.createdAt.slice(0, 7) === currentMonth)
    .reduce((map, bill) => {
      const staff = bill.staffName || "Unassigned";
      const row = map.get(staff) || { staff, orders: 0, items: 0, sales: 0, collected: 0, balance: 0, delivered: 0 };
      row.orders += 1;
      row.items += bill.items.reduce((sum, item) => sum + item.qty, 0);
      row.sales += bill.grandTotal;
      row.collected += bill.paidAmount;
      row.balance += bill.balanceAmount;
      if (bill.deliveryStatus === "Delivered") row.delivered += 1;
      map.set(staff, row);
      return map;
    }, new Map<string, { staff: string; orders: number; items: number; sales: number; collected: number; balance: number; delivered: number }>())
    .values()].sort((a, b) => b.sales - a.sales);

  if (authStatus === "checking") {
    return <div className="login-shell"><div className="login-loading"><span>SH</span><strong>Smaarthome Furniture</strong><small>Opening secure showroom desk…</small></div></div>;
  }

  if (authStatus === "logged_out") {
    return (
      <div className="login-shell">
        <section className="login-card">
          <div className="login-brand"><span>SH</span><div><strong>Smaarthome Furniture</strong><small>Cloud Billing & Inventory</small></div></div>
          <div className="login-copy"><span className="eyebrow">Authorised counter access</span><h1>Welcome back.</h1><p>Sign in to continue. Every bill, stock update and product image stays synced across your PCs and mobiles.</p></div>
          <form onSubmit={submitLogin}>
            <label>Username<input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} autoComplete="username" required /></label>
            <label>Password<input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} autoComplete="current-password" required /></label>
            {loginError && <div className="login-error" role="alert">{loginError}</div>}
            <button className="primary-action" disabled={loginBusy}>{loginBusy ? "Signing in…" : "Open billing desk"}<span>→</span></button>
          </form>
          <div className="login-assurance"><span>● Live cloud data</span><span>Order slip + GST invoice</span><span>Mobile + PC</span></div>
        </section>
        <aside className="login-visual"><span className="eyebrow">Showroom operations</span><h2>One stock.<br />Every counter.</h2><p>Ready stock, customer orders, collections and deliveries—kept together in real time.</p><div className="login-stats"><div><strong>6 sec</strong><small>Auto sync</small></div><div><strong>100%</strong><small>Cloud saved</small></div><div><strong>QR</strong><small>Fast billing</small></div></div></aside>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span>SH</span>
          <div>
            <strong>{state.settings.businessName}</strong>
            <small>{state.settings.subtitle}</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          <span className="nav-section-label">Billing workspace</span>
          <Nav
            active={active === "dashboard"}
            onClick={() => setActive("dashboard")}
            icon="⌂"
            label="Dashboard"
          />
          <Nav
            active={active === "billing"}
            onClick={() => setActive("billing")}
            icon="₹"
            label="New order"
          />
          <Nav
            active={active === "products"}
            onClick={() => setActive("products")}
            icon="▦"
            label="Inventory"
          />
          <Nav
            active={active === "bills"}
            onClick={() => setActive("bills")}
            icon="≡"
            label="Orders"
          />
          <span className="nav-section-label nav-section-spaced">Showroom management</span>
          <Nav
            active={active === "deliveries"}
            onClick={() => setActive("deliveries")}
            icon="⇢"
            label="Deliveries"
          />
          <Nav active={active === "operations"} onClick={() => setActive("operations")} icon="✓" label="Tasks & CRM" />
          <Nav active={active === "suppliers"} onClick={() => setActive("suppliers")} icon="◇" label="Suppliers" />
          <Nav
            active={active === "reports"}
            onClick={() => setActive("reports")}
            icon="▤"
            label="Reports"
          />
          <Nav
            active={active === "settings"}
            onClick={() => setActive("settings")}
            icon="⚙"
            label="Settings"
          />
        </nav>
        <label className="sidebar-theme">Theme<select value={theme} onChange={(event) => changeTheme(event.target.value as ThemeName)}>{themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="sidebar-theme sidebar-density">Display<select value={density} onChange={(event) => changeDensity(event.target.value as DensityName)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
        <div className={`sync-card ${online ? "online" : "offline"}`}>
          <span className="sync-dot" />
          <div>
            <strong>{online ? "Cloud live" : "Offline"}</strong>
            <small>
              {state.syncedAt
                ? `Synced ${new Date(state.syncedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                : "Connecting…"}
            </small>
          </div>
          <button onClick={() => load()} aria-label="Sync now">
            ↻
          </button>
        </div>
        <button className="sidebar-logout" onClick={logout}>↪ Sign out</button>
      </aside>
      <main className="main-content">
        <header className="mobile-header">
          <div className="brand-mark compact">
            <span>SH</span>
            <div>
              <strong>{state.settings.businessName}</strong>
              <small>{online ? "Cloud live" : "Offline"}</small>
            </div>
          </div>
          <div className="mobile-head-actions"><button className="icon-button" onClick={() => load()} aria-label="Sync now">↻</button><button className="icon-button" onClick={logout} aria-label="Sign out">↪</button></div>
        </header>
        {!online && <div className="offline-banner"><span>◌</span><div><strong>Offline mode</strong><small>{restoredOffline ? "Showing your last synced showroom data. Any open order draft is saved on this device." : "Your order draft is safe. Reconnect before final billing."}</small></div><button onClick={() => load()}>Retry sync</button></div>}
        <div className="mobile-tabs" role="tablist">
          <Nav
            active={active === "dashboard"}
            onClick={() => setActive("dashboard")}
            icon="⌂"
            label="Dashboard"
          />
          <Nav
            active={active === "billing"}
            onClick={() => setActive("billing")}
            icon="₹"
            label="Order"
          />
          <Nav
            active={active === "products"}
            onClick={() => setActive("products")}
            icon="▦"
            label="Stock"
          />
          <Nav
            active={active === "bills"}
            onClick={() => setActive("bills")}
            icon="≡"
            label="Orders"
          />
          <Nav active={["deliveries", "operations", "suppliers", "reports", "settings"].includes(active)} onClick={() => setMobileMoreOpen(true)} icon="•••" label="More" />
        </div>
        {mobileMoreOpen && <div className="mobile-more-backdrop">
          <button className="mobile-more-dismiss" aria-label="Close more tools" onClick={() => setMobileMoreOpen(false)} />
          <div className="mobile-more-sheet">
            <div className="mobile-more-head"><div><span className="eyebrow">More tools</span><h2>Manage showroom</h2></div><button onClick={() => setMobileMoreOpen(false)}>×</button></div>
            {([
              ["deliveries", "⇢", "Deliveries", "Expected dates and order status"],
              ["operations", "✓", "Tasks & customers", "Schedules, follow-ups and completed history"],
              ["suppliers", "◇", "Suppliers", "Purchases and supplier assignments"],
              ["reports", "▤", "Reports", "Sales, staff work and downloadable reports"],
              ["settings", "⚙", "Settings", "Business, GST and staff setup"],
            ] as const).map(([page, icon, label, note]) => <button key={page} onClick={() => { setActive(page); setMobileMoreOpen(false); }}><span>{icon}</span><div><strong>{label}</strong><small>{note}</small></div><b>›</b></button>)}
            <div className="mobile-theme-picker"><strong>Colour theme</strong><div>{themes.map((item) => <button className={theme === item.id ? "active" : ""} key={item.id} onClick={() => changeTheme(item.id)}><span>{item.colors.map((color) => <i key={color} style={{ background: color }} />)}</span>{item.label}</button>)}</div></div>
            <div className="mobile-density-picker"><strong>Display spacing</strong><div><button className={density === "comfortable" ? "active" : ""} onClick={() => changeDensity("comfortable")}>Comfortable</button><button className={density === "compact" ? "active" : ""} onClick={() => changeDensity("compact")}>Compact</button></div></div>
          </div>
        </div>}

        {active === "dashboard" && (
          <section className="page-section dashboard-page">
            <div className="section-heading today-heading">
              <div>
                <span className="eyebrow">Dashboard · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                <h1>Your showroom, clearly organised.</h1>
                <p>Today’s priorities, completed work, collections, deliveries and staff performance in one view.</p>
              </div>
              <div className="heading-actions">
                <button className="secondary-action" onClick={() => { setTaskForm({ category: "General", priority: "Normal", status: "Pending", dueDate: isoDate() }); setShowTaskForm(true); }}>＋ Add task</button>
                <button className="primary-small" onClick={() => setActive("billing")}>＋ New order</button>
              </div>
            </div>
            <div className="today-overview">
              <div className="today-count"><strong>{todayActionItems.length}</strong><span>actions pending</span><small>{completedToday} completed today</small></div>
              <div className="today-summary"><span><b>{money(todaySales)}</b>Today sales</span><span><b>{money(pendingAmount)}</b>To collect</span><span><b>{deliveryCounts.today}</b>Today deliveries</span><span><b>{totalStock}</b>Ready stock</span></div>
            </div>
            <section className="quick-plan">
              <div className="quick-plan-copy">
                <span className="eyebrow">Quick plan</span>
                <h2>Add today’s work in one tap</h2>
                <p>Choose a common showroom activity. You can assign staff and edit the details before saving.</p>
              </div>
              <div className="quick-plan-actions">
                {taskTemplates.map((template) => <button key={template.category} onClick={() => {
                  setTaskForm({ category: template.category, title: template.title, details: template.details, priority: "Normal", status: "Pending", dueDate: isoDate() });
                  setShowTaskForm(true);
                }}><span>{template.icon}</span><strong>{template.title}</strong><small>{template.category}</small></button>)}
              </div>
            </section>
            <article className="today-planner">
              {([
                ["urgent", "Urgent", "No urgent issues. Everything is under control."],
                ["today", "Today", "No scheduled work for today."],
                ["routine", "Stock check", "Stock levels look healthy."],
              ] as const).map(([group, label, empty]) => {
                const rows = todayActionItems.filter((item) => item.group === group);
                return <section className={`today-group ${group}`} key={group}>
                  <header><div><span className="today-dot" /><h2>{label}</h2></div><strong>{rows.length}</strong></header>
                  <div className="today-list">
                    {rows.slice(0, group === "routine" ? 5 : 8).map((item) => <div className="today-item" key={item.id}>
                      <span className="today-icon">{item.icon}</span>
                      <button className="today-copy" onClick={item.open}><strong>{item.title}</strong><small>{item.detail}</small></button>
                      <button className="today-action" onClick={() => (item.perform || item.open)()}>{item.action} →</button>
                    </div>)}
                    {!rows.length && <div className="today-empty">✓ {empty}</div>}
                  </div>
                </section>;
              })}
              <section className={`completed-panel ${showCompletedTasks ? "open" : ""}`}>
                <button className="completed-toggle" onClick={() => setShowCompletedTasks((value) => !value)}>
                  <span><b>✓</b><strong>Completed history</strong><small>{completedTasks.length} saved · nothing is lost</small></span>
                  <em>{showCompletedTasks ? "Hide" : "View"} history</em>
                </button>
                {showCompletedTasks && <div className="completed-list">
                  {completedTasks.slice(0, 8).map((task) => <div className="completed-row" key={task.id}>
                    <span>✓</span>
                    <div><strong>{task.title}</strong><small>{task.category}{task.assignedTo ? ` · ${task.assignedTo}` : ""}{task.updatedAt ? ` · ${shortDate(task.updatedAt)}` : ""}</small></div>
                    <button onClick={() => mutate({ action: "saveTask", task: { ...task, status: "Pending" } }, "Task reopened and moved back to the active list.")}>Reopen</button>
                  </div>)}
                  {!completedTasks.length && <div className="today-empty">Completed tasks will stay safely visible here.</div>}
                </div>}
              </section>
              <footer><button onClick={() => { setOperationsTab("tasks"); setTaskFilter("active"); setActive("operations"); }}>Manage active tasks</button><button onClick={() => { setOperationsTab("tasks"); setTaskFilter("completed"); setActive("operations"); }}>Full completed history</button><button onClick={() => { setOperationsTab("customers"); setActive("operations"); }}>Customer follow-ups</button></footer>
            </article>
            <div className="dashboard-grid">
              <article className="dashboard-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">Stock attention</span>
                    <h2>Low & out of stock</h2>
                  </div>
                  <button onClick={() => setActive("products")}>
                    View stock →
                  </button>
                </div>
                <div className="mini-list">
                  {state.products
                    .filter((product) => product.stockQty <= 2)
                    .slice(0, 7)
                    .map((product) => (
                      <button
                        key={product.id}
                        onClick={() => editProduct(product)}
                      >
                        <ProductThumb product={product} />
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {product.code} · {product.category}
                          </small>
                        </span>
                        <em className={product.stockQty <= 0 ? "out" : "low"}>
                          {product.stockQty <= 0
                            ? "Out"
                            : `${product.stockQty} left`}
                        </em>
                      </button>
                    ))}
                  {!state.products.some((product) => product.stockQty <= 2) && (
                    <div className="empty-mini">
                      All products have healthy stock.
                    </div>
                  )}
                </div>
              </article>
              <article className="dashboard-card">
                <div className="card-heading">
                  <div>
                    <span className="eyebrow">Delivery desk</span>
                    <h2>Next commitments</h2>
                  </div>
                  <button onClick={() => setActive("deliveries")}>
                    All deliveries →
                  </button>
                </div>
                <div className="mini-list">
                  {activeBills
                    .filter((bill) => bill.deliveryStatus !== "Delivered")
                    .sort((a, b) =>
                      (a.deliveryDate || "9999").localeCompare(
                        b.deliveryDate || "9999",
                      ),
                    )
                    .slice(0, 7)
                    .map((bill) => (
                      <button
                        key={bill.id}
                        onClick={() => setSelectedBill(bill)}
                      >
                        <span className="mini-date">
                          {bill.deliveryDate ? bill.deliveryDate.slice(5) : "—"}
                        </span>
                        <span>
                          <strong>{bill.customerName}</strong>
                          <small>
                            {bill.billNo} · {bill.customerPhone}
                          </small>
                        </span>
                        <em className={deliveryBucket(bill)}>
                          {deliveryLabel(deliveryBucket(bill))}
                        </em>
                      </button>
                    ))}
                </div>
              </article>
            </div>
            <article className="staff-performance dashboard-card">
              <div className="card-heading">
                <div><span className="eyebrow">Monthly team observation · {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span><h2>Order booking staff performance</h2><p>Orders, products, sales, collection and delivery progress for this month.</p></div>
                <button onClick={() => { setReportType("staff"); setReportFrom(`${currentMonth}-01`); setReportTo(isoDate()); setActive("reports"); }}>Open full report →</button>
              </div>
              <div className="staff-performance-list">
                {staffPerformance.slice(0, 6).map((row, index) => <div className="staff-performance-row" key={row.staff}>
                  <span className="staff-rank">{index + 1}</span>
                  <div className="staff-name"><strong>{row.staff}</strong><small>{row.orders} orders · {row.items} products</small></div>
                  <span><b>{money(row.sales)}</b><small>Booked</small></span>
                  <span><b>{money(row.collected)}</b><small>Collected</small></span>
                  <span className={row.balance > 0 ? "needs-attention" : ""}><b>{money(row.balance)}</b><small>Balance</small></span>
                  <span><b>{row.delivered}/{row.orders}</b><small>Delivered</small></span>
                </div>)}
                {!staffPerformance.length && <div className="empty-mini">This month’s staff performance will appear after the first saved order.</div>}
              </div>
            </article>
          </section>
        )}

        {active === "billing" && (
          <section className={`billing-layout wizard-step-${billingStep}`}>
            <div className="billing-progress" aria-label="Billing progress">
              {([1, 2, 3] as const).map((step) => <button key={step} className={billingStep === step ? "active" : billingStep > step ? "done" : ""} onClick={() => { if (step < billingStep) { setMobileSummaryOpen(false); setBillingStep(step); } }} disabled={step > billingStep}>
                <span>{billingStep > step ? "✓" : step}</span><div><strong>{step === 1 ? "Customer" : step === 2 ? "Products" : "Payment"}</strong><small>{step === 1 ? "Name & delivery" : step === 2 ? "Choose items" : "Review & save"}</small></div>
              </button>)}
              <p>{cart.reduce((sum, item) => sum + item.qty, 0)} items · {money(grandTotal)} <em>{online ? "Draft auto-saved" : "Offline draft safe"}</em></p>
            </div>
            <div className={`catalog-panel ${billingStep !== 2 ? "wizard-hidden" : ""}`}>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Showroom order desk</span>
                  <h1>Book a furniture order, clearly.</h1>
                  <p>Select products, confirm delivery, collect advance and print the order slip.</p>
                  <p>
                    QR scan, stock split and GST-inclusive pricing are ready.
                  </p>
                </div>
                <div className="today-pill">
                  <span>Today</span>
                  <strong>{money(todaySales)}</strong>
                  <small>{todayBills.length} confirmed orders</small>
                </div>
              </div>
              <div className="search-with-action">
                <label className="search-box">
                  <span>⌕</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search product or code…"
                  />
                  <kbd>F2</kbd>
                </label>
                <button className="scan-button" onClick={startScanner}>
                  ▣ Scan QR
                </button>
              </div>
              <div className="category-row">
                {categories.map((item) => (
                  <button
                    key={item}
                    className={category === item ? "active" : ""}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="product-grid">
                {filteredProducts.map((product) => (
                  <article className="product-card" key={product.id}>
                    <button
                      className="product-hit"
                      onClick={() => addToCart(product)}
                    >
                      <ProductVisual product={product} />
                      <div className="product-copy">
                        <div className="product-meta">
                          <span>{product.category}</span>
                          <em className={product.stockQty <= 2 ? "low" : ""}>
                            {product.stockQty > 0
                              ? `${product.stockQty} ready`
                              : "Order only"}
                          </em>
                        </div>
                        <h3>{product.name}</h3>
                        <p>
                          {[product.size, product.woodType]
                            .filter(Boolean)
                            .join(" · ") || product.code}
                        </p>
                        <div className="price-line">
                          <strong>{money(product.price)}</strong>
                          {product.mrp > product.price && (
                            <del>{money(product.mrp)}</del>
                          )}
                          <span>＋</span>
                        </div>
                      </div>
                    </button>
                  </article>
                ))}
              </div>
            </div>
            {billingStep === 2 && <><button className="mobile-bill-bar" onClick={() => setMobileSummaryOpen(true)}><span><b>{cart.reduce((sum, item) => sum + item.qty, 0)}</b> Bill summary</span><strong>{money(grandTotal)}</strong><em>View bill ↑</em></button>{mobileSummaryOpen && <button className="mobile-summary-backdrop" aria-label="Close bill summary" onClick={() => setMobileSummaryOpen(false)} />}</>}
            <aside className={`cart-panel wizard-cart step-${billingStep} ${mobileSummaryOpen ? "mobile-open" : ""}`}>
              <div className="cart-title">
                <div>
                  <span className="eyebrow">Step {billingStep} of 3</span>
                  <h2>{billingStep === 1 ? "Customer & delivery" : billingStep === 2 ? "Bill summary" : "Payment & confirm"}</h2>
                </div>
                <span className="count-badge">
                  {cart.reduce((sum, item) => sum + item.qty, 0)}
                </span>
                {billingStep === 2 && <button className="mobile-summary-close" onClick={() => setMobileSummaryOpen(false)} aria-label="Close bill summary">×</button>}
              </div>
              <div className={`cart-items ${billingStep !== 2 ? "wizard-hidden" : ""}`}>
                {cart.map((item, index) => (
                  <div
                    className="cart-item expanded"
                    key={`${item.id}-${item.againstOrder}-${index}`}
                  >
                    <ProductThumb product={item} />
                    <div className="cart-item-main">
                      <div className="cart-item-head">
                        <strong>{item.name}</strong>
                        <button className="remove-cart-line" onClick={() => removeCart(index)} aria-label={`Remove ${item.name}`}>Remove</button>
                      </div>
                      <small>
                        {item.code} · Size {item.size || "—"} · Ready stock {item.stockQty}
                      </small>
                      <div className="cart-controls">
                        <div className="stepper">
                          <button
                            onClick={() => changeQty(index, item.qty - 1)}
                          >
                            −
                          </button>
                          <input
                            value={item.qty}
                            type="number"
                            min="1"
                            onChange={(event) =>
                              changeQty(index, Number(event.target.value) || 1)
                            }
                          />
                          <button
                            onClick={() => changeQty(index, item.qty + 1)}
                          >
                            ＋
                          </button>
                        </div>
                        <label className="line-price-field"><span>Unit price</span><input
                            className="line-price"
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(event) => updateCart(index, { price: Math.max(0, Number(event.target.value)) })}
                            aria-label="Unit price"
                          /></label>
                      </div>
                      <select
                        className={`order-select ${item.againstOrder ? "against" : "stock"}`}
                        value={item.againstOrder ? "against" : "stock"}
                        onChange={(event) =>
                          changeOrderType(
                            index,
                            event.target.value === "against",
                          )
                        }
                      >
                        <option value="stock">Stock</option>
                        <option value="against">Against Order</option>
                      </select>
                      {item.againstOrder && (
                        <div className="against-fields">
                          <input
                            type="number"
                            min="0"
                            value={item.againstOrderExtra || ""}
                            onChange={(event) =>
                              updateCart(index, {
                                againstOrderExtra: Math.max(
                                  0,
                                  Number(event.target.value),
                                ),
                              })
                            }
                            placeholder="Extra charge"
                          />
                          <input
                            value={item.customizeDetails}
                            onChange={(event) =>
                              updateCart(index, {
                                customizeDetails: event.target.value,
                              })
                            }
                            placeholder="Customize details"
                          />
                        </div>
                      )}
                      <div className="line-total">
                        <span>
                          {item.qty} × {money(item.price)}
                          {item.againstOrderExtra
                            ? ` + ${money(item.againstOrderExtra)}`
                            : ""}
                        </span>
                        <strong>
                          {money(
                            item.qty * item.price + item.againstOrderExtra,
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
                {!cart.length && (
                  <div className="cart-empty">
                    <span>＋</span>
                    <strong>Your order is empty</strong>
                    <small>Tap a product or scan its QR code.</small>
                  </div>
                )}
              </div>
              {billingStep === 2 && <div className="wizard-actions single"><button className="primary-action" disabled={!cart.length} onClick={continueBilling}>Continue to payment <span>→</span></button></div>}
              <div className="cart-scroll-area">
              <div className={`customer-fields ${billingStep !== 1 ? "wizard-hidden" : ""}`}>
                <div className="field-pair">
                  <label>
                    Customer name
                    <input
                      value={customer.name}
                      onChange={(event) =>
                        setCustomer({ ...customer, name: event.target.value })
                      }
                      placeholder="Required"
                    />
                  </label>
                  <label>
                    Mobile
                    <input
                      inputMode="tel"
                      value={customer.phone}
                      onChange={(event) =>
                        handleCustomerPhone(event.target.value)
                      }
                      placeholder="Required"
                    />
                    {customerHint && (
                      <small className="customer-hint">{customerHint}</small>
                    )}
                  </label>
                </div>
                <label>
                  Address
                  <textarea
                    rows={2}
                    value={customer.address}
                    onChange={(event) =>
                      setCustomer({ ...customer, address: event.target.value })
                    }
                    placeholder="Optional"
                  />
                </label>
                <label>Expected delivery<input type="date" value={customer.deliveryDate} onChange={(event) => setCustomer({ ...customer, deliveryDate: event.target.value })} required /></label>
                <details className="more-details">
                  <summary><span><b>More details</b><small>Staff, accountant, manager and notes</small></span><em>＋</em></summary>
                  <div className="more-details-body">
                    <div className="field-pair">
                      <label>Order booking staff<input list="staff-list" value={customer.staffName} onChange={(event) => setCustomer({ ...customer, staffName: event.target.value })} /><datalist id="staff-list">{state.settings.staffNames.map((item) => <option value={item} key={item} />)}</datalist></label>
                      <label>Accountant<input list="staff-list" value={customer.accountantName} onChange={(event) => setCustomer({ ...customer, accountantName: event.target.value })} /></label>
                    </div>
                    <div className="field-pair"><label>Manager<input list="staff-list" value={customer.managerName} onChange={(event) => setCustomer({ ...customer, managerName: event.target.value })} /></label><label>Order notes<textarea rows={3} value={customer.orderNotes} onChange={(event) => setCustomer({ ...customer, orderNotes: event.target.value })} placeholder="Transport, customization or advance terms…" /></label></div>
                  </div>
                </details>
                <div className="wizard-actions single"><button className="primary-action" onClick={continueBilling}>Continue to products <span>→</span></button></div>
              </div>
              <div className={`checkout-step ${billingStep !== 3 ? "wizard-hidden" : ""}`}>
              <div className="totals detailed">
                <div>
                  <span>Items total</span>
                  <strong>{money(subtotal)}</strong>
                </div>
                <label>
                  <span>Discount</span>
                  <span className="discount-control">
                    <select
                      value={discountType}
                      onChange={(event) =>
                        setDiscountType(
                          event.target.value as "amount" | "percent",
                        )
                      }
                    >
                      <option value="amount">₹</option>
                      <option value="percent">%</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={discountValue || ""}
                      onChange={(event) =>
                        setDiscountValue(
                          Math.max(0, Number(event.target.value)),
                        )
                      }
                    />
                  </span>
                </label>
                <div>
                  <span>Taxable value</span>
                  <strong>{money(taxableValue)}</strong>
                </div>
                <div>
                  <span>CGST {state.settings.gstRate / 2}%</span>
                  <strong>{money(cgst)}</strong>
                </div>
                <div>
                  <span>SGST {state.settings.gstRate / 2}%</span>
                  <strong>{money(sgst)}</strong>
                </div>
                <small className="gst-note">
                  Showroom price is GST inclusive · GST is split, not added again.
                </small>
                <div className="grand-total">
                  <span>Grand total</span>
                  <strong>{money(grandTotal)}</strong>
                </div>
              </div>
              <div className="charge-fields">
                {paymentMode === "CARD" && (
                  <label>
                    Card charge (extra)
                    <input type="number" min="0" value={cardCharge || ""} onChange={(event) => setCardCharge(Math.max(0, Number(event.target.value)))} />
                  </label>
                )}
                <label>
                  Transport charge
                  <input type="number" min="0" value={transportCharge || ""} onChange={(event) => setTransportCharge(Math.max(0, Number(event.target.value)))} />
                </label>
                <label>
                  Other charge
                  <input type="number" min="0" value={otherCharge || ""} onChange={(event) => setOtherCharge(Math.max(0, Number(event.target.value)))} />
                </label>
              </div>
              <div className="extra-total"><span>Extra charges</span><strong>{money(extraCharges)}</strong></div>
              <div className="pay-buttons">
                {paymentModes.map((mode) => (
                  <button
                    key={mode}
                    className={paymentMode === mode ? "active" : ""}
                    onClick={() => {
                      setPaymentMode(mode);
                      if (mode !== "CARD") setCardCharge(0);
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="payment-pair">
                <label>
                  Advance
                  <input
                    type="number"
                    min="0"
                    max={grandTotal}
                    value={paidAmount || ""}
                    onChange={(event) =>
                      setPaidAmount(
                        Math.min(
                          grandTotal,
                          Math.max(0, Number(event.target.value)),
                        ),
                      )
                    }
                  />
                </label>
                <div>
                  <span>Balance</span>
                  <strong>{money(balance)}</strong>
                </div>
              </div>
              <div className="wizard-actions"><button className="secondary-action" onClick={() => setBillingStep(2)}>← Back</button><button
                  className="primary-action"
                  disabled={!cart.length || busy || !online}
                  onClick={confirmBill}
                >
                  {busy ? "Syncing…" : online ? "Save order slip" : "Connect to save"}
                  <span>→</span>
                </button></div>
              <p className="order-number-note">Order number is automatic, unique and continues from the last saved order.</p>
              <p className="stock-note">
                Atomic stock check prevents the same last piece being sold
                twice.
              </p>
              </div>
              </div>
            </aside>
          </section>
        )}

        {active === "products" && (
          <section className="page-section">
            <div className="section-heading with-actions">
              <div>
                <span className="eyebrow">Inventory & images</span>
                <h1>Every piece, pictured.</h1>
                <p>
                  Excel-embedded images and Product Code image files both sync
                  to stock.
                </p>
              </div>
              <div className="heading-actions wrap">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  hidden
                  onChange={importExcel}
                />
                <input
                  ref={bulkImagesRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={importBulkImages}
                />
                <button className="secondary-action" onClick={downloadTemplate}>
                  ↓ Template
                </button>
                <button
                  className="secondary-action"
                  onClick={() => fileRef.current?.click()}
                >
                  ↑ Import Excel
                </button>
                <button
                  className="secondary-action"
                  onClick={() => bulkImagesRef.current?.click()}
                >
                  ▧ Bulk images
                </button>
                <button
                  className="primary-small"
                  onClick={() => {
                    setProductForm(EMPTY_PRODUCT);
                    setShowProductForm(true);
                  }}
                >
                  ＋ Add product
                </button>
              </div>
            </div>
            <div className="metric-grid">
              <Metric
                label="Product models"
                value={String(state.products.length)}
                note="Active catalogue"
              />
              <Metric
                label="Ready stock"
                value={String(totalStock)}
                note="Pieces available"
              />
              <Metric
                label="Inventory value"
                value={money(inventoryValue)}
                note="At showroom price"
              />
              <Metric
                label="Low / out stock"
                value={String(
                  state.products.filter((product) => product.stockQty <= 2)
                    .length,
                )}
                note="Needs attention"
                alert
              />
            </div>
            <div className="inventory-toolbar">
              <label className="search-box compact-search">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find in inventory…"
                />
              </label>
              <div className="stock-filters" aria-label="Stock filters">
                {[["all", "All"], ["available", "Available"], ["low", "Low"], ["out", "Out"]].map(([key, label]) => <button key={key} className={stockFilter === key ? "active" : ""} onClick={() => setStockFilter(key)}>{label}</button>)}
              </div>
              <button className="text-button" onClick={() => load()}>
                ↻ Refresh stock
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Specification</th>
                    <th>Showroom price</th>
                    <th>Stock</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {inventoryProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="table-product">
                          <ProductThumb product={product} />
                          <div>
                            <strong>{product.name}</strong>
                            <small>
                              {product.code} · HSN {product.hsnCode || "—"}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="soft-tag">{product.category}</span>
                      </td>
                      <td>
                        {[product.size, product.woodType]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td>
                        <strong>{money(product.price)}</strong>
                        {product.mrp > 0 && (
                          <small className="block-muted">
                            MRP {money(product.mrp)}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className={`stock-control ${product.stockQty <= 2 ? "low" : ""}`}>
                          <button disabled={busy || product.stockQty <= 0} onClick={() => adjustStock(product, -1)} aria-label={`Reduce ${product.name} stock`}>−</button>
                          <strong>{product.stockQty}</strong>
                          <button disabled={busy} onClick={() => adjustStock(product, 1)} aria-label={`Add one ${product.name}`}>＋</button>
                          <button className="stock-in" disabled={busy} onClick={() => stockIn(product)}>Stock in</button>
                        </div>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button onClick={() => setQrProduct(product)}>
                            QR
                          </button>
                          <button onClick={() => editProduct(product)}>
                            Edit
                          </button>
                          <button
                            className="danger-link"
                            onClick={() =>
                              window.confirm(`Delete ${product.name}?`) &&
                              mutate(
                                { action: "deleteProduct", id: product.id },
                                "Product and image deleted.",
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {active === "bills" && (
          <section className="page-section">
            <div className="section-heading with-actions">
              <div>
                <span className="eyebrow">Order history</span>
                <h1>Orders, payments & balances.</h1>
                <p>View, update, print, export, share or cancel every order.</p>
              </div>
              <button
                className="secondary-action"
                onClick={async () => {
                  const data = buildReport(
                    "sales",
                    activeBills,
                    state.products,
                    "",
                    "",
                    () => true,
                    state.settings.gstRate,
                    state.suppliers,
                    state.tasks,
                    state.interactions,
                    state.supplierAssignments,
                  );
                  const XLSX = await import("xlsx");
                  const workbook = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(
                    workbook,
                    XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]),
                    "Sales History",
                  );
                  XLSX.writeFile(workbook, `sales-history-${isoDate()}.xlsx`);
                }}
              >
                ↓ Sales Excel
              </button>
            </div>
            <div className="inventory-toolbar">
              <label className="search-box compact-search">
                <span>⌕</span>
                <input
                  value={billSearch}
                  onChange={(event) => setBillSearch(event.target.value)}
                  placeholder="Order no, customer, phone, staff or counter…"
                />
              </label>
              <button className="text-button" onClick={() => load()}>
                ↻ Sync orders
              </button>
            </div>
            <div className="bill-list">
              {filteredBills.map((bill) => (
                <article
                  className={`bill-row ${bill.status === "cancelled" ? "cancelled" : ""}`}
                  key={bill.id}
                >
                  <button
                    className="bill-main"
                    onClick={() => setSelectedBill(bill)}
                  >
                    <div className="bill-id">
                      <span>{bill.billNo}</span>
                      <small>{shortDate(bill.createdAt)}</small>
                    </div>
                    <div>
                      <strong>{bill.customerName}</strong>
                      <small>
                        {bill.customerPhone} · {bill.staffName || "No staff"}
                      </small>
                      <small className="bill-product-summary">{bill.items.slice(0, 2).map((item) => `${item.name}${item.size ? ` (${item.size})` : ""}`).join(" · ")}{bill.items.length > 2 ? ` · +${bill.items.length - 2} more` : ""}</small>
                    </div>
                    <div>
                      <span
                        className={`payment-status ${bill.status === "cancelled" ? "cancelled" : bill.balanceAmount > 0 ? "due" : "paid"}`}
                      >
                        {bill.status === "cancelled"
                          ? "Cancelled"
                          : bill.balanceAmount > 0
                            ? `${money(bill.balanceAmount)} due`
                            : "Paid"}
                      </span>
                      <small>
                        {bill.counterName || "—"} · {bill.paymentMode}
                      </small>
                    </div>
                    <strong className="bill-total">
                      {money(bill.grandTotal)}
                    </strong>
                    <span className="chevron">›</span>
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {active === "deliveries" && (
          <section className="page-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Delivery desk</span>
                <h1>Promise dates, under control.</h1>
                <p>Track today, upcoming, overdue and completed deliveries.</p>
              </div>
            </div>
            <div className="metric-grid">
              <Metric
                label="Today"
                value={String(deliveryCounts.today)}
                note="Due today"
              />
              <Metric
                label="Upcoming"
                value={String(deliveryCounts.upcoming)}
                note="Future dates"
              />
              <Metric
                label="Pending / overdue"
                value={String(deliveryCounts.pending)}
                note="Needs follow-up"
                alert
              />
              <Metric
                label="Delivered"
                value={String(deliveryCounts.delivered)}
                note="Completed"
              />
            </div>
            <section className="delivery-timeline-board">
              <div className="card-heading"><div><span className="eyebrow">Customer & delivery timeline</span><h2>Every promise, stage by stage</h2><p>Open an order to see products, payments and customer details.</p></div></div>
              <div className="timeline-orders">
                {activeBills.filter((bill) => bill.deliveryStatus !== "Delivered").slice(0, 6).map((bill) => {
                  const currentIndex = Math.max(0, deliveryStages.indexOf(bill.deliveryStatus || "Order Booked"));
                  return <button className="timeline-order" key={bill.id} onClick={() => setSelectedBill(bill)}>
                    <div className="timeline-customer"><span>{bill.customerName.slice(0, 1).toUpperCase()}</span><div><strong>{bill.customerName}</strong><small>{bill.billNo} · {bill.customerPhone} · Due {bill.deliveryDate || "not set"}</small></div><b>{money(bill.balanceAmount)} due</b></div>
                    <div className="timeline-track">{deliveryStages.map((stage, index) => <span className={index < currentIndex ? "done" : index === currentIndex ? "current" : ""} key={stage}><i>{index <= currentIndex ? "✓" : index + 1}</i><small>{stage}</small></span>)}</div>
                  </button>;
                })}
                {!activeBills.some((bill) => bill.deliveryStatus !== "Delivered") && <div className="today-empty">All active customer deliveries are complete.</div>}
              </div>
            </section>
            <div className="filter-row">
              {["all", "today", "upcoming", "pending", "delivered"].map(
                (filter) => (
                  <button
                    key={filter}
                    className={deliveryFilter === filter ? "active" : ""}
                    onClick={() => setDeliveryFilter(filter)}
                  >
                    {filter === "all" ? "All" : deliveryLabel(filter)}
                  </button>
                ),
              )}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Bill</th>
                    <th>Customer</th>
                    <th>Expected date</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {deliveryBills.map((bill) => {
                    const bucket = deliveryBucket(bill);
                    return (
                      <tr key={bill.id}>
                        <td>
                          <strong>{bill.billNo}</strong>
                          <small className="block-muted">
                            {shortDate(bill.createdAt)}
                          </small>
                        </td>
                        <td>
                          {bill.customerName}
                          <small className="block-muted">
                            {bill.customerPhone}
                          </small>
                        </td>
                        <td>{bill.deliveryDate || "Not set"}</td>
                        <td>{money(bill.balanceAmount)}</td>
                        <td>
                          <span className={`delivery-status ${bucket}`}>
                            {deliveryLabel(bucket)}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button onClick={() => setSelectedBill(bill)}>
                              View
                            </button>
                            <button
                              onClick={() =>
                                mutate(
                                  {
                                    action: "setDelivery",
                                    id: bill.id,
                                    delivered: bucket !== "delivered",
                                  },
                                  bucket !== "delivered"
                                    ? "Marked delivered."
                                    : "Delivery moved back to pending.",
                                )
                              }
                            >
                              {bucket !== "delivered"
                                ? "Mark delivered"
                                : "Undo"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {active === "operations" && (
          <section className="page-section operations-page">
            <div className="section-heading with-actions">
              <div><span className="eyebrow">Task centre</span><h1>Plan work. Finish it. Keep the history.</h1><p>Follow-ups, cleaning, marketing, development, commitments, complaints and service work in one simple place.</p></div>
              <div className="heading-actions">
                <button className="secondary-action" onClick={() => { setTaskForm({ category: "Follow-up", priority: "Normal", status: "Pending", dueDate: isoDate() }); setShowTaskForm(true); }}>＋ Add task</button>
                <button className="primary-small" onClick={() => { setInteractionForm({ type: "Follow-up", status: "Open", nextFollowUp: isoDate() }); setShowInteractionForm(true); }}>＋ Customer activity</button>
              </div>
            </div>
            <div className="metric-grid">
              <Metric label="Open tasks" value={String(openTasks.length)} note={`${dueTasks.length} due now`} alert={dueTasks.length > 0} />
              <Metric label="Follow-ups due" value={String(followUpsDue.length)} note="Today / overdue" alert={followUpsDue.length > 0} />
              <Metric label="Open complaints" value={String(openComplaints.length)} note="Needs closure" alert={openComplaints.length > 0} />
              <Metric label="Customer records" value={String(new Set(activeBills.map((bill) => normalizePhone(bill.customerPhone)).filter(Boolean)).size)} note="From billing history" />
            </div>
            <div className="filter-row operation-tabs">
              <button className={operationsTab === "tasks" ? "active" : ""} onClick={() => setOperationsTab("tasks")}>Tasks & schedules</button>
              <button className={operationsTab === "customers" ? "active" : ""} onClick={() => setOperationsTab("customers")}>Customer follow-up & service</button>
            </div>
            {operationsTab === "tasks" ? (
              <><div className="task-filter" role="group" aria-label="Task history filter">
                <button className={taskFilter === "active" ? "active" : ""} onClick={() => setTaskFilter("active")}>Active <span>{openTasks.length}</span></button>
                <button className={taskFilter === "completed" ? "active" : ""} onClick={() => setTaskFilter("completed")}>Completed <span>{completedTasks.length}</span></button>
                <button className={taskFilter === "all" ? "active" : ""} onClick={() => setTaskFilter("all")}>All <span>{state.tasks.length}</span></button>
              </div><div className="table-wrap"><table><thead><tr><th>Task</th><th>Category</th><th>Assigned</th><th>Due</th><th>Priority</th><th>Status</th><th /></tr></thead><tbody>
                {visibleTasks.map((task) => <tr key={task.id} className={task.status !== "Completed" && task.dueDate && task.dueDate < isoDate() ? "overdue-row" : ""}>
                  <td><strong>{task.title}</strong><small className="block-muted">{task.details || "No details"}</small></td><td>{task.category}</td><td>{task.assignedTo || "—"}</td><td>{task.dueDate || "Not set"}</td><td><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></td><td>{task.status}</td>
                  <td><div className="row-actions"><button onClick={() => mutate({ action: "saveTask", task: { ...task, status: task.status === "Completed" ? "Pending" : "Completed" } }, task.status === "Completed" ? "Task reopened." : "Task completed.")}>{task.status === "Completed" ? "Reopen" : "Done"}</button><button onClick={() => { setTaskForm(task); setShowTaskForm(true); }}>Edit</button><button className="danger-link" onClick={() => mutate({ action: "deleteTask", id: task.id }, "Task deleted.")}>Delete</button></div></td>
                </tr>)}
                {!visibleTasks.length && <tr><td colSpan={7} className="empty-table">{taskFilter === "completed" ? "No completed tasks yet. Finished work will remain here." : taskFilter === "active" ? "No active tasks. Add a showroom activity or reopen one from Completed." : "No tasks yet. Add your first showroom activity."}</td></tr>}
              </tbody></table></div></>
            ) : (
              <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Type</th><th>Details</th><th>Assigned</th><th>Next follow-up</th><th>Status</th><th /></tr></thead><tbody>
                {state.interactions.map((item) => { const priorBills = activeBills.filter((bill) => normalizePhone(bill.customerPhone) === normalizePhone(item.customerPhone)); return <tr key={item.id} className={item.status !== "Closed" && item.nextFollowUp && item.nextFollowUp < isoDate() ? "overdue-row" : ""}>
                  <td><strong>{item.customerName}</strong><small className="block-muted">{item.customerPhone} · {priorBills.length ? `Existing · ${priorBills.length} bill${priorBills.length > 1 ? "s" : ""}` : "New customer"}</small></td><td><span className={`interaction-type ${item.type.toLowerCase().replace(/\s+/g, "-")}`}>{item.type}</span></td><td>{item.details || "—"}</td><td>{item.assignedTo || "—"}</td><td>{item.nextFollowUp || "Not set"}</td><td>{item.status}</td>
                  <td><div className="row-actions"><button onClick={() => mutate({ action: "saveInteraction", interaction: { ...item, status: item.status === "Closed" ? "Open" : "Closed" } }, item.status === "Closed" ? "Activity reopened." : "Activity closed.")}>{item.status === "Closed" ? "Reopen" : "Close"}</button><button onClick={() => { setInteractionForm(item); setShowInteractionForm(true); }}>Edit</button><button className="danger-link" onClick={() => mutate({ action: "deleteInteraction", id: item.id }, "Customer activity deleted.")}>Delete</button></div></td>
                </tr>})}
                {!state.interactions.length && <tr><td colSpan={7} className="empty-table">No customer follow-ups, enquiries or complaints yet.</td></tr>}
              </tbody></table></div>
            )}
          </section>
        )}

        {active === "suppliers" && (
          <section className="page-section suppliers-page">
            <div className="section-heading with-actions">
              <div><span className="eyebrow">Supplier control</span><h1>Purchases and supplier promises.</h1><p>Assign Against Order items, track purchase cost, advance, balance and expected arrival.</p></div>
              <button className="primary-small" onClick={() => { setSupplierForm({ status: "Active" }); setShowSupplierForm(true); }}>＋ Add supplier</button>
            </div>
            <div className="metric-grid">
              <Metric label="Active suppliers" value={String(state.suppliers.filter((supplier) => supplier.status === "Active").length)} note={`${state.suppliers.length} total`} />
              <Metric label="Open purchase orders" value={String(supplierOrdersOpen.length)} note="Not received / closed" />
              <Metric label="Supplier delays" value={String(supplierOrdersDelayed.length)} note="Past expected date" alert={supplierOrdersDelayed.length > 0} />
              <Metric label="Supplier balance" value={money(supplierPending)} note="Purchase cost minus advance" alert={supplierPending > 0} />
            </div>
            <article className="dashboard-card wide-card"><div className="card-heading"><div><span className="eyebrow">Supplier master</span><h2>Contacts and categories</h2></div></div>
              <div className="table-wrap"><table><thead><tr><th>Supplier</th><th>Phone</th><th>GSTIN</th><th>Categories</th><th>Status</th><th /></tr></thead><tbody>
                {state.suppliers.map((supplier) => <tr key={supplier.id}><td><strong>{supplier.name}</strong><small className="block-muted">{supplier.contactPerson || supplier.address || "—"}</small></td><td>{supplier.phone}</td><td>{supplier.gstin || "—"}</td><td>{supplier.categories || "All / not specified"}</td><td>{supplier.status}</td><td><div className="row-actions"><button onClick={() => { setSupplierForm(supplier); setShowSupplierForm(true); }}>Edit</button><button className="danger-link" onClick={() => mutate({ action: "deleteSupplier", id: supplier.id }, "Supplier deleted.")}>Delete</button></div></td></tr>)}
                {!state.suppliers.length && <tr><td colSpan={6} className="empty-table">Add suppliers before assigning Against Order products.</td></tr>}
              </tbody></table></div>
            </article>
            <article className="dashboard-card wide-card"><div className="card-heading"><div><span className="eyebrow">Supplier assignments</span><h2>Purchase order tracker</h2></div></div>
              <div className="table-wrap"><table><thead><tr><th>Bill / Product</th><th>Supplier</th><th>Cost</th><th>Advance</th><th>Balance</th><th>Expected</th><th>Status</th><th /></tr></thead><tbody>
                {state.supplierAssignments.map((assignment) => { const supplier = state.suppliers.find((item) => item.id === assignment.supplierId); return <tr key={assignment.id} className={assignment.expectedDate && assignment.expectedDate < isoDate() && !["Received", "Closed", "Cancelled"].includes(assignment.status) ? "overdue-row" : ""}><td><strong>{assignment.billNo} · {assignment.productName}</strong><small className="block-muted">{assignment.productCode} · Qty {assignment.qty}</small></td><td>{supplier?.name || "Unknown supplier"}</td><td>{money(assignment.purchaseCost)}</td><td>{money(assignment.advancePaid)}</td><td>{money(Math.max(0, assignment.purchaseCost - assignment.advancePaid))}</td><td>{assignment.expectedDate || "Not set"}</td><td>{assignment.status}</td><td><div className="row-actions"><button onClick={() => editAssignment(assignment)}>Update</button><button className="danger-link" onClick={() => mutate({ action: "deleteSupplierAssignment", id: assignment.id }, "Supplier assignment deleted.")}>Delete</button></div></td></tr>})}
                {!state.supplierAssignments.length && <tr><td colSpan={8} className="empty-table">Supplier assignments will appear here after an Against Order bill.</td></tr>}
              </tbody></table></div>
            </article>
          </section>
        )}

        {active === "reports" && (
          <section className="page-section reports-page">
            <div className="section-heading with-actions">
              <div>
                <span className="eyebrow">Management reports</span>
                <h1>Download the full picture.</h1>
                <p>
                  Sales, closing, GST, stock, delivery, staff and pending
                  amounts.
                </p>
              </div>
              <div className="heading-actions">
                <button className="secondary-action" onClick={printReport}>
                  Print / Save PDF
                </button>
                <button className="primary-small" onClick={downloadReport}>
                  ↓ Download Excel
                </button>
              </div>
            </div>
            <div className="report-filter">
              <label>
                From date
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(event) => setReportFrom(event.target.value)}
                />
              </label>
              <label>
                To date
                <input
                  type="date"
                  value={reportTo}
                  onChange={(event) => setReportTo(event.target.value)}
                />
              </label>
              <div>
                <button
                  onClick={() => {
                    const date = isoDate();
                    setReportFrom(date);
                    setReportTo(date);
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => {
                    const now = new Date();
                    setReportFrom(
                      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
                    );
                    setReportTo(isoDate());
                  }}
                >
                  This month
                </button>
                <button
                  onClick={() => {
                    setReportFrom("");
                    setReportTo("");
                  }}
                >
                  All time
                </button>
              </div>
            </div>
            <div className="report-tabs">
              {[
                ["daily", "Daily Closing"],
                ["sales", "Sales"],
                ["delivery", "Delivery"],
                ["payment", "Payment Pending"],
                ["stock", "Stock"],
                ["staff", "Staff Performance"],
                ["against", "Against Order"],
                ["supplier", "Suppliers"],
                ["tasks", "Tasks"],
                ["followup", "Customer Follow-up"],
                ["complaints", "Complaints / Service"],
                ["gst", "GST"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={reportType === key ? "active" : ""}
                  onClick={() => setReportType(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="report-title">
              <div>
                <h2>{reportData.title}</h2>
                <p>{reportData.subtitle}</p>
              </div>
            </div>
            <div className="report-summary">
              {reportData.summary.map(([label, value]) => (
                <Metric key={label} label={label} value={value} note="" />
              ))}
            </div>
            <div className="table-wrap report-table">
              <table>
                <thead>
                  <tr>
                    {reportData.headers.map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>
                          {formatReportCell(
                            reportData.headers[cellIndex],
                            cell,
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {active === "settings" && (
          <section className="page-section settings-page">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Showroom setup</span>
                <h1>Business, GST & counters.</h1>
                <p>Invoice identity and counter suggestions sync everywhere.</p>
              </div>
            </div>
            <form className="settings-card" onSubmit={saveSettings}>
              <div className="form-section theme-section">
                <div><strong>App appearance</strong><p>Choose a comfortable colour theme. This selection stays on this device.</p></div>
                <div className="theme-grid">{themes.map((item) => <button type="button" className={theme === item.id ? "active" : ""} key={item.id} onClick={() => changeTheme(item.id)}><span>{item.colors.map((color) => <i key={color} style={{ background: color }} />)}</span><strong>{item.label}</strong>{theme === item.id && <em>Selected</em>}</button>)}</div>
              </div>
              <div className="form-section density-section">
                <div><strong>Display spacing</strong><p>Comfortable gives maximum breathing room. Compact shows more rows when needed.</p></div>
                <div className="density-picker"><button type="button" className={density === "comfortable" ? "active" : ""} onClick={() => changeDensity("comfortable")}><span>Comfortable</span><small>Large gaps · 48px controls · easiest to read</small></button><button type="button" className={density === "compact" ? "active" : ""} onClick={() => changeDensity("compact")}><span>Compact</span><small>More information · still touch friendly</small></button></div>
              </div>
              <div className="form-section safety-section">
                <div><strong>Backup & offline safety</strong><p>Download a complete JSON copy. The latest synced data and unfinished order draft also stay available on this device.</p></div>
                <div className="safety-actions"><button type="button" className="primary-small" onClick={downloadBackup}>↓ Download data backup</button><div className={`safety-status ${online ? "online" : "offline"}`}><span>●</span><strong>{online ? "Cloud sync active" : "Offline cache active"}</strong><small>{online ? "Supabase is connected" : "Reconnect before saving final bills"}</small></div></div>
              </div>
              <div className="form-section audit-section">
                <div><strong>Audit history</strong><p>Recent billing, stock, delivery, customer and settings changes are recorded across devices.</p></div>
                <div className="audit-list">{state.auditLogs.slice(0, 12).map((log) => <div key={log.id}><span>{log.entityType.slice(0, 1).toUpperCase()}</span><p><strong>{log.summary}</strong><small>{shortDate(log.createdAt)} · {log.action}</small></p></div>)}{!state.auditLogs.length && <div className="today-empty">New updates will appear here automatically.</div>}</div>
              </div>
              <div className="form-section">
                <div>
                  <strong>Business identity</strong>
                  <p>Shown on invoices and reports.</p>
                </div>
                <div className="form-grid">
                  <label className="wide">
                    Business name
                    <input
                      value={settingsForm.businessName}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          businessName: event.target.value,
                        })
                      }
                      required
                    />
                  </label>
                  <label>
                    Desk subtitle
                    <input
                      value={settingsForm.subtitle}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          subtitle: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    GSTIN
                    <input
                      value={settingsForm.gstin}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          gstin: event.target.value.toUpperCase(),
                        })
                      }
                    />
                  </label>
                  <label>
                    Phone
                    <input
                      value={settingsForm.phone}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          phone: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Bill prefix
                    <input
                      value={settingsForm.billPrefix}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          billPrefix: event.target.value.toUpperCase(),
                        })
                      }
                      maxLength={8}
                    />
                  </label>
                  <label className="wide">
                    Address
                    <textarea
                      value={settingsForm.address}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          address: event.target.value,
                        })
                      }
                      rows={3}
                    />
                  </label>
                </div>
              </div>
              <div className="form-section">
                <div>
                  <strong>GST Inclusive pricing</strong>
                  <p>
                    Entered Showroom Price is the final customer price. GST is split
                    from it, never added again.
                  </p>
                </div>
                <div className="form-grid">
                  <label>
                    GST rate (%)
                    <select
                      value={settingsForm.gstRate}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          gstRate: Number(event.target.value),
                        })
                      }
                    >
                      <option value={0}>0% / Non-GST</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </label>
                  <div className="info-box">
                    <strong>Current split</strong>
                    <p>
                      CGST {settingsForm.gstRate / 2}% + SGST{" "}
                      {settingsForm.gstRate / 2}% · Inclusive
                    </p>
                  </div>
                </div>
              </div>
              <div className="form-section">
                <div>
                  <strong>Staff & counters</strong>
                  <p>Comma-separated suggestions available while billing.</p>
                </div>
                <div className="form-grid">
                  <label className="wide">
                    Staff names
                    <input
                      value={staffText}
                      onChange={(event) => setStaffText(event.target.value)}
                      placeholder="Anand, Priya, Kumar"
                    />
                  </label>
                  <label className="wide">
                    Counter names
                    <input
                      value={counterText}
                      onChange={(event) => setCounterText(event.target.value)}
                      placeholder="Counter 1, Counter 2"
                    />
                  </label>
                  <label>
                    Default counter
                    <input
                      value={settingsForm.defaultCounter}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          defaultCounter: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="wide">
                    Invoice terms
                    <textarea
                      rows={3}
                      value={settingsForm.invoiceTerms}
                      onChange={(event) =>
                        setSettingsForm({
                          ...settingsForm,
                          invoiceTerms: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="settings-footer">
                <span>Changes sync to all counters.</span>
                <button className="primary-small" disabled={busy}>
                  Save settings
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      {stockEntry.product && (
        <div className="modal-backdrop">
          <form className="modal-card stock-entry-modal" onSubmit={saveStockEntry}>
            <div className="modal-head"><div><span className="eyebrow">Quick inventory</span><h2>Receive stock</h2></div><button type="button" onClick={() => setStockEntry({ product: null, quantity: 1 })}>×</button></div>
            <div className="stock-entry-product"><ProductThumb product={stockEntry.product} /><div><strong>{stockEntry.product.name}</strong><small>{stockEntry.product.code} · Current stock {stockEntry.product.stockQty}</small></div></div>
            <label className="stock-entry-field">Pieces received<input type="number" min="1" step="1" value={stockEntry.quantity} onChange={(event) => setStockEntry({ ...stockEntry, quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <div className="stock-entry-result"><span>New ready stock</span><strong>{stockEntry.product.stockQty + Math.floor(stockEntry.quantity)}</strong></div>
            <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setStockEntry({ product: null, quantity: 1 })}>Cancel</button><button className="primary-small" disabled={busy}>Add to stock</button></div>
          </form>
        </div>
      )}

      {showProductForm && (
        <div className="modal-backdrop">
          <form className="modal-card" onSubmit={saveProduct}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">Inventory item</span>
                <h2>{productForm.id ? "Edit product" : "Add product"}</h2>
              </div>
              <button type="button" onClick={closeProductForm}>
                ×
              </button>
            </div>
            <div className="product-image-editor">
              <div
                className={`image-preview ${!productImagePreview ? productTone(productForm) : ""}`}
              >
                {productImagePreview ? (
                  <img src={productImagePreview} alt="Product preview" />
                ) : (
                  <span>
                    {productForm.name.slice(0, 2).toUpperCase() || "FE"}
                  </span>
                )}
              </div>
              <label className="secondary-action">
                Choose product image
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    selectProductImage(event.target.files?.[0])
                  }
                />
              </label>
              <small>
                JPG/PNG/WebP · automatically compressed and saved to cloud.
              </small>
            </div>
            <div className="form-grid">
              <label>
                Product code
                <input
                  value={productForm.code}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      code: event.target.value.toUpperCase(),
                    })
                  }
                  required
                />
              </label>
              <label>
                HSN code
                <input
                  value={productForm.hsnCode}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      hsnCode: event.target.value,
                    })
                  }
                />
              </label>
              <label className="wide">
                Product name
                <input
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm({ ...productForm, name: event.target.value })
                  }
                  required
                />
              </label>
              <label>
                Category
                <input
                  list="category-options"
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value,
                    })
                  }
                />
                <datalist id="category-options">
                  {categories.slice(1).map((item) => (
                    <option value={item} key={item} />
                  ))}
                </datalist>
              </label>
              <label>
                Size
                <input
                  value={productForm.size}
                  onChange={(event) =>
                    setProductForm({ ...productForm, size: event.target.value })
                  }
                />
              </label>
              <label>
                Wood type
                <input
                  value={productForm.woodType}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      woodType: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Showroom price incl. GST
                <input
                  type="number"
                  min="1"
                  value={productForm.price || ""}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      price: Number(event.target.value),
                    })
                  }
                  required
                />
              </label>
              <label>
                Stock quantity
                <input
                  type="number"
                  min="0"
                  value={productForm.stockQty || ""}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      stockQty: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                MRP
                <input
                  type="number"
                  min="0"
                  value={productForm.mrp || ""}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      mrp: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="wide">
                Notes
                <textarea
                  rows={3}
                  value={productForm.notes}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      notes: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-action"
                onClick={closeProductForm}
              >
                Cancel
              </button>
              <button className="primary-small" disabled={busy}>
                Save product
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedBill && (
        <div className="modal-backdrop">
          <div className="modal-card invoice-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Order booking slip</span>
                <h2>{selectedBill.billNo}</h2>
              </div>
              <div className="modal-head-actions">{selectedBill.status !== "cancelled" && <button className="edit-order-top" onClick={() => setEditingBill({ ...selectedBill, items: selectedBill.items.map((item) => ({ ...item })) })}>✎ Edit order</button>}<button className="modal-close" onClick={() => setSelectedBill(null)}>×</button></div>
            </div>
            {selectedBill.status === "cancelled" && (
              <div className="cancelled-banner">
                CANCELLED · READY STOCK RESTORED
              </div>
            )}
            <div className="invoice-meta">
              <div>
                <span>Customer</span>
                <strong>{selectedBill.customerName}</strong>
                <small>
                  {selectedBill.customerPhone} ·{" "}
                  {selectedBill.customerAddress || "No address"}
                </small>
              </div>
              <div>
                <span>Booking staff / Accountant</span>
                <strong>
                  {selectedBill.staffName || "Unassigned"} ·{" "}
                  {selectedBill.accountantName || "—"}
                </strong>
                <small>{selectedBill.managerName ? `Manager: ${selectedBill.managerName} · ` : ""}{shortDate(selectedBill.createdAt)}</small>
              </div>
            </div>
            <div className="invoice-items">
              {selectedBill.items.map((item, index) => (
                <div key={`${item.code}-${index}`}>
                  {(() => {
                    const product = state.products.find((entry) => entry.id === item.productId || entry.code === item.code);
                    return product ? <ProductThumb product={product} /> : null;
                  })()}
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.code} · Size {item.size || "—"} · Unit {money(item.price)} ·{" "}
                      {item.againstOrder ? "Against Order" : "Stock"}
                      {item.customizeDetails
                        ? ` · ${item.customizeDetails}`
                        : ""}
                    </small>
                  </div>
                  <span>
                    {item.qty} × {money(item.price)}
                  </span>
                  <strong>
                    {money(
                      item.qty * item.price +
                        Number(item.againstOrderExtra || 0),
                    )}
                  </strong>
                  {selectedBill.status !== "cancelled" && selectedBill.items.length > 1 && <button className="remove-line" onClick={async () => {
                    if (!window.confirm(`Remove ${item.name} from ${selectedBill.billNo}? Stock and totals will be corrected automatically.`)) return;
                    const data = await mutate({ action: "removeBillItem", id: selectedBill.id, itemIndex: index }, `${item.name} removed. Stock and totals updated.`);
                    if (data) setSelectedBill(data.bills.find((bill) => bill.id === selectedBill.id) || null);
                  }}>Remove</button>}
                </div>
              ))}
            </div>
            <div className="invoice-totals">
              <div>
                <span>Items total</span>
                <strong>{money(selectedBill.productTotal + selectedBill.againstOrderExtra)}</strong>
              </div>
              <div>
                <span>Discount</span>
                <strong>− {money(selectedBill.discount)}</strong>
              </div>
              <div>
                <span>Taxable value</span>
                <strong>{money(selectedBill.taxableValue)}</strong>
              </div>
              <div>
                <span>CGST {state.settings.gstRate / 2}%</span>
                <strong>{money(selectedBill.cgst)}</strong>
              </div>
              <div>
                <span>SGST {state.settings.gstRate / 2}%</span>
                <strong>{money(selectedBill.sgst)}</strong>
              </div>
              {selectedBill.cardCharge > 0 && <div><span>Card charge</span><strong>{money(selectedBill.cardCharge)}</strong></div>}
              {selectedBill.transportCharge > 0 && <div><span>Transport charge</span><strong>{money(selectedBill.transportCharge)}</strong></div>}
              {selectedBill.otherCharge > 0 && <div><span>Other charge</span><strong>{money(selectedBill.otherCharge)}</strong></div>}
              <div className="grand-total">
                <span>Grand total</span>
                <strong>{money(selectedBill.grandTotal)}</strong>
              </div>
              <div>
                <span>Advance / Paid</span>
                <strong>{money(selectedBill.paidAmount)}</strong>
              </div>
              <div>
                <span>Balance</span>
                <strong>{money(selectedBill.balanceAmount)}</strong>
              </div>
            </div>
            <div className="delivery-inline">
              <span>Expected delivery</span>
              <strong>{selectedBill.deliveryDate || "Not set"}</strong>
              {selectedBill.status !== "cancelled" ? (
                <select value={selectedBill.deliveryStatus} onChange={async (event) => {
                  const data = await mutate({ action: "setDeliveryStatus", id: selectedBill.id, deliveryStatus: event.target.value }, "Order status updated.");
                  if (data) setSelectedBill(data.bills.find((bill) => bill.id === selectedBill.id) || null);
                }}>
                  {["Order Booked", "Supplier Assigned", "In Production", "Ready", "Out for Delivery", "Delivered"].map((status) => <option key={status}>{status}</option>)}
                </select>
              ) : <span className="delivery-status cancelled">Cancelled</span>}
            </div>
            {selectedBill.orderNotes && <div className="order-note"><strong>Order note</strong><span>{selectedBill.orderNotes}</span></div>}
            {selectedBill.paymentHistory.length > 0 && (
              <div className="payment-history">
                <strong>Payment history</strong>
                {selectedBill.paymentHistory.map((payment) => (
                  <div key={payment.id}>
                    <span>
                      {shortDate(payment.date)} · {payment.mode}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </span>
                    <strong>{money(payment.amount)}</strong>
                  </div>
                ))}
              </div>
            )}
            {selectedBill.status !== "cancelled" &&
              selectedBill.balanceAmount > 0 && (
                <div className="quick-payment">
                  <input
                    type="number"
                    min="1"
                    max={selectedBill.balanceAmount}
                    value={paymentForm.amount || ""}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: Number(event.target.value),
                      })
                    }
                    placeholder="Payment amount"
                  />
                  <select
                    value={paymentForm.mode}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        mode: event.target.value,
                      })
                    }
                  >
                    {paymentModes.map((mode) => (
                      <option key={mode}>{mode}</option>
                    ))}
                  </select>
                  <input
                    value={paymentForm.note}
                    onChange={(event) =>
                      setPaymentForm({
                        ...paymentForm,
                        note: event.target.value,
                      })
                    }
                    placeholder="Note"
                  />
                  <button
                    className="secondary-action"
                    onClick={async () => {
                      const data = await mutate(
                        {
                          action: "addPayment",
                          id: selectedBill.id,
                          ...paymentForm,
                        },
                        "Payment added and synced.",
                      );
                      if (data) {
                        setSelectedBill(
                          data.bills.find(
                            (bill) => bill.id === selectedBill.id,
                          ) || null,
                        );
                        setPaymentForm({ amount: 0, mode: "CASH", note: "" });
                      }
                    }}
                  >
                    Add payment
                  </button>
                </div>
              )}
            <div className="modal-actions invoice-actions">
              <button
                className="secondary-action"
                onClick={() => printBill(selectedBill, "order")}
              >
                Print Order Slip
              </button>
              <button
                className="secondary-action"
                onClick={() => printBill(selectedBill, "invoice")}
              >
                Final GST Invoice
              </button>
              <button
                className="secondary-action"
                onClick={() => downloadBillExcel(selectedBill)}
              >
                Excel
              </button>
              <button
                className="secondary-action"
                onClick={() => shareWhatsApp(selectedBill)}
              >
                WhatsApp
              </button>
              {selectedBill.status !== "cancelled" && (
                <button className="secondary-action" onClick={() => openAssignmentForBill(selectedBill)}>
                  Assign supplier
                </button>
              )}
              {selectedBill.status !== "cancelled" && (
                <button
                  className="secondary-action"
                  onClick={() => setEditingBill({ ...selectedBill, items: selectedBill.items.map((item) => ({ ...item })) })}
                >
                  Edit full order
                </button>
              )}
              {selectedBill.status !== "cancelled" && (
                <button
                  className="danger-button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Cancel this order and restore all ready stock?",
                      )
                    )
                      return;
                    const data = await mutate(
                      { action: "cancelBill", id: selectedBill.id },
                      "Bill cancelled. Stock restored everywhere.",
                    );
                    if (data)
                      setSelectedBill(
                        data.bills.find(
                          (bill) => bill.id === selectedBill.id,
                        ) || null,
                      );
                  }}
                >
                  Cancel order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingBill && (
        <div className="modal-backdrop">
          <form
            className="modal-card edit-order-modal"
            onSubmit={async (event) => {
              event.preventDefault();
              const data = await mutate(
                { action: "updateBillDetails", bill: editingBill },
                "Bill details updated.",
              );
              if (data) {
                setSelectedBill(
                  data.bills.find((bill) => bill.id === editingBill.id) || null,
                );
                setEditingBill(null);
              }
            }}
          >
            <div className="modal-head">
              <div>
                <span className="eyebrow">Edit order details</span>
                <h2>{editingBill.billNo}</h2>
              </div>
              <button type="button" onClick={() => setEditingBill(null)}>
                ×
              </button>
            </div>
            <section className="edit-order-items">
              <div className="edit-order-items-head"><div><span className="eyebrow">Products</span><h3>Edit saved products</h3></div><small>Name, size, unit price and quantity can be corrected here.</small></div>
              {editingBill.items.map((item, index) => <div className="edit-order-item" key={`${item.productId}-${index}`}>
                <label>Product name<input value={item.name} onChange={(event) => setEditingBill({ ...editingBill, items: editingBill.items.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row) })} required /></label>
                <label>Size<input value={item.size || ""} onChange={(event) => setEditingBill({ ...editingBill, items: editingBill.items.map((row, rowIndex) => rowIndex === index ? { ...row, size: event.target.value } : row) })} /></label>
                <label>Unit price<input type="number" min="0" value={item.price} onChange={(event) => setEditingBill({ ...editingBill, items: editingBill.items.map((row, rowIndex) => rowIndex === index ? { ...row, price: Math.max(0, Number(event.target.value)) } : row) })} required /></label>
                <label>Qty<input type="number" min="1" step="1" value={item.qty} onChange={(event) => setEditingBill({ ...editingBill, items: editingBill.items.map((row, rowIndex) => rowIndex === index ? { ...row, qty: Math.max(1, Math.floor(Number(event.target.value) || 1)) } : row) })} required /></label>
                <button type="button" className="edit-item-remove" disabled={editingBill.items.length <= 1} onClick={() => setEditingBill({ ...editingBill, items: editingBill.items.filter((_, rowIndex) => rowIndex !== index) })}>Remove</button>
              </div>)}
            </section>
            <div className="form-grid">
              <label>
                Customer name
                <input
                  value={editingBill.customerName}
                  onChange={(event) =>
                    setEditingBill({
                      ...editingBill,
                      customerName: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label>
                Phone
                <input
                  value={editingBill.customerPhone}
                  onChange={(event) =>
                    setEditingBill({
                      ...editingBill,
                      customerPhone: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label className="wide">
                Address
                <textarea
                  rows={2}
                  value={editingBill.customerAddress}
                  onChange={(event) =>
                    setEditingBill({
                      ...editingBill,
                      customerAddress: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Order booking staff
                <input
                  value={editingBill.staffName}
                  onChange={(event) =>
                    setEditingBill({
                      ...editingBill,
                      staffName: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Accountant
                <input
                  value={editingBill.accountantName}
                  onChange={(event) =>
                    setEditingBill({
                      ...editingBill,
                      accountantName: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Manager
                <input value={editingBill.managerName} onChange={(event) => setEditingBill({ ...editingBill, managerName: event.target.value })} />
              </label>
              <label>
                Expected delivery
                <input
                  type="date"
                  value={editingBill.deliveryDate}
                  onChange={(event) =>
                    setEditingBill({
                      ...editingBill,
                      deliveryDate: event.target.value,
                    })
                  }
                />
              </label>
              <label className="wide">
                Order notes
                <textarea rows={2} value={editingBill.orderNotes} onChange={(event) => setEditingBill({ ...editingBill, orderNotes: event.target.value })} />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => setEditingBill(null)}
              >
                Cancel
              </button>
              <button className="primary-small" disabled={busy}>{busy ? "Saving…" : "Save order changes"}</button>
            </div>
          </form>
        </div>
      )}

      {showSupplierForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveSupplier}>
          <div className="modal-head"><div><span className="eyebrow">Supplier master</span><h2>{supplierForm.id ? "Edit supplier" : "Add supplier"}</h2></div><button type="button" onClick={() => setShowSupplierForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Supplier name<input value={supplierForm.name || ""} onChange={(event) => setSupplierForm({ ...supplierForm, name: event.target.value })} required /></label>
            <label>Phone<input value={supplierForm.phone || ""} onChange={(event) => setSupplierForm({ ...supplierForm, phone: event.target.value })} required /></label>
            <label>Contact person<input value={supplierForm.contactPerson || ""} onChange={(event) => setSupplierForm({ ...supplierForm, contactPerson: event.target.value })} /></label>
            <label>GSTIN<input value={supplierForm.gstin || ""} onChange={(event) => setSupplierForm({ ...supplierForm, gstin: event.target.value.toUpperCase() })} /></label>
            <label className="wide">Address<textarea rows={2} value={supplierForm.address || ""} onChange={(event) => setSupplierForm({ ...supplierForm, address: event.target.value })} /></label>
            <label className="wide">Product categories<input value={supplierForm.categories || ""} onChange={(event) => setSupplierForm({ ...supplierForm, categories: event.target.value })} placeholder="Sofa, Cot, Dining Table…" /></label>
            <label className="wide">Bank / payment details<textarea rows={2} value={supplierForm.bankDetails || ""} onChange={(event) => setSupplierForm({ ...supplierForm, bankDetails: event.target.value })} /></label>
            <label>Status<select value={supplierForm.status || "Active"} onChange={(event) => setSupplierForm({ ...supplierForm, status: event.target.value })}><option>Active</option><option>Inactive</option></select></label>
            <label className="wide">Notes<textarea rows={2} value={supplierForm.notes || ""} onChange={(event) => setSupplierForm({ ...supplierForm, notes: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowSupplierForm(false)}>Cancel</button><button className="primary-small">Save supplier</button></div>
        </form></div>
      )}

      {showTaskForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveTask}>
          <div className="modal-head"><div><span className="eyebrow">Task & schedule</span><h2>{taskForm.id ? "Edit task" : "Add task"}</h2></div><button type="button" onClick={() => setShowTaskForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Category<select value={taskForm.category || "Follow-up"} onChange={(event) => setTaskForm({ ...taskForm, category: event.target.value })}>{["Follow-up", "Cleaning", "Marketing", "Development", "Recruitment", "Financial Commitment", "Financial", "Delivery", "Complaint", "General"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Priority<select value={taskForm.priority || "Normal"} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label>
            <label className="wide">Task title<input value={taskForm.title || ""} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required /></label>
            <label className="wide">Details<textarea rows={3} value={taskForm.details || ""} onChange={(event) => setTaskForm({ ...taskForm, details: event.target.value })} /></label>
            <label>Assigned staff<input list="task-staff" value={taskForm.assignedTo || ""} onChange={(event) => setTaskForm({ ...taskForm, assignedTo: event.target.value })} /><datalist id="task-staff">{state.settings.staffNames.map((name) => <option key={name} value={name} />)}</datalist></label>
            <label>Due date<input type="date" value={taskForm.dueDate || ""} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label>
            <label>Status<select value={taskForm.status || "Pending"} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}><option>Pending</option><option>In progress</option><option>Completed</option></select></label>
            <label>Customer phone<input value={taskForm.linkedCustomerPhone || ""} onChange={(event) => setTaskForm({ ...taskForm, linkedCustomerPhone: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowTaskForm(false)}>Cancel</button><button className="primary-small" disabled={busy}>{busy ? "Saving…" : "Save task once"}</button></div>
        </form></div>
      )}

      {showInteractionForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveInteraction}>
          <div className="modal-head"><div><span className="eyebrow">Customer CRM</span><h2>{interactionForm.id ? "Edit activity" : "Add customer activity"}</h2></div><button type="button" onClick={() => setShowInteractionForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Customer name<input value={interactionForm.customerName || ""} onChange={(event) => setInteractionForm({ ...interactionForm, customerName: event.target.value })} required /></label>
            <label>Phone<input value={interactionForm.customerPhone || ""} onChange={(event) => { const phone = event.target.value; const prior = activeBills.find((bill) => normalizePhone(bill.customerPhone) === normalizePhone(phone)); setInteractionForm({ ...interactionForm, customerPhone: phone, customerName: interactionForm.customerName || prior?.customerName || "", billId: interactionForm.billId || prior?.id || "" }); }} required /></label>
            <label>Activity type<select value={interactionForm.type || "Follow-up"} onChange={(event) => setInteractionForm({ ...interactionForm, type: event.target.value })}>{["Enquiry", "Follow-up", "Order Follow-up", "Happy Call", "Complaint", "Service Call", "New Service"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Next follow-up<input type="date" value={interactionForm.nextFollowUp || ""} onChange={(event) => setInteractionForm({ ...interactionForm, nextFollowUp: event.target.value })} /></label>
            <label>Assigned staff<input list="crm-staff" value={interactionForm.assignedTo || ""} onChange={(event) => setInteractionForm({ ...interactionForm, assignedTo: event.target.value })} /><datalist id="crm-staff">{state.settings.staffNames.map((name) => <option key={name} value={name} />)}</datalist></label>
            <label>Status<select value={interactionForm.status || "Open"} onChange={(event) => setInteractionForm({ ...interactionForm, status: event.target.value })}><option>Open</option><option>In progress</option><option>Closed</option></select></label>
            <label className="wide">Details / resolution<textarea rows={4} value={interactionForm.details || ""} onChange={(event) => setInteractionForm({ ...interactionForm, details: event.target.value })} required /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowInteractionForm(false)}>Cancel</button><button className="primary-small">Save activity</button></div>
        </form></div>
      )}

      {assignmentBill && (
        <div className="modal-backdrop"><form className="modal-card assignment-modal" onSubmit={saveAssignments}>
          <div className="modal-head"><div><span className="eyebrow">Supplier assignment</span><h2>{assignmentBill.billNo}</h2><small>{assignmentBill.customerName} · Against Order products</small></div><button type="button" onClick={() => { setAssignmentBill(null); setAssignmentDrafts([]); }}>×</button></div>
          {!state.suppliers.some((supplier) => supplier.status === "Active") && <div className="form-notice">Add an active supplier first. You can close this window and use the Suppliers tab.</div>}
          <div className="assignment-list">{assignmentDrafts.map((draft, index) => <fieldset key={`${draft.productId}-${index}`}><legend>{draft.productName} · {draft.productCode} · Qty {draft.qty}</legend><div className="form-grid">
            <label>Supplier<select value={draft.supplierId || ""} onChange={(event) => setAssignmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, supplierId: event.target.value } : row))} required><option value="">Select supplier</option>{state.suppliers.filter((supplier) => supplier.status === "Active" || supplier.id === draft.supplierId).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
            <label>Status<select value={draft.status || "Not ordered"} onChange={(event) => setAssignmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, status: event.target.value } : row))}>{["Not ordered", "Ordered", "Confirmed", "Ready", "Received", "Closed", "Cancelled"].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Purchase cost<input type="number" min="0" value={draft.purchaseCost || ""} onChange={(event) => setAssignmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, purchaseCost: Number(event.target.value) } : row))} /></label>
            <label>Advance paid<input type="number" min="0" value={draft.advancePaid || ""} onChange={(event) => setAssignmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, advancePaid: Number(event.target.value) } : row))} /></label>
            <label>Expected arrival<input type="date" value={draft.expectedDate || ""} onChange={(event) => setAssignmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, expectedDate: event.target.value } : row))} /></label>
            <label className="wide">Notes<input value={draft.notes || ""} onChange={(event) => setAssignmentDrafts((rows) => rows.map((row, rowIndex) => rowIndex === index ? { ...row, notes: event.target.value } : row))} /></label>
          </div></fieldset>)}</div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => { setAssignmentBill(null); setAssignmentDrafts([]); }}>Save later</button><button className="primary-small" disabled={!state.suppliers.some((supplier) => supplier.status === "Active")}>Save assignments</button></div>
        </form></div>
      )}

      {qrProduct && (
        <div className="modal-backdrop">
          <div className="modal-card qr-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Product QR</span>
                <h2>{qrProduct.code}</h2>
              </div>
              <button onClick={() => setQrProduct(null)}>×</button>
            </div>
            <canvas ref={qrCanvasRef} />
            <strong>{qrProduct.name}</strong>
            <small>Scan at the billing counter to add this product.</small>
            <div className="modal-actions">
              <button className="secondary-action" onClick={printQr}>
                Print tag
              </button>
              <button className="primary-small" onClick={downloadQr}>
                Download PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {scannerOpen && (
        <div className="modal-backdrop">
          <div className="modal-card scanner-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">QR scanner</span>
                <h2>Scan product code</h2>
              </div>
              <button onClick={closeScanner}>×</button>
            </div>
            <video ref={scanVideoRef} playsInline muted />
            <p>{scanStatus}</p>
            <div className="manual-scan"><input value={manualScanCode} onChange={(event) => setManualScanCode(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submitManualScan()} placeholder="Or enter product code" /><button className="primary-small" onClick={submitManualScan}>Add</button></div>
            <button className="secondary-action" onClick={closeScanner}>
              Close scanner
            </button>
          </div>
        </div>
      )}
      {busy && <div className="busy-bar" />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

function Nav({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
}) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <span>{icon}</span>
      <b>{label}</b>
    </button>
  );
}
function Metric({
  label,
  value,
  note,
  alert = false,
}: {
  label: string;
  value: string;
  note: string;
  alert?: boolean;
}) {
  return (
    <article className={`metric-card ${alert ? "alert" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <small>{note}</small>}
    </article>
  );
}
function ProductVisual({ product }: { product: Product }) {
  return imageSrc(product) ? (
    <div className="product-visual image">
      <img src={imageSrc(product)} alt={product.name} />
      <small>{product.code}</small>
    </div>
  ) : (
    <div className={`product-visual ${productTone(product)}`}>
      <span>{product.category.slice(0, 2).toUpperCase()}</span>
      <small>{product.code}</small>
    </div>
  );
}
function ProductThumb({
  product,
}: {
  product: Pick<Product, "name" | "code" | "imageUrl">;
}) {
  return product.imageUrl ? (
    <img className="table-thumb image" src={product.imageUrl} alt="" />
  ) : (
    <div className={`table-thumb ${productTone(product)}`}>
      {product.name.slice(0, 1)}
    </div>
  );
}

function formatReportCell(header: string, value: string | number) {
  return typeof value === "number" &&
    /sales|paid|collected|balance|price|cost|advance|value|cgst|sgst|gst|extra|total|amount|cash|gpay|upi|card|discount|average/i.test(
      header,
    )
    ? money(value)
    : String(value);
}

function buildReport(
  type: string,
  bills: Bill[],
  products: Product[],
  from: string,
  to: string,
  inRange: (bill: Bill, delivery?: boolean) => boolean,
  gstRate: number,
  suppliers: Supplier[],
  tasks: ExpoTask[],
  interactions: CustomerInteraction[],
  assignments: SupplierAssignment[],
): ReportData {
  const dateLabel =
    !from && !to ? "All time" : `${from || "Beginning"} to ${to || "Today"}`;
  const selected = bills.filter((bill) => inRange(bill));
  if (type === "daily") {
    const day = from || to || isoDate();
    const list = bills.filter((bill) => bill.createdAt.slice(0, 10) === day);
    const payments = bills
      .flatMap((bill) => bill.paymentHistory)
      .filter((payment) => payment.date.slice(0, 10) === day);
    const modes = Object.fromEntries(
      paymentModes.map((mode) => [
        mode,
        payments
          .filter((payment) => payment.mode === mode)
          .reduce((sum, payment) => sum + payment.amount, 0),
      ]),
    );
    return {
      title: "Daily Closing",
      subtitle: day,
      summary: [
        ["Sales", money(list.reduce((sum, bill) => sum + bill.grandTotal, 0))],
        ["Bills", String(list.length)],
        [
          "Collections",
          money(payments.reduce((sum, payment) => sum + payment.amount, 0)),
        ],
        ["Cash", money(modes.CASH || 0)],
        ["GPAY", money(modes.GPAY || 0)],
        ["Card", money(modes.CARD || 0)],
      ],
      headers: [
        "Bill No",
        "Customer",
        "Sales",
        "Paid",
        "Balance",
        "Staff",
        "Counter",
      ],
      rows: list.map((bill) => [
        bill.billNo,
        bill.customerName,
        bill.grandTotal,
        bill.paidAmount,
        bill.balanceAmount,
        bill.staffName,
        bill.counterName,
      ]),
    };
  }
  if (type === "delivery") {
    const list = bills.filter((bill) => inRange(bill, true));
    return {
      title: "Delivery Report",
      subtitle: `Expected delivery · ${dateLabel}`,
      summary: [
        [
          "Today",
          String(
            bills.filter((bill) => deliveryBucket(bill) === "today").length,
          ),
        ],
        [
          "Upcoming",
          String(
            bills.filter((bill) => deliveryBucket(bill) === "upcoming").length,
          ),
        ],
        [
          "Pending / Overdue",
          String(
            bills.filter((bill) => deliveryBucket(bill) === "pending").length,
          ),
        ],
        [
          "Delivered",
          String(
            bills.filter((bill) => deliveryBucket(bill) === "delivered").length,
          ),
        ],
      ],
      headers: [
        "Expected Date",
        "Bill No",
        "Customer",
        "Phone",
        "Status",
        "Grand Total",
        "Paid",
        "Balance",
      ],
      rows: list.map((bill) => [
        bill.deliveryDate || "Not set",
        bill.billNo,
        bill.customerName,
        bill.customerPhone,
        deliveryLabel(deliveryBucket(bill)),
        bill.grandTotal,
        bill.paidAmount,
        bill.balanceAmount,
      ]),
    };
  }
  if (type === "payment") {
    const list = selected
      .filter((bill) => bill.balanceAmount > 0)
      .sort((a, b) => b.balanceAmount - a.balanceAmount);
    return {
      title: "Payment Pending Report",
      subtitle: dateLabel,
      summary: [
        [
          "Pending Amount",
          money(list.reduce((sum, bill) => sum + bill.balanceAmount, 0)),
        ],
        ["Pending Bills", String(list.length)],
        [
          "Paid on These Bills",
          money(list.reduce((sum, bill) => sum + bill.paidAmount, 0)),
        ],
        [
          "Customers",
          String(
            new Set(
              list.map(
                (bill) =>
                  normalizePhone(bill.customerPhone) || bill.customerName,
              ),
            ).size,
          ),
        ],
      ],
      headers: [
        "Bill No",
        "Bill Date",
        "Customer",
        "Phone",
        "Grand Total",
        "Paid",
        "Balance",
        "Last Payment",
        "Delivery",
      ],
      rows: list.map((bill) => [
        bill.billNo,
        bill.createdAt.slice(0, 10),
        bill.customerName,
        bill.customerPhone,
        bill.grandTotal,
        bill.paidAmount,
        bill.balanceAmount,
        bill.paymentHistory.at(-1)?.date.slice(0, 10) || "",
        bill.deliveryDate,
      ]),
    };
  }
  if (type === "stock") {
    const list = [...products].sort((a, b) => a.stockQty - b.stockQty);
    return {
      title: "Stock Report",
      subtitle: "Current inventory",
      summary: [
        ["Products / SKUs", String(list.length)],
        [
          "Total Pieces",
          String(list.reduce((sum, product) => sum + product.stockQty, 0)),
        ],
        [
          "Low Stock",
          String(
            list.filter(
              (product) => product.stockQty > 0 && product.stockQty <= 2,
            ).length,
          ),
        ],
        [
          "Out of Stock",
          String(list.filter((product) => product.stockQty <= 0).length),
        ],
        [
          "Stock Value",
          money(
            list.reduce(
              (sum, product) => sum + product.stockQty * product.price,
              0,
            ),
          ),
        ],
      ],
      headers: [
        "Code",
        "Product",
        "Category",
        "Size",
        "Wood Type",
        "Stock Qty",
        "Showroom Price",
        "Stock Value",
        "Status",
      ],
      rows: list.map((product) => [
        product.code,
        product.name,
        product.category,
        product.size,
        product.woodType,
        product.stockQty,
        product.price,
        product.stockQty * product.price,
        product.stockQty <= 0
          ? "Out of Stock"
          : product.stockQty <= 2
            ? "Low Stock"
            : "In Stock",
      ]),
    };
  }
  if (type === "staff") {
    const map = new Map<
      string,
      {
        staff: string;
        counters: Set<string>;
        orders: number;
        items: number;
        sales: number;
        collected: number;
        balance: number;
        against: number;
        delivered: number;
      }
    >();
    selected.forEach((bill) => {
      const staff = bill.staffName || "Unassigned";
      const row = map.get(staff) || {
          staff,
          counters: new Set<string>(),
          orders: 0,
          items: 0,
          sales: 0,
          collected: 0,
          balance: 0,
          against: 0,
          delivered: 0,
        };
      row.counters.add(bill.counterName || "Unassigned");
      row.orders++;
      row.items += bill.items.reduce((sum, item) => sum + item.qty, 0);
      row.sales += bill.grandTotal;
      row.collected += bill.paidAmount;
      row.balance += bill.balanceAmount;
      if (bill.items.some((item) => item.againstOrder)) row.against++;
      if (bill.deliveryStatus === "Delivered") row.delivered++;
      map.set(staff, row);
    });
    const rows = [...map.values()].sort((a, b) => b.sales - a.sales);
    return {
      title: "Order Booking Staff Performance",
      subtitle: `${dateLabel} · Monthly observation-ready`,
      summary: [
        [
          "Staff",
          String(
            new Set(selected.map((bill) => bill.staffName || "Unassigned"))
              .size,
          ),
        ],
        [
          "Products booked",
          String(
            selected.reduce((sum, bill) => sum + bill.items.reduce((itemSum, item) => itemSum + item.qty, 0), 0),
          ),
        ],
        ["Orders", String(selected.length)],
        [
          "Sales",
          money(selected.reduce((sum, bill) => sum + bill.grandTotal, 0)),
        ],
      ],
      headers: [
        "Staff",
        "Counters Used",
        "Orders",
        "Products",
        "Sales",
        "Collected",
        "Balance",
        "Delivered",
        "Against Orders",
        "Average Order",
      ],
      rows: rows.map((row) => [
        row.staff,
        [...row.counters].join(", "),
        row.orders,
        row.items,
        row.sales,
        row.collected,
        row.balance,
        `${row.delivered}/${row.orders}`,
        row.against,
        row.orders ? row.sales / row.orders : 0,
      ]),
    };
  }
  if (type === "against") {
    const rows: Array<Array<string | number>> = [];
    selected.forEach((bill) =>
      bill.items
        .filter((item) => item.againstOrder)
        .forEach((item) =>
          rows.push([
            bill.billNo,
            bill.createdAt.slice(0, 10),
            bill.customerName,
            bill.customerPhone,
            item.code,
            item.name,
            item.qty,
            item.price,
            Number(item.againstOrderExtra || 0),
            item.qty * item.price + Number(item.againstOrderExtra || 0),
            item.customizeDetails || "",
            bill.deliveryDate,
            bill.balanceAmount,
          ]),
        ),
    );
    const extras = rows.reduce((sum, row) => sum + Number(row[8]), 0);
    return {
      title: "Against Order Report",
      subtitle: dateLabel,
      summary: [
        ["Order Lines", String(rows.length)],
        [
          "Total Qty",
          String(rows.reduce((sum, row) => sum + Number(row[6]), 0)),
        ],
        ["Extra Charges", money(extras)],
        [
          "Order Value",
          money(rows.reduce((sum, row) => sum + Number(row[9]), 0)),
        ],
      ],
      headers: [
        "Bill No",
        "Bill Date",
        "Customer",
        "Phone",
        "Code",
        "Product",
        "Qty",
        "Base Price",
        "Extra Charge",
        "Line Total",
        "Customize Details",
        "Expected Delivery",
        "Bill Balance",
      ],
      rows,
    };
  }
  if (type === "gst") {
    return {
      title: "GST Report",
      subtitle: `GST Inclusive ${gstRate}% · ${dateLabel}`,
      summary: [
        [
          "Sales Incl. GST",
          money(selected.reduce((sum, bill) => sum + bill.grandTotal, 0)),
        ],
        [
          "Taxable Value",
          money(selected.reduce((sum, bill) => sum + bill.taxableValue, 0)),
        ],
        [
          `CGST ${gstRate / 2}%`,
          money(selected.reduce((sum, bill) => sum + bill.cgst, 0)),
        ],
        [
          `SGST ${gstRate / 2}%`,
          money(selected.reduce((sum, bill) => sum + bill.sgst, 0)),
        ],
        ["Total GST", money(selected.reduce((sum, bill) => sum + bill.gst, 0))],
      ],
      headers: [
        "Bill No",
        "Date",
        "Customer",
        "Taxable Value",
        `CGST ${gstRate / 2}%`,
        `SGST ${gstRate / 2}%`,
        `GST ${gstRate}%`,
        "Grand Total Incl. GST",
      ],
      rows: selected.map((bill) => [
        bill.billNo,
        bill.createdAt.slice(0, 10),
        bill.customerName,
        bill.taxableValue,
        bill.cgst,
        bill.sgst,
        bill.gst,
        bill.grandTotal,
      ]),
    };
  }
  if (type === "supplier") {
    const rows = assignments.filter((item) => (!from || item.createdAt.slice(0, 10) >= from) && (!to || item.createdAt.slice(0, 10) <= to));
    return {
      title: "Supplier Purchase Report",
      subtitle: dateLabel,
      summary: [
        ["Suppliers", String(suppliers.length)],
        ["Assignments", String(rows.length)],
        ["Purchase Cost", money(rows.reduce((sum, item) => sum + item.purchaseCost, 0))],
        ["Supplier Balance", money(rows.reduce((sum, item) => sum + Math.max(0, item.purchaseCost - item.advancePaid), 0))],
      ],
      headers: ["Bill No", "Product", "Qty", "Supplier", "Purchase Cost", "Advance", "Balance", "Expected", "Status", "Notes"],
      rows: rows.map((item) => [item.billNo, `${item.productCode} · ${item.productName}`, item.qty, suppliers.find((supplier) => supplier.id === item.supplierId)?.name || "Unknown", item.purchaseCost, item.advancePaid, Math.max(0, item.purchaseCost - item.advancePaid), item.expectedDate, item.status, item.notes]),
    };
  }
  if (type === "tasks") {
    const rows = tasks.filter((item) => (!from || (item.dueDate || item.createdAt.slice(0, 10)) >= from) && (!to || (item.dueDate || item.createdAt.slice(0, 10)) <= to));
    return {
      title: "Tasks & Commitments Report", subtitle: dateLabel,
      summary: [["Tasks", String(rows.length)], ["Pending", String(rows.filter((item) => item.status === "Pending").length)], ["In Progress", String(rows.filter((item) => item.status === "In progress").length)], ["Completed", String(rows.filter((item) => item.status === "Completed").length)]],
      headers: ["Category", "Task", "Details", "Assigned", "Due Date", "Priority", "Status", "Customer Phone"],
      rows: rows.map((item) => [item.category, item.title, item.details, item.assignedTo, item.dueDate, item.priority, item.status, item.linkedCustomerPhone]),
    };
  }
  if (type === "followup" || type === "complaints") {
    const accepted = type === "complaints" ? ["Complaint", "Service Call", "New Service"] : ["Enquiry", "Follow-up", "Order Follow-up", "Happy Call"];
    const rows = interactions.filter((item) => accepted.includes(item.type) && (!from || (item.nextFollowUp || item.createdAt.slice(0, 10)) >= from) && (!to || (item.nextFollowUp || item.createdAt.slice(0, 10)) <= to));
    return {
      title: type === "complaints" ? "Complaints & Service Report" : "Customer Follow-up Report", subtitle: dateLabel,
      summary: [["Records", String(rows.length)], ["Open", String(rows.filter((item) => item.status !== "Closed").length)], ["Closed", String(rows.filter((item) => item.status === "Closed").length)], ["Due / Overdue", String(rows.filter((item) => item.status !== "Closed" && item.nextFollowUp && item.nextFollowUp <= isoDate()).length)]],
      headers: ["Customer", "Phone", "Type", "Details / Resolution", "Assigned", "Next Follow-up", "Status"],
      rows: rows.map((item) => [item.customerName, item.customerPhone, item.type, item.details, item.assignedTo, item.nextFollowUp, item.status]),
    };
  }
  const collections = selected.flatMap((bill) => bill.paymentHistory);
  const modeTotal = (mode: string) =>
    collections
      .filter((payment) => payment.mode === mode)
      .reduce((sum, payment) => sum + payment.amount, 0);
  return {
    title: "Sales Report",
    subtitle: dateLabel,
    summary: [
      [
        "Total Sales",
        money(selected.reduce((sum, bill) => sum + bill.grandTotal, 0)),
      ],
      ["Bills", String(selected.length)],
      [
        "Total Paid",
        money(selected.reduce((sum, bill) => sum + bill.paidAmount, 0)),
      ],
      [
        "Balance",
        money(selected.reduce((sum, bill) => sum + bill.balanceAmount, 0)),
      ],
      ["Cash", money(modeTotal("CASH"))],
      ["GPAY", money(modeTotal("GPAY"))],
      ["Card", money(modeTotal("CARD"))],
    ],
    headers: [
      "Bill No",
      "Date",
      "Customer",
      "Phone",
      "Staff",
      "Counter",
      "Product Total",
      "Against Extra",
      "Discount",
      "Taxable Value",
      "CGST",
      "SGST",
      "Grand Total",
      "Paid",
      "Balance",
      "Payment",
    ],
    rows: selected.map((bill) => [
      bill.billNo,
      bill.createdAt.slice(0, 10),
      bill.customerName,
      bill.customerPhone,
      bill.staffName,
      bill.counterName,
      bill.productTotal,
      bill.againstOrderExtra,
      bill.discount,
      bill.taxableValue,
      bill.cgst,
      bill.sgst,
      bill.grandTotal,
      bill.paidAmount,
      bill.balanceAmount,
      bill.paymentMode,
    ]),
  };
}
