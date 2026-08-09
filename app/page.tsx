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
  staffNames: string[];
  counterNames: string[];
  defaultCounter: string;
  invoiceTerms: string;
};
type ExpoState = {
  products: Product[];
  bills: Bill[];
  settings: ExpoSettings;
  syncedAt: string;
};
type ReportData = {
  title: string;
  subtitle: string;
  summary: Array<[string, string]>;
  headers: string[];
  rows: Array<Array<string | number>>;
};

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
  businessName: "Furniture Expo",
  subtitle: "Live Billing Desk",
  gstin: "",
  phone: "",
  address: "",
  gstRate: 18,
  billPrefix: "EXP",
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
const paymentModes = ["CASH", "UPI", "CARD", "BANK TRANSFER", "MIXED"];
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
  const [active, setActive] = useState<Page>("dashboard");
  const [state, setState] = useState<ExpoState>({
    products: [],
    bills: [],
    settings: DEFAULT_SETTINGS,
    syncedAt: "",
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [busy, setBusy] = useState(true);
  const [online, setOnline] = useState(true);
  const [toast, setToast] = useState("");
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    staffName: "",
    counterName: "Counter 1",
    deliveryDate: "",
  });
  const [customerHint, setCustomerHint] = useState("");
  const [discountType, setDiscountType] = useState<"amount" | "percent">(
    "amount",
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("CASH");
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
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkImagesRef = useRef<HTMLInputElement>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const scanVideoRef = useRef<HTMLVideoElement>(null);
  const scanStreamRef = useRef<MediaStream | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3400);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setBusy(true);
      try {
        const response = await fetch("/api/expo", { cache: "no-store" });
        const data = (await response.json()) as ExpoState & { error?: string };
        if (!response.ok)
          throw new Error(data.error || "Cloud sync unavailable");
        setState(data);
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
        if (!silent)
          notify(error instanceof Error ? error.message : "Unable to connect");
      } finally {
        if (!silent) setBusy(false);
      }
    },
    [notify],
  );

  useEffect(() => {
    const initial = window.setTimeout(() => load(), 0);
    const timer = window.setInterval(() => load(true), 12000);
    const refresh = () => load(true);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load]);

  async function mutate(payload: Record<string, unknown>, success: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/expo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as ExpoState & { error?: string };
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
  const grandTotal = Math.max(0, subtotal - discount);
  const taxableValue =
    state.settings.gstRate > 0
      ? grandTotal / (1 + state.settings.gstRate / 100)
      : grandTotal;
  const gst = grandTotal - taxableValue;
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
      setCustomerHint(`Existing customer · Last bill ${prior.billNo}`);
    } else setCustomerHint("New customer");
  }

  async function confirmBill() {
    if (!cart.length) return notify("Add at least one product.");
    if (!customer.name.trim() || !customer.phone.trim())
      return notify("Customer name and phone number are required.");
    if (!online)
      return notify("Internet is required to confirm a bill safely.");
    const data = await mutate(
      {
        action: "createBill",
        bill: {
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address,
          staffName: customer.staffName,
          counterName: customer.counterName,
          deliveryDate: customer.deliveryDate,
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
        },
      },
      "Bill confirmed, GST calculated and stock synced.",
    );
    if (data) {
      const created = data.bills[0];
      setCart([]);
      setCustomer({
        name: "",
        phone: "",
        address: "",
        staffName: "",
        counterName: data.settings.defaultCounter || "Counter 1",
        deliveryDate: "",
      });
      setDiscountType("amount");
      setDiscountValue(0);
      setPaidAmount(0);
      setPaymentMode("CASH");
      setActive("bills");
      setSelectedBill(created || null);
    }
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
        price: index("Expo Price (Incl. GST)", "Expo Price", "Price"),
        stock: index("Stock Qty", "Stock", "Quantity"),
        mrp: index("MRP"),
        notes: index("Notes"),
      };
      if (columns.name < 0 || columns.price < 0)
        throw new Error("Product Name and Expo Price columns are required.");
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
        "Expo Price (Incl. GST)",
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
    XLSX.writeFile(workbook, "Furniture_Expo_Product_Inventory_Template.xlsx");
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
      "Expo settings, GST and staff lists saved.",
    );
  }

  function printBill(bill: Bill) {
    const popup = window.open("", "invoice", "width=900,height=900");
    if (!popup) return notify("Allow popups to print the invoice.");
    const settings = state.settings;
    popup.document.write(
      `<!doctype html><html><head><title>${bill.billNo}</title><style>body{font-family:Arial,sans-serif;color:#251a14;padding:30px;max-width:800px;margin:auto}.head{display:flex;justify-content:space-between;border-bottom:2px solid #251a14;padding-bottom:18px}h1{margin:0;font-size:28px}.muted{color:#766a62;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:9px 5px;border-bottom:1px solid #ddd;text-align:left;font-size:12px}th:last-child,td:last-child{text-align:right}.summary{margin-left:auto;width:350px;margin-top:20px}.row{display:flex;justify-content:space-between;padding:5px 0}.grand{font-size:19px;font-weight:bold;border-top:2px solid #251a14}.cancel{padding:10px;text-align:center;color:#b23d32;background:#f8e1de;font-weight:bold}.history{margin-top:18px}.history div{display:flex;justify-content:space-between;padding:5px;border-bottom:1px solid #eee}@media print{body{padding:0}}</style></head><body>${bill.status === "cancelled" ? '<div class="cancel">CANCELLED BILL</div>' : ""}<div class="head"><div><h1>${settings.businessName}</h1><div class="muted">${settings.address || settings.subtitle}</div><div class="muted">${settings.phone ? `Phone: ${settings.phone}` : ""} ${settings.gstin ? `· GSTIN: ${settings.gstin}` : ""}</div></div><div><b>${bill.billNo}</b><br><span class="muted">${shortDate(bill.createdAt)}</span></div></div><p><b>Customer:</b> ${bill.customerName} · ${bill.customerPhone}<br><span class="muted">${bill.customerAddress || ""}</span><br><span class="muted">Staff: ${bill.staffName || "—"} · Counter: ${bill.counterName || "—"}</span></p><table><thead><tr><th>Item</th><th>Type</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${bill.items.map((item) => `<tr><td><b>${item.name}</b><br><span class="muted">${item.code}${item.size ? ` · ${item.size}` : ""}${item.woodType ? ` · ${item.woodType}` : ""}${item.customizeDetails ? `<br>Customize: ${item.customizeDetails}` : ""}</span></td><td>${item.againstOrder ? "Against Order" : "Stock"}</td><td>${item.qty}</td><td>${money(item.price)}</td><td>${money(item.price * item.qty + Number(item.againstOrderExtra || 0))}</td></tr>`).join("")}</tbody></table><div class="summary"><div class="row"><span>Product Total</span><b>${money(bill.productTotal)}</b></div><div class="row"><span>Against Order Extra</span><b>${money(bill.againstOrderExtra)}</b></div><div class="row"><span>Discount</span><b>− ${money(bill.discount)}</b></div><div class="row"><span>Taxable Value</span><b>${money(bill.taxableValue)}</b></div><div class="row"><span>CGST ${state.settings.gstRate / 2}%</span><b>${money(bill.cgst)}</b></div><div class="row"><span>SGST ${state.settings.gstRate / 2}%</span><b>${money(bill.sgst)}</b></div><div class="row grand"><span>Grand Total</span><span>${money(bill.grandTotal)}</span></div><div class="row"><span>Paid</span><b>${money(bill.paidAmount)}</b></div><div class="row"><span>Balance</span><b>${money(bill.balanceAmount)}</b></div></div><p class="muted">GST Inclusive · Expected Delivery: ${bill.deliveryDate || "Not set"} · Delivery: ${bill.deliveryStatus}</p>${bill.paymentHistory.length ? `<div class="history"><b>Payment History</b>${bill.paymentHistory.map((payment) => `<div><span>${shortDate(payment.date)} · ${payment.mode}${payment.note ? ` · ${payment.note}` : ""}</span><b>${money(payment.amount)}</b></div>`).join("")}</div>` : ""}<p style="margin-top:35px;text-align:center" class="muted">${settings.invoiceTerms}</p><script>window.onload=()=>window.print()</script></body></html>`,
    );
    popup.document.close();
  }
  function shareWhatsApp(bill: Bill) {
    const text = `${state.settings.businessName}\nInvoice: ${bill.billNo}\nCustomer: ${bill.customerName}\nTotal: ${money(bill.grandTotal)}\nPaid: ${money(bill.paidAmount)}\nBalance: ${money(bill.balanceAmount)}\nDelivery: ${bill.deliveryDate || "Not set"}\nThank you!`;
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
      ["Bill No", bill.billNo, "Date", shortDate(bill.createdAt)],
      ["Customer", bill.customerName, "Phone", bill.customerPhone],
      ["Staff", bill.staffName, "Counter", bill.counterName],
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
      ["Grand Total", bill.grandTotal],
      ["Paid", bill.paidAmount],
      ["Balance", bill.balanceAmount],
      ["Expected Delivery", bill.deliveryDate],
      ["Delivery Status", bill.deliveryStatus],
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
      "Invoice",
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
      ),
    [
      reportType,
      activeBills,
      state.products,
      reportFrom,
      reportTo,
      inRange,
      state.settings.gstRate,
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
    scanStreamRef.current?.getTracks().forEach((track) => track.stop());
    scanStreamRef.current = null;
    setScannerOpen(false);
  }, []);
  async function startScanner() {
    setScannerOpen(true);
    setScanStatus("Starting camera…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      scanStreamRef.current = stream;
      await new Promise((resolve) => setTimeout(resolve, 120));
      if (!scanVideoRef.current) return;
      scanVideoRef.current.srcObject = stream;
      await scanVideoRef.current.play();
      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (options: { formats: string[] }) => {
            detect(
              source: HTMLVideoElement,
            ): Promise<Array<{ rawValue: string }>>;
          };
        }
      ).BarcodeDetector;
      if (!Detector) {
        setScanStatus(
          "QR camera detection is not available in this browser. Use product search/code instead.",
        );
        return;
      }
      const detector = new Detector({ formats: ["qr_code"] });
      setScanStatus("Point the camera at the product QR code.");
      const scan = async () => {
        if (!scanStreamRef.current || !scanVideoRef.current) return;
        try {
          const codes = await detector.detect(scanVideoRef.current);
          if (codes[0]?.rawValue) {
            const code = codes[0].rawValue.trim().toUpperCase();
            const product = state.products.find(
              (item) => item.code.toUpperCase() === code,
            );
            if (product) {
              addToCart(product);
              notify(`${product.name} added by QR.`);
              closeScanner();
              return;
            }
            setScanStatus(`Code ${code} is not in inventory.`);
          }
        } catch {
          void 0;
        }
        if (scanStreamRef.current) window.setTimeout(scan, 450);
      };
      scan();
    } catch (error) {
      setScanStatus(
        error instanceof Error
          ? error.message
          : "Camera permission unavailable.",
      );
    }
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-mark">
          <span>FE</span>
          <div>
            <strong>{state.settings.businessName}</strong>
            <small>{state.settings.subtitle}</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
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
            label="New bill"
          />
          <Nav
            active={active === "products"}
            onClick={() => setActive("products")}
            icon="▦"
            label="Products"
          />
          <Nav
            active={active === "bills"}
            onClick={() => setActive("bills")}
            icon="≡"
            label="Bills"
          />
          <Nav
            active={active === "deliveries"}
            onClick={() => setActive("deliveries")}
            icon="⇢"
            label="Deliveries"
          />
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
      </aside>
      <main className="main-content">
        <header className="mobile-header">
          <div className="brand-mark compact">
            <span>FE</span>
            <div>
              <strong>{state.settings.businessName}</strong>
              <small>{online ? "Cloud live" : "Offline"}</small>
            </div>
          </div>
          <button
            className="icon-button"
            onClick={() => load()}
            aria-label="Sync now"
          >
            ↻
          </button>
        </header>
        <div className="mobile-tabs" role="tablist">
          <Nav
            active={active === "dashboard"}
            onClick={() => setActive("dashboard")}
            icon="⌂"
            label="Home"
          />
          <Nav
            active={active === "billing"}
            onClick={() => setActive("billing")}
            icon="₹"
            label="Bill"
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
            label="Bills"
          />
          <Nav
            active={active === "deliveries"}
            onClick={() => setActive("deliveries")}
            icon="⇢"
            label="Delivery"
          />
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
            label="Setup"
          />
        </div>

        {active === "dashboard" && (
          <section className="page-section dashboard-page">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Live expo overview</span>
                <h1>Good decisions, at a glance.</h1>
                <p>
                  Sales, stock, delivery and collections from every counter.
                </p>
              </div>
              <button
                className="primary-small"
                onClick={() => setActive("billing")}
              >
                ＋ Start new bill
              </button>
            </div>
            <div className="metric-grid">
              <Metric
                label="Today sales"
                value={money(todaySales)}
                note={`${todayBills.length} confirmed bills`}
              />
              <Metric
                label="Ready stock"
                value={String(totalStock)}
                note={`${state.products.length} product models`}
              />
              <Metric
                label="Payment pending"
                value={money(pendingAmount)}
                note={`${activeBills.filter((bill) => bill.balanceAmount > 0).length} bills with balance`}
                alert
              />
              <Metric
                label="Today delivery"
                value={String(deliveryCounts.today)}
                note={`${deliveryCounts.pending} pending / overdue`}
              />
            </div>
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
          </section>
        )}

        {active === "billing" && (
          <section className="billing-layout">
            <div className="catalog-panel">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Expo counter</span>
                  <h1>Build a GST bill, fast.</h1>
                  <p>
                    QR scan, stock split and GST-inclusive pricing are ready.
                  </p>
                </div>
                <div className="today-pill">
                  <span>Today</span>
                  <strong>{money(todaySales)}</strong>
                  <small>{todayBills.length} confirmed bills</small>
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
            <aside className="cart-panel">
              <div className="cart-title">
                <div>
                  <span className="eyebrow">Current order</span>
                  <h2>GST bill summary</h2>
                </div>
                <span className="count-badge">
                  {cart.reduce((sum, item) => sum + item.qty, 0)}
                </span>
              </div>
              <div className="cart-items">
                {cart.map((item, index) => (
                  <div
                    className="cart-item expanded"
                    key={`${item.id}-${item.againstOrder}-${index}`}
                  >
                    <ProductThumb product={item} />
                    <div className="cart-item-main">
                      <div className="cart-item-head">
                        <strong>{item.name}</strong>
                        <button onClick={() => removeCart(index)}>×</button>
                      </div>
                      <small>
                        {item.code} · Ready stock {item.stockQty}
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
                        <input
                          className="line-price"
                          type="number"
                          min="0"
                          value={item.price}
                          onChange={(event) =>
                            updateCart(index, {
                              price: Math.max(0, Number(event.target.value)),
                            })
                          }
                          aria-label="Unit price"
                        />
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
                    <strong>Your bill is empty</strong>
                    <small>Tap a product or scan its QR code.</small>
                  </div>
                )}
              </div>
              <div className="customer-fields">
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
                <div className="field-pair">
                  <label>
                    Attending staff
                    <input
                      list="staff-list"
                      value={customer.staffName}
                      onChange={(event) =>
                        setCustomer({
                          ...customer,
                          staffName: event.target.value,
                        })
                      }
                    />
                    <datalist id="staff-list">
                      {state.settings.staffNames.map((item) => (
                        <option value={item} key={item} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Counter
                    <input
                      list="counter-list"
                      value={customer.counterName}
                      onChange={(event) =>
                        setCustomer({
                          ...customer,
                          counterName: event.target.value,
                        })
                      }
                    />
                    <datalist id="counter-list">
                      {state.settings.counterNames.map((item) => (
                        <option value={item} key={item} />
                      ))}
                    </datalist>
                  </label>
                </div>
                <label>
                  Expected delivery
                  <input
                    type="date"
                    value={customer.deliveryDate}
                    onChange={(event) =>
                      setCustomer({
                        ...customer,
                        deliveryDate: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="totals detailed">
                <div>
                  <span>Product total</span>
                  <strong>{money(productTotal)}</strong>
                </div>
                <div>
                  <span>Against Order extra</span>
                  <strong>{money(againstOrderExtra)}</strong>
                </div>
                <div>
                  <span>Subtotal</span>
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
                  Expo price is GST inclusive · GST is split, not added again.
                </small>
                <div className="grand-total">
                  <span>Grand total</span>
                  <strong>{money(grandTotal)}</strong>
                </div>
              </div>
              <div className="pay-buttons">
                {paymentModes.slice(0, 3).map((mode) => (
                  <button
                    key={mode}
                    className={paymentMode === mode ? "active" : ""}
                    onClick={() => setPaymentMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="payment-pair">
                <label>
                  Amount paid
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
              <button
                className="primary-action"
                disabled={!cart.length || busy || !online}
                onClick={confirmBill}
              >
                {busy ? "Syncing…" : "Confirm GST bill"}
                <span>→</span>
              </button>
              <p className="stock-note">
                Atomic stock check prevents the same last piece being sold
                twice.
              </p>
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
                note="At expo price"
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
                    <th>Expo price</th>
                    <th>Stock</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
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
                        <span
                          className={`stock-badge ${product.stockQty <= 2 ? "low" : ""}`}
                        >
                          {product.stockQty}
                        </span>
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
                <span className="eyebrow">Sales history</span>
                <h1>Bills, payments & balance.</h1>
                <p>View, edit, print, export, share or cancel every invoice.</p>
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
                  placeholder="Bill no, customer, phone, staff or counter…"
                />
              </label>
              <button className="text-button" onClick={() => load()}>
                ↻ Sync bills
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
                ["staff", "Staff / Counter"],
                ["against", "Against Order"],
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
                <span className="eyebrow">Expo setup</span>
                <h1>Business, GST & counters.</h1>
                <p>Invoice identity and counter suggestions sync everywhere.</p>
              </div>
            </div>
            <form className="settings-card" onSubmit={saveSettings}>
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
                    Entered Expo Price is the final customer price. GST is split
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
                Expo price incl. GST
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
                <span className="eyebrow">GST Invoice</span>
                <h2>{selectedBill.billNo}</h2>
              </div>
              <button onClick={() => setSelectedBill(null)}>×</button>
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
                <span>Staff / Counter</span>
                <strong>
                  {selectedBill.staffName || "Unassigned"} ·{" "}
                  {selectedBill.counterName || "—"}
                </strong>
                <small>{shortDate(selectedBill.createdAt)}</small>
              </div>
            </div>
            <div className="invoice-items">
              {selectedBill.items.map((item, index) => (
                <div key={`${item.code}-${index}`}>
                  <div>
                    <strong>{item.name}</strong>
                    <small>
                      {item.code} ·{" "}
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
                </div>
              ))}
            </div>
            <div className="invoice-totals">
              <div>
                <span>Product total</span>
                <strong>{money(selectedBill.productTotal)}</strong>
              </div>
              <div>
                <span>Against Order extra</span>
                <strong>{money(selectedBill.againstOrderExtra)}</strong>
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
              <div className="grand-total">
                <span>Grand total</span>
                <strong>{money(selectedBill.grandTotal)}</strong>
              </div>
              <div>
                <span>Paid</span>
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
              <span
                className={`delivery-status ${deliveryBucket(selectedBill)}`}
              >
                {deliveryLabel(deliveryBucket(selectedBill))}
              </span>
            </div>
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
                onClick={() => printBill(selectedBill)}
              >
                Print / PDF
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
                <button
                  className="secondary-action"
                  onClick={() => setEditingBill({ ...selectedBill })}
                >
                  Edit details
                </button>
              )}
              {selectedBill.status !== "cancelled" && (
                <button
                  className="danger-button"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        "Cancel this bill and restore ready stock?",
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
                  Cancel bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {editingBill && (
        <div className="modal-backdrop">
          <form
            className="modal-card"
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
                <span className="eyebrow">Edit bill details</span>
                <h2>{editingBill.billNo}</h2>
              </div>
              <button type="button" onClick={() => setEditingBill(null)}>
                ×
              </button>
            </div>
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
                Staff
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
                Counter
                <input
                  value={editingBill.counterName}
                  onChange={(event) =>
                    setEditingBill({
                      ...editingBill,
                      counterName: event.target.value,
                    })
                  }
                />
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
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-action"
                onClick={() => setEditingBill(null)}
              >
                Cancel
              </button>
              <button className="primary-small">Save changes</button>
            </div>
          </form>
        </div>
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
    /sales|paid|balance|price|value|cgst|sgst|gst|extra|total|amount|cash|upi|card|discount/i.test(
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
        ["UPI", money(modes.UPI || 0)],
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
        "Expo Price",
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
        counter: string;
        bills: number;
        sales: number;
        paid: number;
        balance: number;
        against: number;
      }
    >();
    selected.forEach((bill) => {
      const staff = bill.staffName || "Unassigned",
        counter = bill.counterName || "Unassigned",
        key = `${staff}||${counter}`,
        row = map.get(key) || {
          staff,
          counter,
          bills: 0,
          sales: 0,
          paid: 0,
          balance: 0,
          against: 0,
        };
      row.bills++;
      row.sales += bill.grandTotal;
      row.paid += bill.paidAmount;
      row.balance += bill.balanceAmount;
      if (bill.items.some((item) => item.againstOrder)) row.against++;
      map.set(key, row);
    });
    const rows = [...map.values()].sort((a, b) => b.sales - a.sales);
    return {
      title: "Staff / Counter Report",
      subtitle: dateLabel,
      summary: [
        [
          "Staff",
          String(
            new Set(selected.map((bill) => bill.staffName || "Unassigned"))
              .size,
          ),
        ],
        [
          "Counters",
          String(
            new Set(selected.map((bill) => bill.counterName || "Unassigned"))
              .size,
          ),
        ],
        ["Bills", String(selected.length)],
        [
          "Sales",
          money(selected.reduce((sum, bill) => sum + bill.grandTotal, 0)),
        ],
      ],
      headers: [
        "Staff",
        "Counter",
        "Bills",
        "Sales",
        "Paid",
        "Balance",
        "Against Bills",
        "Average Bill",
      ],
      rows: rows.map((row) => [
        row.staff,
        row.counter,
        row.bills,
        row.sales,
        row.paid,
        row.balance,
        row.against,
        row.bills ? row.sales / row.bills : 0,
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
      ["UPI", money(modeTotal("UPI"))],
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
