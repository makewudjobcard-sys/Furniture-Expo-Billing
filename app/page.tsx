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
  | "settings"
  | "finance";
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
  costSegment: string;
  comfortTag: string;
  materialTag: string;
  lookTag: string;
  utilityTag: string;
  trendTag: string;
  skinType: string;
};
type CartItem = Product & {
  qty: number;
  againstOrder: boolean;
  againstOrderExtra: number;
  customizeDetails: string;
  customMode?: "Customization" | "Personalization";
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
  imageKey?: string;
  imageUrl?: string;
  customMode?: "Customization" | "Personalization";
};
type Bill = {
  id: string;
  billNo: string;
  clientKey?: string;
  clientRequestId?: string;
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
  linkedCustomerPhone: string; customerName: string; customerPhone: string; enquiredProducts: string;
  attendedBy: string; commitmentDate: string; notes: string; completionReason: string;
  createdAt: string; updatedAt: string;
};
type CurrentUser = { username: string; role: "md" | "client"; clientKey: string; label: string };
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
type Lead = {
  id: string; customerName: string; phone: string; source: string; interest: string;
  assignedTo: string; followUpDate: string; status: string; notes: string;
  createdAt: string; updatedAt: string;
};
type JobCard = {
  id: string; jobNo: string; customerName: string; phone: string; billId: string;
  measurements: string; woodMaterial: string; fabric: string; foam: string; polish: string;
  referenceImages: string[]; estimatedCost: number; assignedTo: string;
  expectedDate: string; stage: string; notes: string; createdAt: string; updatedAt: string;
};
type HeldOrder = {
  id: string; name: string; payload: BillingDraft; createdAt: string; updatedAt: string;
};
type StockVerification = {
  id: string; checkedBy: string; notes: string;
  lines: Array<{ productId: string; code: string; name: string; systemQty: number; countedQty: number }>;
  createdAt: string;
};
type StockEntry = { id: string; productId: string; clientKey: string; quantity: number; entryDate: string; createdAt: string };
type FinanceCommitment = {
  id: string; amount: number; payee: string; dueDate: string; accountHead: string;
  raisedBy: string; approvedBy: string; createdAt: string;
};
type FinanceExpense = {
  id: string; amount: number; payee: string; automatedDate: string; accountHead: string;
  raisedBy: string; approvedBy: string; createdAt: string;
};
type FinanceControls = {
  accountFund: number; cashInHand: number; cashInBank: number; deliveredCollection: number; pendingCollection: number; depositAmount: number; excessAmount: number;
};
type FinanceMember = { id: string; name: string; memberType: "Negotiable" | "Non-Negotiable"; amount: number; dueDate: string; notes: string; status: string; createdAt: string; updatedAt: string };
const financeTabOptions = [
  ["overview", "Financial overview", "◉"],
  ["commitments", "Commitment log", "◷"],
  ["expenses", "Expense log", "₹"],
  ["bills", "Bill balance details", "▤"],
  ["members", "Member login", "✓"],
] as const;
type BillingDraft = {
  cart: CartItem[];
  customer: {
    name: string; phone: string; address: string; staffName: string; counterName: string;
    deliveryDate: string; accountantName: string; managerName: string; orderNotes: string;
  };
  billingStep: 1 | 2 | 3;
  discountType: "amount" | "percent"; discountValue: number; paidAmount: number;
  paymentMode: string; cardCharge: number; transportCharge: number; otherCharge: number;
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
  leads: Lead[];
  jobCards: JobCard[];
  heldOrders: HeldOrder[];
  stockVerifications: StockVerification[];
  stockEntries: StockEntry[];
  financeCommitments: FinanceCommitment[];
  financeExpenses: FinanceExpense[];
  financeControls: FinanceControls;
  financeMembers: FinanceMember[];
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
  incomplete?: () => void;
  kind?: "task";
  assignedTo?: string;
  updatedAt?: string;
};
type ThemeName = "teak" | "forest" | "light" | "midnight" | "ocean" | "rose";
type DensityName = "comfortable" | "compact";
type FontName = "system" | "modern" | "classic" | "friendly";
type TextScaleName = "small" | "normal" | "large";

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
  costSegment: "",
  comfortTag: "",
  materialTag: "",
  lookTag: "",
  utilityTag: "",
  trendTag: "",
  skinType: "",
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
  "Custom Made",
];
const productCategoryOptions = [
  "Cot", "Mattress", "Sofa", "Suite Chair", "Lounge", "Office Chair", "Office Table",
  "Dining Table", "Dining Chairs", "Dining Set", "Wardrobe", "TV Console", "Gift Articles",
  "Wall hangings", "Pillows", "Utilities & Accessories", "Miscellaneous", "Custom Made",
];
const productTagOptions = {
  costSegment: ["Economy / Budget", "Mid-Segment", "Premium", "Luxury", "Max Value"],
  comfortTag: ["Ortho-Supported", "Lounging / Relaxed", "Attentive / Office", "Residential Comfort", "Long-Stay Comfort"],
  materialTag: ["Teak", "Pine", "Rubberwood", "Plywood", "MDF", "Engineered Wood"],
  lookTag: ["Traditional", "Modern", "Sleek", "Contemporary", "Futuristic"],
  utilityTag: ["Compact / Space Saving", "Convertible", "Reclining", "Concealed Storage", "Sofa Cum Bed"],
  trendTag: ["New Arrival", "Clearance", "Hot Pick", "Made to Order"],
};
const paymentModes = ["CASH", "GPAY", "CARD", "RTGS", "BAJAJ", "CHEQUE"];
const deliveryStages = ["Order Booked", "Supplier Assigned", "In Production", "Ready", "Out for Delivery", "Delivered"];
const taskTemplates = [
  { icon: "☎", key: "follow-up", category: "Follow-up", title: "Customer follow-up", details: "Call the customer and record the next action." },
  { icon: "✦", key: "cleaning", category: "Cleaning", title: "Showroom cleaning check", details: "Check entrance, displays, products and billing counter." },
  { icon: "✺", key: "marketing", category: "Marketing", title: "Marketing activity", details: "Plan today’s promotion, social post or lead follow-up." },
  { icon: "↗", key: "development", category: "Development", title: "Business development", details: "Review improvement ideas, staff needs and showroom growth work." },
  { icon: "₹", key: "financial", category: "Financial Commitment", title: "Payment commitment", details: "Record the payable/receivable amount and completion plan." },
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
const leadSources = ["Walk-in", "Instagram", "Google", "Referral", "WhatsApp", "Facebook", "Other"];
const leadStatuses = ["New", "Contacted", "Interested", "Quotation", "Won", "Lost"];
const jobStages = ["New", "Design approval", "Material ready", "Carpentry", "Upholstery", "Polish", "Quality check", "Ready", "Delivered"];

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
function displayEntryDate(value: string) {
  const parts = value.split("-");
  return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : value;
}
function productCodePreview(category: string, name: string) {
  const part = (value: string, fallback: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 4) || fallback;
  return `${isoDate().replace(/-/g, "")}-${part(category, "PROD")}-${part(name, "ITEM")}-AUTO`;
}
function splitProductTags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
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
  const [loginMode, setLoginMode] = useState<"showroom" | "md">("showroom");
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
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
    leads: [],
    jobCards: [],
    heldOrders: [],
    stockVerifications: [],
    stockEntries: [],
    financeCommitments: [],
    financeExpenses: [],
    financeControls: { accountFund: 0, cashInHand: 0, cashInBank: 0, deliveredCollection: 0, pendingCollection: 0, depositAmount: 0, excessAmount: 0 },
    financeMembers: [],
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
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [customProductForm, setCustomProductForm] = useState({ name: "", size: "", woodType: "", price: 0, qty: 1, details: "", mode: "Customization" as "Customization" | "Personalization" });
  const [customProductImageFile, setCustomProductImageFile] = useState<File | null>(null);
  const [customProductImagePreview, setCustomProductImagePreview] = useState("");
  const [stockEntry, setStockEntry] = useState<{ product: Product | null; quantity: number; entryDate: string }>({ product: null, quantity: 1, entryDate: isoDate() });
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
  const [operationsTab, setOperationsTab] = useState<"tasks" | "customers" | "leads" | "jobs">("tasks");
  const [taskFilter, setTaskFilter] = useState<"active" | "completed" | "all">("active");
  const [taskSort, setTaskSort] = useState<"newest" | "assigned" | "due">("newest");
  const [taskStaffFilter, setTaskStaffFilter] = useState<string[]>([]);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeName>("forest");
  const [billingStep, setBillingStep] = useState<1 | 2 | 3>(1);
  const [draftBillNo, setDraftBillNo] = useState("Next bill number");
  const [draftOrderDate, setDraftOrderDate] = useState(() => isoDate());
  const [savedBillForJobCard, setSavedBillForJobCard] = useState<Bill | null>(null);
  const [density, setDensity] = useState<DensityName>("comfortable");
  const [fontName, setFontName] = useState<FontName>("system");
  const [textScale, setTextScale] = useState<TextScaleName>("normal");
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [leadForm, setLeadForm] = useState<Partial<Lead>>({ source: "Walk-in", status: "New", followUpDate: isoDate() });
  const [jobCardForm, setJobCardForm] = useState<Partial<JobCard>>({ stage: "New", referenceImages: [] });
  const [jobReferenceFiles, setJobReferenceFiles] = useState<File[]>([]);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showJobCardForm, setShowJobCardForm] = useState(false);
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [resumedHoldId, setResumedHoldId] = useState("");
  const [showStockVerification, setShowStockVerification] = useState(false);
  const [stockCounts, setStockCounts] = useState<Record<string, number | "">>({});
  const [stockCheckMeta, setStockCheckMeta] = useState({ checkedBy: "", notes: "" });
  const [deliveryMonth, setDeliveryMonth] = useState(() => isoDate().slice(0, 7));
  const [restoredOffline, setRestoredOffline] = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({ status: "Active" });
  const [financeTab, setFinanceTab] = useState<"overview" | "commitments" | "expenses" | "bills" | "members">("overview");
  const [commitmentForm, setCommitmentForm] = useState<Partial<FinanceCommitment>>({ dueDate: isoDate(), amount: 0 });
  const [expenseForm, setExpenseForm] = useState<Partial<FinanceExpense>>({ automatedDate: isoDate(), amount: 0 });
  const [financeControlsForm, setFinanceControlsForm] = useState<FinanceControls>({ accountFund: 0, cashInHand: 0, cashInBank: 0, deliveredCollection: 0, pendingCollection: 0, depositAmount: 0, excessAmount: 0 });
  const [financeMemberForm, setFinanceMemberForm] = useState<Partial<FinanceMember>>({ memberType: "Negotiable", status: "Pending", dueDate: isoDate() });
  const [financeMemberTab, setFinanceMemberTab] = useState<"Negotiable" | "Non-Negotiable" | "Overview">("Overview");
  const [showCommitmentForm, setShowCommitmentForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<ExpoTask>>({ category: "Follow-up", priority: "Normal", status: "Pending" });
  const [taskCategoryLocked, setTaskCategoryLocked] = useState(false);
  const [taskTemplateKey, setTaskTemplateKey] = useState("");
  const [incompleteTask, setIncompleteTask] = useState<ExpoTask | null>(null);
  const [incompleteReason, setIncompleteReason] = useState("");
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
  const syncInFlightRef = useRef(false);
  const mutationInFlightRef = useRef(false);
  const taskSaveLockRef = useRef(false);
  const draftLoadedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3400);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("smaarthome-theme") as ThemeName | null;
    const savedTheme = themes.some((item) => item.id === saved) ? saved! : "teak";
    // The old Ocean selection produced the blue rail shown in the previous UI;
    // migrate that saved preference to the neutral Clean White workspace once.
    const next = savedTheme === "ocean" ? "light" : savedTheme;
    const savedDensity = window.localStorage.getItem("smaarthome-density") as DensityName | null;
    const nextDensity = savedDensity === "compact" ? "compact" : "comfortable";
    const savedFont = window.localStorage.getItem("smaarthome-font") as FontName | null;
    const nextFont: FontName = ["modern", "classic", "friendly"].includes(savedFont || "") ? savedFont! : "system";
    const savedScale = window.localStorage.getItem("smaarthome-text-scale") as TextScaleName | null;
    const nextScale: TextScaleName = savedScale === "small" || savedScale === "large" ? savedScale : "normal";
    const frame = window.requestAnimationFrame(() => {
      setTheme(next);
      setDensity(nextDensity);
      setFontName(nextFont);
      setTextScale(nextScale);
      document.documentElement.dataset.theme = next;
      if (savedTheme === "ocean") window.localStorage.setItem("smaarthome-theme", next);
      document.documentElement.dataset.density = nextDensity;
      document.documentElement.dataset.font = nextFont;
      document.documentElement.dataset.textScale = nextScale;
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

  function changeFont(next: FontName) {
    setFontName(next);
    document.documentElement.dataset.font = next;
    window.localStorage.setItem("smaarthome-font", next);
  }

  function changeTextScale(next: TextScaleName) {
    setTextScale(next);
    document.documentElement.dataset.textScale = next;
    window.localStorage.setItem("smaarthome-text-scale", next);
  }

  useEffect(() => {
    let current = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean; user?: CurrentUser | null }) => {
        if (current) {
          setAuthStatus(result.authenticated ? "logged_in" : "logged_out");
          setCurrentUser(result.user || null);
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
      const result = await response.json() as { error?: string; user?: CurrentUser };
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      setAuthStatus("logged_in");
      setCurrentUser(result.user || null);
      setActive("dashboard");
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
    setState({ products: [], bills: [], settings: DEFAULT_SETTINGS, suppliers: [], tasks: [], interactions: [], supplierAssignments: [], auditLogs: [], leads: [], jobCards: [], heldOrders: [], stockVerifications: [], stockEntries: [], financeCommitments: [], financeExpenses: [], financeControls: { accountFund: 0, cashInHand: 0, cashInBank: 0, deliveredCollection: 0, pendingCollection: 0, depositAmount: 0, excessAmount: 0 }, financeMembers: [], syncedAt: "" });
    setCart([]);
    setCurrentUser(null);
    window.localStorage.removeItem("smaarthome-offline-session");
    setAuthStatus("logged_out");
  }

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (syncInFlightRef.current || mutationInFlightRef.current) return;
      syncInFlightRef.current = true;
      if (!silent) setBusy(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 25000);
      try {
        const response = await fetch("/api/expo", { cache: "no-store", signal: controller.signal });
        const data = (await response.json()) as ExpoState & { error?: string };
        if (response.status === 401) setAuthStatus("logged_out");
        if (!response.ok)
          throw new Error(data.error || "Cloud sync unavailable");
        setState(data);
        window.localStorage.setItem("smaarthome-offline-state", JSON.stringify(data));
        setRestoredOffline(false);
        setSettingsForm(data.settings || DEFAULT_SETTINGS);
        setFinanceControlsForm(data.financeControls || { accountFund: 0, cashInHand: 0, cashInBank: 0, deliveredCollection: 0, pendingCollection: 0, depositAmount: 0, excessAmount: 0 });
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
            setState({ ...restored, auditLogs: restored.auditLogs || [], leads: restored.leads || [], jobCards: restored.jobCards || [], heldOrders: restored.heldOrders || [], stockVerifications: restored.stockVerifications || [], stockEntries: restored.stockEntries || [], financeCommitments: restored.financeCommitments || [], financeExpenses: restored.financeExpenses || [], financeMembers: restored.financeMembers || [], financeControls: restored.financeControls || { accountFund: 0, cashInHand: 0, cashInBank: 0, deliveredCollection: 0, pendingCollection: 0, depositAmount: 0, excessAmount: 0 } });
            setRestoredOffline(true);
          } catch {
            window.localStorage.removeItem("smaarthome-offline-state");
          }
        }
        if (!silent)
          notify(error instanceof Error ? error.message : "Unable to connect");
      } finally {
        window.clearTimeout(timeout);
        syncInFlightRef.current = false;
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
          setDraftRestored(true);
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

  async function mutate(payload: Record<string, unknown>, success: string, persistError = false) {
    if (mutationInFlightRef.current) return null;
    mutationInFlightRef.current = true;
    setBusy(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch("/api/expo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const responseText = await response.text();
      let data: ExpoState & { error?: string };
      try {
        data = JSON.parse(responseText) as ExpoState & { error?: string };
      } catch {
        throw new Error(response.ok ? "Server returned an incomplete response. Please retry." : `Server error ${response.status}. Please retry.`);
      }
      if (response.status === 401) setAuthStatus("logged_out");
      if (!response.ok) throw new Error(data.error || "Unable to save");
      setState(data);
      window.localStorage.setItem("smaarthome-offline-state", JSON.stringify(data));
      setRestoredOffline(false);
      setSettingsForm(data.settings || DEFAULT_SETTINGS);
      setFinanceControlsForm(data.financeControls || { accountFund: 0, cashInHand: 0, cashInBank: 0, deliveredCollection: 0, pendingCollection: 0, depositAmount: 0, excessAmount: 0 });
      setOnline(true);
      if (persistError) setSaveError("");
      notify(success);
      return data;
    } catch (error) {
      setOnline(false);
      const message = error instanceof Error ? error.message : "Unable to save";
      if (persistError) setSaveError(message);
      notify(message);
      return null;
    } finally {
      window.clearTimeout(timeout);
      mutationInFlightRef.current = false;
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
    await mutate({ action: "adjustStock", id: product.id, delta, entryDate: isoDate() }, `${product.code} stock ${delta > 0 ? "added" : "reduced"}.`);
  }

  function stockIn(product: Product) {
    setStockEntry({ product, quantity: 1, entryDate: isoDate() });
  }

  async function saveStockEntry(event: FormEvent) {
    event.preventDefault();
    if (!stockEntry.product || stockEntry.quantity <= 0) return notify("Enter a valid stock quantity above zero.");
    await mutate({ action: "adjustStock", id: stockEntry.product.id, delta: Math.floor(stockEntry.quantity), entryDate: stockEntry.entryDate }, `${stockEntry.product.code} stock received and dated.`);
    setStockEntry({ product: null, quantity: 1, entryDate: isoDate() });
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
  const financeCommitmentTotal = state.financeCommitments.reduce((sum, item) => sum + item.amount, 0);
  const financeExpenseTotal = state.financeExpenses.reduce((sum, item) => sum + item.amount, 0);
  const financeAvailableTotal = (financeControlsForm.accountFund || 0) + (financeControlsForm.cashInHand || 0) + (financeControlsForm.cashInBank || 0);
  const financePotentialTotal = (financeControlsForm.deliveredCollection || 0) + (financeControlsForm.pendingCollection || 0);
  const financeExcessDeficit = financeCommitmentTotal - (financeAvailableTotal + financePotentialTotal);
  const draftBillPrefix = currentUser?.role === "client"
    ? currentUser.clientKey.toUpperCase()
    : (state.settings.billPrefix || "SHF").toUpperCase();
  const nextBillNumber = useMemo(() => {
    const highest = state.bills.reduce((max, bill) => {
      if (!bill.billNo?.startsWith(`${draftBillPrefix}-`)) return max;
      const number = Number(bill.billNo.slice(draftBillPrefix.length + 1));
      return Number.isFinite(number) ? Math.max(max, number) : max;
    }, 0);
    return `${draftBillPrefix}-${String(highest + 1).padStart(2, "0")}`;
  }, [state.bills, draftBillPrefix]);
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
    if (!customer.deliveryDate) return notify("Choose the expected delivery date before saving.");
    if (!online) {
      setSaveError("Internet connection is required. Your draft is safe—reconnect and press Retry save.");
      return notify("Internet is required to save an order safely.");
    }
    setSaveError("");
    if (!billRequestIdRef.current) billRequestIdRef.current = crypto.randomUUID();
    const requestId = billRequestIdRef.current;
    const data = await mutate(
      {
        action: "createBill",
        bill: {
          clientRequestId: requestId,
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
            imageKey: item.imageKey,
            imageUrl: item.imageUrl,
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
      true,
    );
    if (data) {
      const created = data.bills.find((bill) => bill.clientRequestId === requestId) || data.bills[0];
      if (!created) {
        setSaveError("Order response could not be verified. Your draft is still safe; press Retry save.");
        return;
      }
      billRequestIdRef.current = "";
      setDraftBillNo(created.billNo);
      setDraftOrderDate(created.createdAt.slice(0, 10));
      setSavedBillForJobCard(created);
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
      setDraftRestored(false);
      setSaveError("");
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
      if (resumedHoldId) {
        await mutate({ action: "deleteHeldOrder", id: resumedHoldId }, "Saved order removed from Held bills.");
        setResumedHoldId("");
      }
    }
  }

  function continueBilling() {
    if (billingStep === 1) {
      if (!customer.name.trim() || !customer.phone.trim())
        return notify("Enter customer name and mobile number to continue.");
      setBillingStep(2);
      return;
    }
    if (!cart.length) return notify("Add at least one product to continue.");
    setMobileSummaryOpen(false);
    setBillingStep(3);
  }

  function currentBillingDraft(): BillingDraft {
    return {
      cart, customer, billingStep, discountType, discountValue, paidAmount,
      paymentMode, cardCharge, transportCharge, otherCharge,
    };
  }

  function clearBillingDraft() {
    setCart([]);
    setCustomer({
      name: "", phone: "", address: "", staffName: "",
      counterName: state.settings.defaultCounter || "Counter 1", deliveryDate: "",
      accountantName: "", managerName: "", orderNotes: "",
    });
    setDiscountType("amount");
    setDiscountValue(0);
    setPaidAmount(0);
    setPaymentMode("CASH");
    setCardCharge(0);
    setTransportCharge(0);
    setOtherCharge(0);
    setBillingStep(1);
    setSaveError("");
    setDraftRestored(false);
    setResumedHoldId("");
    billRequestIdRef.current = "";
    window.localStorage.removeItem("smaarthome-order-draft");
  }

  function startNewOrder() {
    if (currentUser?.role === "md") {
      notify("Managing Director login is view-only. Sign in to a showroom to create a new order.");
      return;
    }
    clearBillingDraft();
    setSavedBillForJobCard(null);
    setDraftOrderDate(isoDate());
    setDraftBillNo(nextBillNumber);
    setActive("billing");
  }

  async function holdCurrentBill() {
    if (!cart.length && !customer.name.trim() && !customer.phone.trim()) return notify("Start a bill before holding it.");
    const name = `${customer.name.trim() || "Walk-in customer"} · ${cart.reduce((sum, item) => sum + item.qty, 0)} items`;
    const data = await mutate({
      action: "saveHeldOrder",
      heldOrder: { id: resumedHoldId, name, payload: currentBillingDraft() },
    }, "Bill held safely. Continue it from Held bills.");
    if (data) {
      clearBillingDraft();
      setShowHeldOrders(true);
    }
  }

  function resumeHeldOrder(held: HeldOrder) {
    const draft = held.payload;
    setCart(draft.cart || []);
    setCustomer((current) => ({ ...current, ...(draft.customer || {}) }));
    setBillingStep(draft.billingStep || 1);
    setDiscountType(draft.discountType || "amount");
    setDiscountValue(draft.discountValue || 0);
    setPaidAmount(draft.paidAmount || 0);
    setPaymentMode(draft.paymentMode || "CASH");
    setCardCharge(draft.cardCharge || 0);
    setTransportCharge(draft.transportCharge || 0);
    setOtherCharge(draft.otherCharge || 0);
    setResumedHoldId(held.id);
    setShowHeldOrders(false);
    setDraftRestored(true);
    setActive("billing");
    notify(`${held.name} restored. Continue billing from where you stopped.`);
  }

  async function saveLead(event: FormEvent) {
    event.preventDefault();
    const data = await mutate({ action: "saveLead", lead: leadForm }, leadForm.id ? "Lead updated." : "Lead added to follow-up pipeline.");
    if (data) {
      setLeadForm({ source: "Walk-in", status: "New", followUpDate: isoDate() });
      setShowLeadForm(false);
    }
  }

  async function saveJobCard(event: FormEvent) {
    event.preventDefault();
    try {
      const uploadedImages = [...(jobCardForm.referenceImages || [])];
      for (const file of jobReferenceFiles.slice(0, 6)) {
        const uploaded = await uploadImage(file);
        uploadedImages.push(uploaded.url);
      }
      const next = { ...jobCardForm, referenceImages: uploadedImages };
      const data = await mutate({ action: "saveJobCard", jobCard: next }, jobCardForm.id ? "Job card updated." : "Custom furniture job card created.");
      if (data) {
        setJobCardForm({ stage: "New", referenceImages: [] });
        setJobReferenceFiles([]);
        setShowJobCardForm(false);
      }
    } catch (error) {
      notify(error instanceof Error ? error.message : "Reference image upload failed.");
    }
  }

  function startStockVerification() {
    setStockCounts({});
    setStockCheckMeta({ checkedBy: "", notes: "" });
    setShowStockVerification(true);
  }

  async function saveStockVerification(event: FormEvent) {
    event.preventDefault();
    const lines = state.products.filter((product) => stockCounts[product.id] !== "" && stockCounts[product.id] !== undefined)
      .map((product) => ({ productId: product.id, code: product.code, name: product.name, systemQty: product.stockQty, countedQty: Number(stockCounts[product.id]) }));
    if (!lines.length) return notify("Enter the physical count for at least one product.");
    const data = await mutate({ action: "saveStockVerification", lines, ...stockCheckMeta }, "Physical stock verified and differences updated.");
    if (data) setShowStockVerification(false);
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.closest("input,textarea,select,[contenteditable='true']"));
      if (event.key === "Escape") {
        setMobileSummaryOpen(false); setMobileMoreOpen(false); setShowShortcuts(false);
        return;
      }
      if (event.key === "F2") {
        event.preventDefault();
        if (currentUser?.role === "md") {
          notify("Managing Director login is view-only. Use a showroom login for billing.");
          return;
        }
        setActive("billing"); setBillingStep(2);
        window.setTimeout(() => searchInputRef.current?.focus(), 80);
        return;
      }
      if (typing && !(event.ctrlKey || event.metaKey)) return;
      if (event.altKey && ["1", "2", "3", "4", "5"].includes(event.key)) {
        event.preventDefault();
        if (event.key === "2" && currentUser?.role === "md") {
          notify("Managing Director login is view-only. Use a showroom login for billing.");
          return;
        }
        setActive((["dashboard", "billing", "products", "bills", "deliveries"] as Page[])[Number(event.key) - 1]);
      } else if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "h") {
        event.preventDefault();
        if (active === "billing") void holdCurrentBill();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && active === "billing" && billingStep === 3) {
        event.preventDefault();
        void confirmBill();
      } else if (!typing && event.key === "?") {
        event.preventDefault(); setShowShortcuts(true);
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

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

  async function saveFinanceControls(event: FormEvent) {
    event.preventDefault();
    await mutate({ action: "saveFinanceControls", controls: financeControlsForm }, "Finance controls saved.");
  }

  async function saveCommitment(event: FormEvent) {
    event.preventDefault();
    if (!commitmentForm.payee?.trim() || Number(commitmentForm.amount || 0) <= 0) return notify("Amount and payee are required.");
    const data = await mutate({ action: "saveCommitment", commitment: commitmentForm }, commitmentForm.id ? "Commitment updated." : "Commitment added.");
    if (data) { setCommitmentForm({ dueDate: isoDate(), amount: 0 }); setShowCommitmentForm(false); }
  }

  async function saveExpense(event: FormEvent) {
    event.preventDefault();
    if (!expenseForm.payee?.trim() || Number(expenseForm.amount || 0) <= 0) return notify("Amount and payee are required.");
    const data = await mutate({ action: "saveExpense", expense: expenseForm }, expenseForm.id ? "Expense updated." : "Expense added.");
    if (data) { setExpenseForm({ automatedDate: isoDate(), amount: 0 }); setShowExpenseForm(false); }
  }
  async function saveFinanceMember(event: FormEvent) {
    event.preventDefault();
    if (!financeMemberForm.name?.trim()) return notify("Member name is required.");
    const data = await mutate({ action: "saveFinanceMember", member: financeMemberForm }, financeMemberForm.id ? "Member item updated." : "Member item added.");
    if (data) setFinanceMemberForm({ memberType: "Negotiable", status: "Pending", dueDate: isoDate() });
  }

  async function deleteFinanceRow(action: "deleteCommitment" | "deleteExpense", id: string) {
    if (!window.confirm("Remove this finance record?")) return;
    await mutate({ action, id }, action === "deleteCommitment" ? "Commitment removed." : "Expense removed.");
  }
  async function deleteFinanceMember(id: string) {
    if (!window.confirm("Remove this member item?")) return;
    await mutate({ action: "deleteFinanceMember", id }, "Member item removed.");
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
      if (data) { setTaskForm({ category: "Follow-up", priority: "Normal", status: "Pending" }); setTaskCategoryLocked(false); setTaskTemplateKey(""); setShowTaskForm(false); }
    } finally {
      taskSaveLockRef.current = false;
    }
  }
  function askTaskIncomplete(task: ExpoTask) {
    setIncompleteTask(task);
    setIncompleteReason(task.completionReason || "");
  }
  async function saveTaskIncomplete(event: FormEvent) {
    event.preventDefault();
    if (!incompleteTask || !incompleteReason.trim()) return;
    const data = await mutate({ action: "saveTask", task: { ...incompleteTask, status: "Incomplete", completionReason: incompleteReason.trim() } }, "Task marked unfinished with a reason.");
    if (data) {
      setIncompleteTask(null);
      setIncompleteReason("");
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
  function shareWhatsApp(bill: Bill, kind: "invoice" | "delivery" = "invoice") {
    const text = kind === "delivery"
      ? `Hello ${bill.customerName},\n\nYour ${state.settings.businessName} order ${bill.billNo} is currently: ${bill.deliveryStatus}.\nExpected delivery: ${bill.deliveryDate || "To be confirmed"}.\nBalance: ${money(bill.balanceAmount)}.\n\nPlease contact us if the delivery date needs to be updated.`
      : `${state.settings.businessName}\nOrder: ${bill.billNo}\nCustomer: ${bill.customerName}\nProducts: ${bill.items.map((item) => `${item.name} (${item.qty})`).join(", ")}\nTotal: ${money(bill.grandTotal)}\nAdvance: ${money(bill.paidAmount)}\nBalance: ${money(bill.balanceAmount)}\nExpected delivery: ${bill.deliveryDate || "Not set"}\nStatus: ${bill.deliveryStatus}\nThank you!`;
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
  const deliveryCalendarDays = useMemo(() => {
    const [year, month] = deliveryMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const dayCount = new Date(year, month, 0).getDate();
    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: dayCount }, (_, index) => {
        const date = `${deliveryMonth}-${String(index + 1).padStart(2, "0")}`;
        return { date, day: index + 1, bills: activeBills.filter((bill) => bill.deliveryDate === date) };
      }),
    ];
  }, [deliveryMonth, activeBills]);
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

  async function addCustomProduct(event: FormEvent) {
    event.preventDefault();
    const name = customProductForm.name.trim();
    if (!name || customProductForm.price <= 0) return notify("Custom product name and price are required.");
    setBusy(true);
    let uploadedImage = { key: "", url: "" };
    try {
      if (customProductImageFile) uploadedImage = await uploadImage(customProductImageFile);
    } catch (error) {
      setBusy(false);
      return notify(error instanceof Error ? error.message : "Custom product image upload failed.");
    }
    const code = `CUSTOM-${Date.now().toString(36).toUpperCase()}`;
    const custom: CartItem = {
      id: `custom-${crypto.randomUUID()}`, code, hsnCode: "", name, category: "Custom Made", size: customProductForm.size.trim(), woodType: customProductForm.woodType.trim(), price: Math.max(0, customProductForm.price), stockQty: 0, mrp: customProductForm.price, notes: customProductForm.details.trim(), imageKey: uploadedImage.key, imageUrl: uploadedImage.url, costSegment: "", comfortTag: "", materialTag: "", lookTag: "", utilityTag: "", trendTag: "", skinType: "", qty: Math.max(1, Math.floor(customProductForm.qty || 1)), againstOrder: true, againstOrderExtra: 0, customMode: customProductForm.mode, customizeDetails: `${customProductForm.mode}: ${customProductForm.details.trim()}`,
    };
    setCart((items) => [...items, custom]);
    setCustomProductForm({ name: "", size: "", woodType: "", price: 0, qty: 1, details: "", mode: "Customization" });
    setCustomProductImageFile(null);
    setCustomProductImagePreview("");
    setShowCustomProduct(false);
    setBusy(false);
    notify(`${name} added as a custom-made product.`);
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
    ...dueTasks.map((task) => ({ id: `task-${task.id}`, group: (["High", "Urgent"].includes(task.priority) ? "urgent" : "today") as "urgent" | "today", icon: "✓", title: task.title, detail: [task.category, task.assignedTo, task.customerName, task.customerPhone, task.enquiredProducts, task.commitmentDate ? `Commitment ${task.commitmentDate}` : ""].filter(Boolean).join(" · ") || "No task details", action: "Done", kind: "task" as const, assignedTo: task.assignedTo, updatedAt: task.updatedAt, open: () => { setTaskForm(task); setTaskCategoryLocked(false); setShowTaskForm(true); }, perform: () => mutate({ action: "saveTask", task: { ...task, status: "Completed", completionReason: "" } }, "Task completed. Open Completed history to view or reopen it."), incomplete: () => askTaskIncomplete(task) })),
    ...followUpsDue.filter((item) => item.type !== "Complaint").map((item) => ({ id: `follow-${item.id}`, group: "today" as const, icon: "☎", title: `${item.type} · ${item.customerName}`, detail: `${item.customerPhone}${item.details ? ` · ${item.details}` : ""}`, action: "Open", open: () => { setOperationsTab("customers"); setActive("operations"); } })),
    ...activeBills.filter((bill) => bill.deliveryStatus !== "Delivered" && bill.deliveryDate === isoDate()).map((bill) => ({ id: `today-delivery-${bill.id}`, group: "today" as const, icon: "⇢", title: `Delivery today · ${bill.customerName}`, detail: `${bill.billNo} · ${bill.customerPhone}`, action: "View", open: () => setSelectedBill(bill) })),
    ...activeBills.filter((bill) => bill.balanceAmount > 0).map((bill) => ({ id: `balance-${bill.id}`, group: "today" as const, icon: "₹", title: `Collect balance · ${bill.customerName}`, detail: `${bill.billNo} · ${money(bill.balanceAmount)}`, action: "Collect", open: () => setSelectedBill(bill) })),
    ...state.products.filter((product) => product.stockQty <= 2).map((product) => ({ id: `stock-${product.id}`, group: "routine" as const, icon: "▦", title: `Low stock · ${product.name}`, detail: `${product.code} · ${product.stockQty > 0 ? `${product.stockQty} remaining` : "Out of stock"}`, action: "Stock", open: () => { setSearch(product.code); setStockFilter("all"); setActive("products"); } })),
  ];
  const dashboardActions = todayActionItems
    .filter((item) => !taskStaffFilter.length || (item.kind === "task" && taskStaffFilter.includes(item.assignedTo || "")))
    .sort((a, b) => taskSort === "assigned" ? (a.assignedTo || "Unassigned").localeCompare(b.assignedTo || "Unassigned") : taskSort === "due" ? a.detail.localeCompare(b.detail) : (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const completedToday = state.tasks.filter((task) => task.status === "Completed" && task.updatedAt?.slice(0, 10) === isoDate()).length;
  const completedTasks = state.tasks
    .filter((task) => task.status === "Completed")
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  const taskStaffOptions = Array.from(new Set([...state.settings.staffNames, ...state.tasks.map((task) => task.assignedTo)].map((name) => name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const visibleTasks = state.tasks
    .filter((task) => taskFilter === "all" || (taskFilter === "completed" ? task.status === "Completed" : task.status !== "Completed"))
    .filter((task) => !taskStaffFilter.length || taskStaffFilter.includes(task.assignedTo))
    .sort((a, b) => {
      if (taskSort === "assigned") return (a.assignedTo || "Unassigned").localeCompare(b.assignedTo || "Unassigned") || (b.updatedAt || "").localeCompare(a.updatedAt || "");
      if (taskSort === "due") return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") || (b.updatedAt || "").localeCompare(a.updatedAt || "");
      return (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || "");
    });
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
          <div className="login-tabs" role="tablist" aria-label="Login type">
            <button type="button" className={loginMode === "showroom" ? "active" : ""} onClick={() => { setLoginMode("showroom"); setLoginForm({ username: "", password: "" }); setLoginError(""); }}>Showroom login</button>
            <button type="button" className={loginMode === "md" ? "active" : ""} onClick={() => { setLoginMode("md"); setLoginForm({ username: "Managing Director", password: "" }); setLoginError(""); }}>MD login</button>
          </div>
          <form onSubmit={submitLogin}>
            {loginMode === "showroom" ? <label>Username<input value={loginForm.username} onChange={(event) => setLoginForm({ ...loginForm, username: event.target.value })} autoComplete="username" placeholder="Enter showroom username" required /></label> : <label>MD username<input value={loginForm.username} readOnly autoComplete="username" required /></label>}
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
        {currentUser && <div className="role-badge"><strong>{currentUser.label}</strong><small>{currentUser.role === "md" ? "MD · All showroom data" : `${currentUser.clientKey} client desk · Bills & reports`}</small></div>}
        <nav aria-label="Main navigation">
          <span className="nav-section-label">Billing workspace</span>
          <Nav
            active={active === "dashboard"}
            onClick={() => setActive("dashboard")}
            icon="⌂"
            label="Dashboard"
          />
          {currentUser?.role !== "md" && <Nav
            active={active === "billing"}
            onClick={startNewOrder}
            icon="₹"
            label="New order"
          />}
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
          <Nav active={active === "operations"} onClick={() => setActive("operations")} icon="✓" label="CRM, Leads & Jobs" />
          <Nav active={active === "suppliers"} onClick={() => setActive("suppliers")} icon="◇" label="Suppliers" />
          <Nav
            active={active === "reports"}
            onClick={() => setActive("reports")}
            icon="▤"
            label="Reports"
          />
          {currentUser?.role === "md" && <Nav
            active={active === "finance"}
            onClick={() => { setFinanceTab("overview"); setActive("finance"); }}
            icon="₹"
            label="MD Metrics"
          />}
          {currentUser?.role === "md" && active === "finance" && <div className="finance-side-nav" aria-label="MD Metrics sub-tabs">
            <span>MD Metrics views</span>
            {financeTabOptions.map(([key, label, icon]) => <button key={key} className={financeTab === key ? "active" : ""} onClick={() => setFinanceTab(key)}><span>{icon}</span><b>{label}</b></button>)}
          </div>}
          <Nav
            active={active === "settings"}
            onClick={() => setActive("settings")}
            icon="⚙"
            label="Settings"
          />
        </nav>
        <label className="sidebar-theme">Theme<select value={theme} onChange={(event) => changeTheme(event.target.value as ThemeName)}>{themes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className="sidebar-theme sidebar-density">Display<select value={density} onChange={(event) => changeDensity(event.target.value as DensityName)}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>
        <button className="sidebar-help" onClick={() => setShowShortcuts(true)}>⌨ Keyboard shortcuts</button>
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
          {currentUser && <span className="mobile-role-badge">{currentUser.role === "md" ? "MD" : currentUser.clientKey}</span>}
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
          {currentUser?.role !== "md" && <Nav
            active={active === "billing"}
            onClick={startNewOrder}
            icon="₹"
            label="Order"
          />}
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
          <Nav active={["deliveries", "operations", "suppliers", "reports", "settings", "finance"].includes(active)} onClick={() => setMobileMoreOpen(true)} icon="•••" label="More" />
        </div>
        {mobileMoreOpen && <div className="mobile-more-backdrop">
          <button className="mobile-more-dismiss" aria-label="Close more tools" onClick={() => setMobileMoreOpen(false)} />
          <div className="mobile-more-sheet">
            <div className="mobile-more-head"><div><span className="eyebrow">More tools</span><h2>Manage showroom</h2></div><button onClick={() => setMobileMoreOpen(false)}>×</button></div>
            {([
              ["deliveries", "⇢", "Deliveries", "Expected dates and order status"],
              ["operations", "✓", "CRM, Leads & Jobs", "Tasks, walk-ins, follow-ups and custom job cards"],
              ["suppliers", "◇", "Suppliers", "Purchases and supplier assignments"],
              ["reports", "▤", "Reports", "Sales, staff work and downloadable reports"],
              ["settings", "⚙", "Settings", "Business, GST and staff setup"],
            ] as const).map(([page, icon, label, note]) => <button key={page} onClick={() => { setActive(page); setMobileMoreOpen(false); }}><span>{icon}</span><div><strong>{label}</strong><small>{note}</small></div><b>›</b></button>)}
            {currentUser?.role === "md" && <button onClick={() => { setFinanceTab("overview"); setActive("finance"); setMobileMoreOpen(false); }}><span>₹</span><div><strong>MD Metrics</strong><small>Commitments, funds and bill balances</small></div><b>›</b></button>}
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
                <button className="secondary-action" onClick={() => { setTaskCategoryLocked(false); setTaskTemplateKey(""); setTaskForm({ category: "General", priority: "Normal", status: "Pending", dueDate: isoDate() }); setShowTaskForm(true); }}>＋ Add task</button>
                {currentUser?.role !== "md" && <button className="primary-small" onClick={startNewOrder}>＋ New order</button>}
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
                  setTaskCategoryLocked(true);
                  setTaskTemplateKey(template.key);
                  setTaskForm({ category: template.category, title: template.title, details: template.details, priority: "Normal", status: "Pending", dueDate: isoDate() });
                  setShowTaskForm(true);
                }}><span>{template.icon}</span><strong>{template.title}</strong><small>{template.category}</small></button>)}
              </div>
            </section>
            <article className="today-planner">
              <div className="dashboard-task-controls"><strong>Task view</strong><label>Sort<select value={taskSort} onChange={(event) => setTaskSort(event.target.value as typeof taskSort)}><option value="newest">New to old</option><option value="assigned">Name A–Z</option><option value="due">Due / commitment</option></select></label><label>Staff<select multiple size={Math.min(3, Math.max(2, taskStaffOptions.length))} value={taskStaffFilter} onChange={(event) => setTaskStaffFilter(Array.from(event.target.selectedOptions, (option) => option.value))}>{taskStaffOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>{taskStaffFilter.length > 0 && <button className="text-button" onClick={() => setTaskStaffFilter([])}>All staff</button>}</div>
              {([
                ["urgent", "Urgent", "No urgent issues. Everything is under control."],
                ["today", "Today", "No scheduled work for today."],
                ["routine", "Stock check", "Stock levels look healthy."],
              ] as const).map(([group, label, empty]) => {
                const rows = dashboardActions.filter((item) => item.group === group);
                return <section className={`today-group ${group}`} key={group}>
                  <header><div><span className="today-dot" /><h2>{label}</h2></div><strong>{rows.length}</strong></header>
                  <div className="today-list">
                    {rows.slice(0, group === "routine" ? 5 : 8).map((item) => <div className="today-item" key={item.id}>
                      <span className="today-icon">{item.icon}</span>
                      <button className="today-copy" onClick={item.open}><strong>{item.title}</strong><small>{item.detail}</small></button>
                      {item.kind === "task" ? <div className="today-task-actions"><button className="today-action task-done" aria-label={`Mark ${item.title} complete`} onClick={() => (item.perform || item.open)()}>✓</button><button className="today-action task-unfinished" aria-label={`Mark ${item.title} unfinished`} onClick={() => item.incomplete?.()}>×</button></div> : <button className="today-action" onClick={() => (item.perform || item.open)()}>{item.action} →</button>}
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
                <span>{billingStep > step ? "✓" : step}</span><div><strong>{step === 1 ? "Customer" : step === 2 ? "Products" : "Payment"}</strong><small>{step === 1 ? "Name & address" : step === 2 ? "Choose items" : "Review & save"}</small></div>
              </button>)}
              <div className="billing-progress-summary">
                <p><b className="draft-bill-number">{draftBillNo}</b><span className="draft-date">{new Date(draftOrderDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span><br />{cart.reduce((sum, item) => sum + item.qty, 0)} items · {money(grandTotal)} <em>{online ? "Draft auto-saved" : "Offline draft safe"}</em></p>
                <div><button onClick={() => setShowHeldOrders(true)}>Held bills <b>{state.heldOrders.length}</b></button><button onClick={holdCurrentBill}>Hold bill</button><button onClick={() => setShowShortcuts(true)} aria-label="Keyboard shortcuts">⌨</button></div>
              </div>
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
                    ref={searchInputRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search product or code…"
                  />
                  <kbd>F2</kbd>
                </label>
                <div className="billing-quick-actions"><button className="scan-button" onClick={startScanner}>▣ Scan QR</button><button className="custom-item-button" onClick={() => setShowCustomProduct(true)}>＋ Custom made</button></div>
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
                {draftRestored && <div className="restore-notice"><span>↺</span><div><strong>Unfinished bill restored</strong><small>Your products and customer details were recovered safely.</small></div><button onClick={() => setDraftRestored(false)}>Got it</button></div>}
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
              <div className="payment-product-strip"><div><span className="eyebrow">Order preview</span><strong>Products on this bill</strong></div><div className="payment-product-images">{cart.map((item, index) => <div key={`${item.id}-${index}`} title={`${item.name} · ${item.size || ""}`}><ProductThumb product={item} /><small>{item.name}</small></div>)}</div></div>
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
              <label className="expected-delivery-final">Expected delivery date<input type="date" value={customer.deliveryDate} onChange={(event) => setCustomer({ ...customer, deliveryDate: event.target.value })} required /></label>
              {saveError && <div className="save-error" role="alert"><span>!</span><div><strong>Order not confirmed yet</strong><small>{saveError}</small></div><button onClick={confirmBill} disabled={busy}>Retry save</button></div>}
              <div className="wizard-actions"><button className="secondary-action" onClick={() => setBillingStep(2)}>← Back</button><button
                  className="primary-action"
                  disabled={!cart.length || busy || !online}
                  onClick={confirmBill}
                >
                  {busy ? "Saving securely…" : saveError ? "Retry save" : online ? "Save order slip" : "Connect to save"}
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
          <section className="page-section inventory-page">
            <div className="section-heading with-actions">
              <div>
                <span className="eyebrow inventory-eyebrow"><i>▦</i> Inventory & images</span>
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
                  <span className="button-icon">↓</span> Template
                </button>
                <button
                  className="secondary-action"
                  onClick={() => fileRef.current?.click()}
                >
                  <span className="button-icon">↑</span> Import Excel
                </button>
                <button
                  className="secondary-action"
                  onClick={() => bulkImagesRef.current?.click()}
                >
                  <span className="button-icon">▧</span> Bulk images
                </button>
                <button className="secondary-action" onClick={startStockVerification}><span className="button-icon">✓</span> Verify physical stock</button>
                <button
                  className="primary-small"
                  onClick={() => {
                    setProductForm(EMPTY_PRODUCT);
                    setShowProductForm(true);
                  }}
                >
                  <span className="button-icon">＋</span> Add product
                </button>
              </div>
            </div>
            <div className="inventory-howto"><span className="inventory-howto-icon">i</span><div><strong>How to enter inventory</strong><span><b>Add product</b> creates the product and generates its code after saving. Use <b>Stock in</b> on any row to add pieces with today’s date or choose another entry date.</span></div></div>
            <div className="metric-grid">
              <Metric
                label="Product models"
                value={String(state.products.length)}
                note="Active catalogue"
                icon="▤"
              />
              <Metric
                label="Ready stock"
                value={String(totalStock)}
                note="Pieces available"
                icon="✓"
              />
              <Metric
                label="Inventory value"
                value={money(inventoryValue)}
                note="At showroom price"
                icon="₹"
              />
              <Metric
                label="Low / out stock"
                value={String(
                  state.products.filter((product) => product.stockQty <= 2)
                    .length,
                )}
                note="Needs attention"
                alert
                icon="!"
              />
            </div>
            <div className="inventory-toolbar">
              <label className="search-box compact-search">
                <span className="search-icon">⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find in inventory…"
                />
              </label>
              <div className="stock-filters" aria-label="Stock filters">
                {[["all", "All"], ["available", "Available"], ["low", "Low"], ["out", "Out"]].map(([key, label]) => <button key={key} className={stockFilter === key ? "active" : ""} onClick={() => setStockFilter(key)}>{label}</button>)}
              </div>
              <button className="text-button refresh-stock-button" onClick={() => load()}>
                <span className="button-icon">↻</span> Refresh stock
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
                        {[product.size, product.woodType, product.skinType]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                        {(product.costSegment || product.comfortTag || product.materialTag || product.lookTag || product.utilityTag || product.trendTag) && <div className="product-tag-list">{[product.costSegment, product.comfortTag, product.materialTag, product.lookTag, product.utilityTag, product.trendTag].flatMap(splitProductTags).map((tag) => <span className="soft-tag" key={tag}>{tag}</span>)}</div>}
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
                          <button className="icon-action" onClick={() => setQrProduct(product)} aria-label={`Show QR for ${product.name}`}>
                            <span>⌗</span> QR
                          </button>
                          <button className="icon-action" onClick={() => editProduct(product)}>
                            <span>✎</span> Edit
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
                            <span>⌫</span> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {state.stockEntries.length > 0 && <section className="stock-history-card"><div className="card-heading"><div><span className="eyebrow">Stock history</span><h2>Latest stock entries</h2></div><span className="soft-tag">Newest first</span></div><div className="stock-history-list">{state.stockEntries.slice(0, 8).map((entry) => { const product = state.products.find((item) => item.id === entry.productId); return <div key={entry.id}><span className="stock-history-icon">＋</span><div><strong>{product?.name || entry.productId}</strong><small>{product?.code || ""} · {entry.entryDate ? displayEntryDate(entry.entryDate) : "Date not set"}</small></div><b>+{entry.quantity}</b></div>; })}</div></section>}
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
            {savedBillForJobCard && <div className="post-save-job-card-box"><div><span className="eyebrow">Saved successfully</span><strong>{savedBillForJobCard.billNo} · {savedBillForJobCard.customerName}</strong><small>Custom production details can be added now. Nothing is created until you choose the next step.</small></div><button className="primary-small" onClick={() => { setJobCardForm({ stage: "New", referenceImages: [], billId: savedBillForJobCard.id, customerName: savedBillForJobCard.customerName, phone: savedBillForJobCard.customerPhone }); setShowJobCardForm(true); setSavedBillForJobCard(null); }}>＋ Add to job card</button><button className="text-button" onClick={() => setSavedBillForJobCard(null)}>Dismiss</button></div>}
            <div className="inventory-toolbar">
              <label className="search-box compact-search">
                <span>⌕</span>
                <input
                  value={billSearch}
                  onChange={(event) => setBillSearch(event.target.value)}
                  placeholder="Order no, customer, phone or staff…"
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
                      <small>{bill.paymentMode}</small>
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
            <section className="delivery-calendar">
              <div className="card-heading"><div><span className="eyebrow">Calendar planner</span><h2>Delivery month at a glance</h2><p>Click any scheduled customer to open the order.</p></div><label>Month<input type="month" value={deliveryMonth} onChange={(event) => setDeliveryMonth(event.target.value || isoDate().slice(0, 7))} /></label></div>
              <div className="calendar-weekdays">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
              <div className="calendar-grid">{deliveryCalendarDays.map((entry, index) => entry ? <div className={`calendar-day ${entry.date === isoDate() ? "today" : ""}`} key={entry.date}><b>{entry.day}</b><div>{entry.bills.slice(0, 3).map((bill) => <button key={bill.id} onClick={() => setSelectedBill(bill)}><span>{bill.customerName}</span><small>{bill.billNo}</small></button>)}{entry.bills.length > 3 && <small>+{entry.bills.length - 3} more</small>}</div></div> : <div className="calendar-day empty" key={`empty-${index}`} />)}</div>
            </section>
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
                <button className="secondary-action" onClick={() => { setTaskCategoryLocked(false); setTaskTemplateKey(""); setTaskForm({ category: "Follow-up", priority: "Normal", status: "Pending", dueDate: isoDate() }); setShowTaskForm(true); }}>＋ Add task</button>
                <button className="primary-small" onClick={() => { setInteractionForm({ type: "Follow-up", status: "Open", nextFollowUp: isoDate() }); setShowInteractionForm(true); }}>＋ Customer activity</button>
                <button className="secondary-action" onClick={() => { setLeadForm({ source: "Walk-in", status: "New", followUpDate: isoDate() }); setShowLeadForm(true); }}>＋ Walk-in lead</button>
                <button className="secondary-action" onClick={() => { setJobCardForm({ stage: "New", referenceImages: [] }); setJobReferenceFiles([]); setShowJobCardForm(true); }}>＋ Job card</button>
              </div>
            </div>
            <div className="metric-grid">
              <Metric label="Open tasks" value={String(openTasks.length)} note={`${dueTasks.length} due now`} alert={dueTasks.length > 0} />
              <Metric label="Follow-ups due" value={String(followUpsDue.length)} note="Today / overdue" alert={followUpsDue.length > 0} />
              <Metric label="Open complaints" value={String(openComplaints.length)} note="Needs closure" alert={openComplaints.length > 0} />
              <Metric label="Customer records" value={String(new Set(activeBills.map((bill) => normalizePhone(bill.customerPhone)).filter(Boolean)).size)} note="From billing history" />
              <Metric label="Active leads" value={String(state.leads.filter((lead) => !["Won", "Lost"].includes(lead.status)).length)} note={`${state.leads.filter((lead) => lead.followUpDate && lead.followUpDate <= isoDate() && !["Won", "Lost"].includes(lead.status)).length} follow-ups due`} />
              <Metric label="Custom jobs" value={String(state.jobCards.filter((job) => job.stage !== "Delivered").length)} note={`${state.jobCards.filter((job) => job.expectedDate && job.expectedDate < isoDate() && job.stage !== "Delivered").length} delayed`} />
            </div>
            <div className="filter-row operation-tabs">
              <button className={operationsTab === "tasks" ? "active" : ""} onClick={() => setOperationsTab("tasks")}>Tasks & schedules</button>
              <button className={operationsTab === "customers" ? "active" : ""} onClick={() => setOperationsTab("customers")}>Customer follow-up & service</button>
              <button className={operationsTab === "leads" ? "active" : ""} onClick={() => setOperationsTab("leads")}>Marketing & leads</button>
              <button className={operationsTab === "jobs" ? "active" : ""} onClick={() => setOperationsTab("jobs")}>Custom job cards</button>
            </div>
            {operationsTab === "tasks" ? (
              <><div className="task-toolbar"><div className="task-filter" role="group" aria-label="Task history filter">
                <button className={taskFilter === "active" ? "active" : ""} onClick={() => setTaskFilter("active")}>Active <span>{openTasks.length}</span></button>
                <button className={taskFilter === "completed" ? "active" : ""} onClick={() => setTaskFilter("completed")}>Completed <span>{completedTasks.length}</span></button>
                <button className={taskFilter === "all" ? "active" : ""} onClick={() => setTaskFilter("all")}>All <span>{state.tasks.length}</span></button>
              </div><div className="task-sort-controls"><label>Sort tasks<select value={taskSort} onChange={(event) => setTaskSort(event.target.value as typeof taskSort)}><option value="newest">New to old</option><option value="assigned">Assigned staff A–Z</option><option value="due">Due date</option></select></label><label>Staff filter<select multiple size={Math.min(4, Math.max(2, taskStaffOptions.length))} value={taskStaffFilter} onChange={(event) => setTaskStaffFilter(Array.from(event.target.selectedOptions, (option) => option.value))}>{taskStaffOptions.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>{taskStaffFilter.length > 0 && <button className="text-button" onClick={() => setTaskStaffFilter([])}>Clear staff</button>}</div></div><div className="table-wrap"><table><thead><tr><th>Task</th><th>Customer / enquiry</th><th>Category</th><th>Assigned</th><th>Commitment</th><th>Priority</th><th>Status</th><th /></tr></thead><tbody>
                {visibleTasks.map((task) => <tr key={task.id} className={task.status !== "Completed" && task.dueDate && task.dueDate < isoDate() ? "overdue-row" : ""}>
                  <td><strong>{task.title}</strong><small className="block-muted">{task.details || "No details"}{task.notes ? ` · Notes: ${task.notes}` : ""}{task.completionReason ? ` · Reason: ${task.completionReason}` : ""}</small></td><td><strong>{task.customerName || "—"}</strong><small className="block-muted">{[task.customerPhone, task.enquiredProducts, task.attendedBy ? `Attended by ${task.attendedBy}` : ""].filter(Boolean).join(" · ")}</small></td><td>{task.category}</td><td><span className="assigned-chip">{task.assignedTo || "Unassigned"}</span></td><td>{task.commitmentDate || task.dueDate || "Not set"}</td><td><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span></td><td>{task.status}</td>
                  <td><div className="row-actions task-row-actions"><button className="task-icon-button task-done" aria-label={task.status === "Completed" ? "Reopen task" : "Mark task complete"} onClick={() => mutate({ action: "saveTask", task: { ...task, status: task.status === "Completed" ? "Pending" : "Completed", completionReason: task.status === "Completed" ? task.completionReason : "" } }, task.status === "Completed" ? "Task reopened." : "Task completed.")}>{task.status === "Completed" ? "↻" : "✓"}</button>{task.status !== "Completed" && <button className="task-icon-button task-unfinished" aria-label="Mark task unfinished" onClick={() => askTaskIncomplete(task)}>×</button>}<button onClick={() => { setTaskCategoryLocked(false); setTaskTemplateKey(""); setTaskForm(task); setShowTaskForm(true); }}>Edit</button><button className="danger-link" onClick={() => mutate({ action: "deleteTask", id: task.id }, "Task deleted.")}>Delete</button></div></td>
                </tr>)}
                {!visibleTasks.length && <tr><td colSpan={8} className="empty-table">{taskFilter === "completed" ? "No completed tasks yet. Finished work will remain here." : taskFilter === "active" ? "No active tasks. Add a showroom activity or reopen one from Completed." : "No tasks yet. Add your first showroom activity."}</td></tr>}
              </tbody></table></div></>
            ) : operationsTab === "customers" ? (
              <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Type</th><th>Details</th><th>Assigned</th><th>Next follow-up</th><th>Status</th><th /></tr></thead><tbody>
                {state.interactions.map((item) => { const priorBills = activeBills.filter((bill) => normalizePhone(bill.customerPhone) === normalizePhone(item.customerPhone)); return <tr key={item.id} className={item.status !== "Closed" && item.nextFollowUp && item.nextFollowUp < isoDate() ? "overdue-row" : ""}>
                  <td><strong>{item.customerName}</strong><small className="block-muted">{item.customerPhone} · {priorBills.length ? `Existing · ${priorBills.length} bill${priorBills.length > 1 ? "s" : ""}` : "New customer"}</small></td><td><span className={`interaction-type ${item.type.toLowerCase().replace(/\s+/g, "-")}`}>{item.type}</span></td><td>{item.details || "—"}</td><td>{item.assignedTo || "—"}</td><td>{item.nextFollowUp || "Not set"}</td><td>{item.status}</td>
                  <td><div className="row-actions"><button onClick={() => mutate({ action: "saveInteraction", interaction: { ...item, status: item.status === "Closed" ? "Open" : "Closed" } }, item.status === "Closed" ? "Activity reopened." : "Activity closed.")}>{item.status === "Closed" ? "Reopen" : "Close"}</button><button onClick={() => { setInteractionForm(item); setShowInteractionForm(true); }}>Edit</button><button className="danger-link" onClick={() => mutate({ action: "deleteInteraction", id: item.id }, "Customer activity deleted.")}>Delete</button></div></td>
                </tr>})}
                {!state.interactions.length && <tr><td colSpan={7} className="empty-table">No customer follow-ups, enquiries or complaints yet.</td></tr>}
              </tbody></table></div>
            ) : operationsTab === "leads" ? (
              <div className="table-wrap"><table><thead><tr><th>Lead</th><th>Source</th><th>Interested in</th><th>Assigned</th><th>Follow-up</th><th>Status</th><th /></tr></thead><tbody>
                {state.leads.map((lead) => <tr key={lead.id} className={lead.followUpDate && lead.followUpDate < isoDate() && !["Won", "Lost"].includes(lead.status) ? "overdue-row" : ""}>
                  <td><strong>{lead.customerName}</strong><small className="block-muted">{lead.phone}</small></td><td>{lead.source}</td><td>{lead.interest || "—"}</td><td>{lead.assignedTo || "—"}</td><td>{lead.followUpDate || "Not set"}</td><td><span className={`lead-status ${lead.status.toLowerCase()}`}>{lead.status}</span></td>
                  <td><div className="row-actions"><button onClick={() => { setLeadForm(lead); setShowLeadForm(true); }}>Edit</button><button className="danger-link" onClick={() => mutate({ action: "deleteLead", id: lead.id }, "Lead deleted.")}>Delete</button></div></td>
                </tr>)}
                {!state.leads.length && <tr><td colSpan={7} className="empty-table">No leads yet. Add a walk-in, Instagram, Google or referral enquiry.</td></tr>}
              </tbody></table></div>
            ) : (
              <div className="job-card-grid">
                {state.jobCards.map((job) => <article className="job-card" key={job.id}>
                  <header><div><span>{job.jobNo}</span><h3>{job.customerName}</h3><small>{job.phone || "No phone"}</small></div><em>{job.stage}</em></header>
                  <div className="job-specs"><span><small>Measurements</small><b>{job.measurements || "Not added"}</b></span><span><small>Material</small><b>{[job.woodMaterial, job.fabric].filter(Boolean).join(" · ") || "Not added"}</b></span><span><small>Expected</small><b>{job.expectedDate || "Not set"}</b></span><span><small>Estimated cost</small><b>{money(job.estimatedCost)}</b></span></div>
                  {job.referenceImages.length > 0 && <div className="job-images">{job.referenceImages.slice(0, 4).map((image, index) => <img src={image} alt={`${job.jobNo} reference ${index + 1}`} key={image} />)}</div>}
                  <p>{job.notes || "No additional production notes."}</p>
                  <footer><small>Assigned: {job.assignedTo || "Not assigned"}</small><div className="row-actions"><button onClick={() => { setJobCardForm(job); setJobReferenceFiles([]); setShowJobCardForm(true); }}>Update</button><button className="danger-link" onClick={() => mutate({ action: "deleteJobCard", id: job.id }, "Job card deleted.")}>Delete</button></div></footer>
                </article>)}
                {!state.jobCards.length && <div className="today-empty">No custom furniture job cards yet. Add measurements, materials, reference photos and production stages here.</div>}
              </div>
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

        {active === "finance" && currentUser?.role === "md" && (
          <section className="page-section finance-page">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Managing Director · MD Metrics</span>
                <h1>Financial monitoring, clearly organised.</h1>
                <p>Commitments, available funds, expected collections, deposits and pending member work in one MD-only view.</p>
              </div>
              <div className="heading-actions"><button className="secondary-action" onClick={() => setShowCommitmentForm(true)}>＋ Commitment</button><button className="primary-small" onClick={() => setShowExpenseForm(true)}>＋ Expense</button></div>
            </div>
            <div className="metric-grid finance-metrics">
              <Metric label="Commitments" value={money(financeCommitmentTotal)} note={`${state.financeCommitments.length} records`} />
              <Metric label="Expenses" value={money(financeExpenseTotal)} note={`${state.financeExpenses.length} records`} />
              <Metric label="Fund available" value={money(financeAvailableTotal)} note="Account + cash in hand" />
              <Metric label="Collection potential" value={money(financePotentialTotal)} note="Delivered + pending" />
              <Metric label="Excess / deficit" value={money(Math.abs(financeExcessDeficit))} note={financeExcessDeficit < 0 ? "Deficit against commitments" : "Excess after commitments"} />
            </div>
            <div className="finance-mobile-tabs" role="tablist" aria-label="Finance views">
              {financeTabOptions.map(([key, label, icon]) => <button key={key} className={financeTab === key ? "active" : ""} onClick={() => setFinanceTab(key)}><span>{icon}</span>{label}</button>)}
            </div>
            {financeTab === "overview" && <div className="finance-tab-panel">
              <div className="section-heading compact-heading"><div><span className="eyebrow">Control totals</span><h2>Keep the daily fund picture current.</h2><p>These four values mirror the MD metrics workbook and are editable by the MD.</p></div></div>
              <form className="settings-card finance-control-card" onSubmit={saveFinanceControls}>
                <div className="form-grid">
                  <label>Account fund<input type="number" min="0" step="0.01" value={financeControlsForm.accountFund} onChange={(event) => setFinanceControlsForm({ ...financeControlsForm, accountFund: Number(event.target.value) || 0 })} /></label>
                  <label>Cash in hand<input type="number" min="0" step="0.01" value={financeControlsForm.cashInHand} onChange={(event) => setFinanceControlsForm({ ...financeControlsForm, cashInHand: Number(event.target.value) || 0 })} /></label>
                  <label>Cash in bank<input type="number" min="0" step="0.01" value={financeControlsForm.cashInBank} onChange={(event) => setFinanceControlsForm({ ...financeControlsForm, cashInBank: Number(event.target.value) || 0 })} /></label>
                  <label>Delivered collection<input type="number" min="0" step="0.01" value={financeControlsForm.deliveredCollection} onChange={(event) => setFinanceControlsForm({ ...financeControlsForm, deliveredCollection: Number(event.target.value) || 0 })} /></label>
                  <label>Yet to be delivered<input type="number" min="0" step="0.01" value={financeControlsForm.pendingCollection} onChange={(event) => setFinanceControlsForm({ ...financeControlsForm, pendingCollection: Number(event.target.value) || 0 })} /></label>
                  <label>Deposit amount<input type="number" min="0" step="0.01" value={financeControlsForm.depositAmount} onChange={(event) => setFinanceControlsForm({ ...financeControlsForm, depositAmount: Number(event.target.value) || 0 })} /></label>
                  <label>Excess amount<input type="number" min="0" step="0.01" value={financeControlsForm.excessAmount} onChange={(event) => setFinanceControlsForm({ ...financeControlsForm, excessAmount: Number(event.target.value) || 0 })} /></label>
                </div>
                <div className="form-actions"><button className="primary-small" type="submit">Save finance controls</button></div>
              </form>
              <div className="finance-note"><strong>Automatic bill tracker</strong><span>Bill balances below are calculated from saved orders. New bills, payments, delivery status and job cards stay linked automatically.</span></div>
              <div className="finance-expand-grid">
                <details open><summary><span>Financial commitments</span><b>{money(financeCommitmentTotal)}</b></summary><p>{state.financeCommitments.length} commitment(s) recorded. Open Commitment log to add weekly entries.</p></details>
                <details><summary><span>Fund available</span><b>{money(financeAvailableTotal)}</b></summary><p>Cash in hand: {money(financeControlsForm.cashInHand)} · Cash in bank: {money(financeControlsForm.cashInBank)} · Account fund: {money(financeControlsForm.accountFund)}</p></details>
                <details><summary><span>Fund potentials</span><b>{money(financePotentialTotal)}</b></summary><p>A to B collected: {money(financeControlsForm.deliveredCollection)} · A to B deliver: {money(financeControlsForm.pendingCollection)}. Bill Balance Details shows the source bills.</p></details>
                <details><summary><span>Deposit & excess</span><b>{money(financeControlsForm.depositAmount + financeControlsForm.excessAmount)}</b></summary><p>Deposit: {money(financeControlsForm.depositAmount)} · Excess: {money(financeControlsForm.excessAmount)}.</p></details>
              </div>
            </div>}
            {financeTab === "commitments" && <div className="finance-tab-panel"><div className="section-heading compact-heading"><div><span className="eyebrow">Commitment log</span><h2>Upcoming amounts to pay.</h2></div><button className="primary-small" onClick={() => setShowCommitmentForm(true)}>＋ Add commitment</button></div><div className="table-wrap"><table><thead><tr><th>Amount</th><th>To</th><th>Due</th><th>Account head</th><th>Raised by</th><th>Approved by</th><th></th></tr></thead><tbody>{state.financeCommitments.map((row) => <tr key={row.id}><td>{money(row.amount)}</td><td>{row.payee}</td><td>{row.dueDate || "—"}</td><td>{row.accountHead || "—"}</td><td>{row.raisedBy || "—"}</td><td>{row.approvedBy || "—"}</td><td><button className="table-action danger" onClick={() => deleteFinanceRow("deleteCommitment", row.id)}>Remove</button></td></tr>)}{!state.financeCommitments.length && <tr><td colSpan={7}><div className="today-empty">No commitments entered yet.</div></td></tr>}</tbody></table></div></div>}
            {financeTab === "expenses" && <div className="finance-tab-panel"><div className="section-heading compact-heading"><div><span className="eyebrow">Expenses log</span><h2>Recorded showroom expenses.</h2></div><button className="primary-small" onClick={() => setShowExpenseForm(true)}>＋ Add expense</button></div><div className="table-wrap"><table><thead><tr><th>Amount</th><th>To</th><th>Automated date</th><th>Account head</th><th>Raised by</th><th>Approved by</th><th></th></tr></thead><tbody>{state.financeExpenses.map((row) => <tr key={row.id}><td>{money(row.amount)}</td><td>{row.payee}</td><td>{row.automatedDate || "—"}</td><td>{row.accountHead || "—"}</td><td>{row.raisedBy || "—"}</td><td>{row.approvedBy || "—"}</td><td><button className="table-action danger" onClick={() => deleteFinanceRow("deleteExpense", row.id)}>Remove</button></td></tr>)}{!state.financeExpenses.length && <tr><td colSpan={7}><div className="today-empty">No expenses entered yet.</div></td></tr>}</tbody></table></div></div>}
            {financeTab === "bills" && <div className="finance-tab-panel"><div className="section-heading compact-heading"><div><span className="eyebrow">Bill balances & delivery</span><h2>Collection potential by order.</h2><p>Cancelled bills are excluded from this tracker.</p></div></div><div className="table-wrap"><table><thead><tr><th>Bill no.</th><th>Job card</th><th>Products</th><th>Qty</th><th>Value</th><th>Balance</th><th>Potential</th><th>Delivery</th><th>Contact</th></tr></thead><tbody>{activeBills.map((bill) => { const value = bill.productTotal + bill.againstOrderExtra; const jobs = state.jobCards.filter((job) => job.billId === bill.id).map((job) => job.jobNo).join(", "); return <tr key={bill.id}><td><strong>{bill.billNo}</strong></td><td>{jobs || "—"}</td><td>{bill.items.map((item) => item.name).join(", ") || "—"}</td><td>{bill.items.reduce((sum, item) => sum + item.qty, 0)}</td><td>{money(value)}</td><td>{money(bill.balanceAmount)}</td><td>{value > 0 ? `${Math.round((bill.balanceAmount / value) * 100)}%` : "0%"}</td><td>{bill.deliveryDate || "Not set"}</td><td>{bill.customerPhone || "—"}</td></tr>; })}{!activeBills.length && <tr><td colSpan={9}><div className="today-empty">Saved bills will appear here automatically.</div></td></tr>}</tbody></table></div></div>}
            {financeTab === "members" && <div className="finance-tab-panel"><div className="section-heading compact-heading"><div><span className="eyebrow">Member login checklist</span><h2>Negotiable, non-negotiable & overview.</h2><p>Tick completed financial items; pending items remain visible in Overview.</p></div></div><div className="finance-tabs member-tabs">{(["Negotiable", "Non-Negotiable", "Overview"] as const).map((tab) => <button key={tab} className={financeMemberTab === tab ? "active" : ""} onClick={() => setFinanceMemberTab(tab)}>{tab}</button>)}</div><form className="settings-card finance-control-card" onSubmit={saveFinanceMember}><div className="form-grid"><label>Member / item name<input value={financeMemberForm.name || ""} onChange={(event) => setFinanceMemberForm({ ...financeMemberForm, name: event.target.value })} required /></label><label>Type<select value={financeMemberForm.memberType || "Negotiable"} onChange={(event) => setFinanceMemberForm({ ...financeMemberForm, memberType: event.target.value as FinanceMember["memberType"] })}><option>Negotiable</option><option>Non-Negotiable</option></select></label><label>Amount<input type="number" min="0" step="0.01" value={financeMemberForm.amount || ""} onChange={(event) => setFinanceMemberForm({ ...financeMemberForm, amount: Number(event.target.value) || 0 })} /></label><label>Due date<input type="date" value={financeMemberForm.dueDate || isoDate()} onChange={(event) => setFinanceMemberForm({ ...financeMemberForm, dueDate: event.target.value })} /></label><label>Status<select value={financeMemberForm.status || "Pending"} onChange={(event) => setFinanceMemberForm({ ...financeMemberForm, status: event.target.value })}><option>Pending</option><option>Completed</option></select></label><label className="wide">Notes<textarea rows={2} value={financeMemberForm.notes || ""} onChange={(event) => setFinanceMemberForm({ ...financeMemberForm, notes: event.target.value })} /></label></div><div className="form-actions"><button className="primary-small">Save member item</button></div></form><div className="member-status-list">{state.financeMembers.filter((item) => financeMemberTab === "Overview" || item.memberType === financeMemberTab).map((item) => <article key={item.id} className={item.status === "Completed" ? "completed" : "pending"}><div><strong>{item.name}</strong><small>{item.memberType} · {item.dueDate || "No due date"} · {money(item.amount)}</small>{item.notes && <small>{item.notes}</small>}</div><button type="button" className={`member-complete-toggle ${item.status === "Completed" ? "completed" : ""}`} onClick={() => mutate({ action: "saveFinanceMember", member: { ...item, status: item.status === "Completed" ? "Pending" : "Completed" } }, item.status === "Completed" ? "Member item reopened." : "Member item completed.")}>{item.status === "Completed" ? "✓ Completed" : "○ Mark complete"}</button><button className="danger-link" onClick={() => deleteFinanceMember(item.id)}>Remove</button></article>)}{!state.financeMembers.filter((item) => financeMemberTab === "Overview" || item.memberType === financeMemberTab).length && <div className="today-empty">No member items in this view.</div>}</div></div>}
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
              <div className="form-section readability-section">
                <div><strong>Font & text size</strong><p>Choose the font style and readable text size that suits each billing counter.</p></div>
                <div className="readability-controls"><label>App font<select value={fontName} onChange={(event) => changeFont(event.target.value as FontName)}><option value="system">System / Segoe</option><option value="modern">Modern / Geist</option><option value="classic">Classic / Georgia</option><option value="friendly">Friendly / Trebuchet</option></select></label><label>Text size<select value={textScale} onChange={(event) => changeTextScale(event.target.value as TextScaleName)}><option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option></select></label><button type="button" className="secondary-action" onClick={() => setShowShortcuts(true)}>⌨ Keyboard shortcuts</button></div>
              </div>
              <div className="form-section safety-section">
                <div><strong>Backup & offline safety</strong><p>Download a complete JSON copy. The latest synced data and unfinished order draft also stay available on this device.</p></div>
                <div className="safety-actions"><button type="button" className="primary-small" onClick={downloadBackup}>↓ Download data backup</button><div className={`safety-status ${online ? "online" : "offline"}`}><span>●</span><strong>{online ? "Cloud sync active" : "Offline cache active"}</strong><small>{online ? "Supabase is connected" : "Reconnect before saving final bills"}</small></div></div>
              </div>
              <div className="form-section audit-section">
                <div><strong>Complete audit history</strong><p>Every save, edit, delete, stock verification, delivery and customer change is recorded across devices.</p></div>
                <div className="audit-list">{state.auditLogs.slice(0, 100).map((log) => <div key={log.id}><span>{log.entityType.slice(0, 1).toUpperCase()}</span><p><strong>{log.summary}</strong><small>{shortDate(log.createdAt)} · {log.action}</small></p></div>)}{!state.auditLogs.length && <div className="today-empty">New updates will appear here automatically.</div>}</div>
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
            <div className="modal-head"><div><span className="eyebrow">Quick inventory</span><h2>Receive stock</h2></div><button type="button" onClick={() => setStockEntry({ product: null, quantity: 1, entryDate: isoDate() })}>×</button></div>
            <div className="stock-entry-product"><ProductThumb product={stockEntry.product} /><div><strong>{stockEntry.product.name}</strong><small>{stockEntry.product.code} · Current stock {stockEntry.product.stockQty}</small></div></div>
            <label className="stock-entry-field">Pieces received<input type="number" min="1" step="1" value={stockEntry.quantity} onChange={(event) => setStockEntry({ ...stockEntry, quantity: Math.max(1, Number(event.target.value) || 1) })} /></label>
            <label className="stock-entry-field">Stock entry date<input type="date" value={stockEntry.entryDate} onChange={(event) => setStockEntry({ ...stockEntry, entryDate: event.target.value })} /><small>{stockEntry.entryDate === isoDate() ? "Today" : displayEntryDate(stockEntry.entryDate)} · Format: DD-MM-YYYY</small></label>
            <div className="stock-entry-result"><span>New ready stock</span><strong>{stockEntry.product.stockQty + Math.floor(stockEntry.quantity)}</strong></div>
            <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setStockEntry({ product: null, quantity: 1, entryDate: isoDate() })}>Cancel</button><button className="primary-small" disabled={busy}>Add to stock</button></div>
          </form>
        </div>
      )}

      {showProductForm && (
        <div className="modal-backdrop">
          <form className="modal-card inventory-entry-modal" onSubmit={saveProduct}>
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
                  value={productForm.code || productCodePreview(productForm.category, productForm.name)}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      code: event.target.value.toUpperCase(),
                    })
                  }
                  placeholder={productForm.id ? "Product code" : "Auto-generated after saving"}
                  readOnly={!productForm.id}
                />
                {!productForm.id && <small className="field-hint">Preview only. Click “Save product”; the real common serial number will be generated and shown in the inventory table.</small>}
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
                <select
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value,
                    })
                  }
                >
                  <option value="">Select category</option>
                  {productCategoryOptions.map((item) => <option value={item} key={item}>{item}</option>)}
                </select>
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
                Skin type
                <input value={productForm.skinType} onChange={(event) => setProductForm({ ...productForm, skinType: event.target.value })} placeholder="Fabric / laminate / finish" />
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
              <div className="wide inventory-tags-heading inventory-tags-last"><strong>Product tags</strong><small>Optional merchandising details. Select multiple tags in each group; click again to unselect.</small></div>
              <TagPicker label="Cost segment" value={productForm.costSegment} options={productTagOptions.costSegment} onChange={(value) => setProductForm({ ...productForm, costSegment: value })} />
              <TagPicker label="Comfort" value={productForm.comfortTag} options={productTagOptions.comfortTag} onChange={(value) => setProductForm({ ...productForm, comfortTag: value })} />
              <TagPicker label="Material type" value={productForm.materialTag} options={productTagOptions.materialTag} onChange={(value) => setProductForm({ ...productForm, materialTag: value })} />
              <TagPicker label="Looks" value={productForm.lookTag} options={productTagOptions.lookTag} onChange={(value) => setProductForm({ ...productForm, lookTag: value })} />
              <TagPicker label="Utility" value={productForm.utilityTag} options={productTagOptions.utilityTag} onChange={(value) => setProductForm({ ...productForm, utilityTag: value })} />
              <TagPicker label="Trend relevance" value={productForm.trendTag} options={productTagOptions.trendTag} onChange={(value) => setProductForm({ ...productForm, trendTag: value })} />
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

      {showCustomProduct && (
        <div className="modal-backdrop"><form className="modal-card custom-product-modal" onSubmit={addCustomProduct}>
          <div className="modal-head"><div><span className="eyebrow">Custom furniture</span><h2>Add a made-to-order item</h2><small>Use this when the product is not in inventory. It will be marked Against Order and will not reduce ready stock.</small></div><button type="button" onClick={() => setShowCustomProduct(false)}>×</button></div>
          <div className="form-grid">
            <label className="wide">Custom order type<select value={customProductForm.mode} onChange={(event) => setCustomProductForm({ ...customProductForm, mode: event.target.value as "Customization" | "Personalization" })}><option>Customization</option><option>Personalization</option></select><small>Choose whether the customer wants an existing product changed or a fully personal design.</small></label>
            <label className="wide">Product / work name<input value={customProductForm.name} onChange={(event) => setCustomProductForm({ ...customProductForm, name: event.target.value })} placeholder="Custom sofa, TV unit, dining table…" required /></label>
            <label>Size / measurements<input value={customProductForm.size} onChange={(event) => setCustomProductForm({ ...customProductForm, size: event.target.value })} placeholder="8 × 6 ft / 3 seater" /></label>
            <label>Material / wood<input value={customProductForm.woodType} onChange={(event) => setCustomProductForm({ ...customProductForm, woodType: event.target.value })} placeholder="Teak, fabric, plywood…" /></label>
            <label>Unit price<input type="number" min="0" value={customProductForm.price || ""} onChange={(event) => setCustomProductForm({ ...customProductForm, price: Math.max(0, Number(event.target.value)) })} required /></label>
            <label>Quantity<input type="number" min="1" step="1" value={customProductForm.qty} onChange={(event) => setCustomProductForm({ ...customProductForm, qty: Math.max(1, Math.floor(Number(event.target.value) || 1)) })} /></label>
            <label className="wide">Reference image<input type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0] || null; setCustomProductImageFile(file); setCustomProductImagePreview(file ? URL.createObjectURL(file) : ""); }} /><small>Attach the customer reference or design photo.</small>{customProductImagePreview && <img className="custom-image-preview" src={customProductImagePreview} alt="Custom product preview" />}</label>
            <label className="wide">Production / customer notes<textarea rows={3} value={customProductForm.details} onChange={(event) => setCustomProductForm({ ...customProductForm, details: event.target.value })} placeholder="Measurements, finish, fabric, reference or production instructions…" /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowCustomProduct(false)}>Cancel</button><button className="primary-small">Add to this bill</button></div>
        </form></div>
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
                      {item.customMode ? ` · ${item.customMode}` : ""}
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
            {selectedBill.status === "cancelled" ? <div className="cancelled-lock-note">This cancelled bill is permanently frozen. Printing, GST invoice, Excel export, WhatsApp sharing, editing and payments are disabled.</div> : <div className="modal-actions invoice-actions">
              <button className="secondary-action" onClick={() => printBill(selectedBill, "order")}>Print Order Slip</button>
              <button className="secondary-action" onClick={() => printBill(selectedBill, "invoice")}>Final GST Invoice</button>
              <button className="secondary-action" onClick={() => downloadBillExcel(selectedBill)}>Excel</button>
              <button className="secondary-action" onClick={() => shareWhatsApp(selectedBill)}>WhatsApp invoice</button>
              <button className="secondary-action" onClick={() => shareWhatsApp(selectedBill, "delivery")}>WhatsApp delivery</button>
              {selectedBill.items.length >= 4 && <button className="secondary-action" onClick={() => { setJobCardForm({ stage: "New", referenceImages: [], billId: selectedBill.id, customerName: selectedBill.customerName, phone: selectedBill.customerPhone, measurements: selectedBill.items.map((item) => `${item.name}${item.size ? ` · ${item.size}` : ""}`).join("\n") }); setShowJobCardForm(true); }}>＋ Add to job card</button>}
              <button className="secondary-action" onClick={() => openAssignmentForBill(selectedBill)}>Assign supplier</button>
              {currentUser?.role === "md" && <button className="secondary-action" onClick={() => setEditingBill({ ...selectedBill, items: selectedBill.items.map((item) => ({ ...item })) })}>Edit full order</button>}
              {currentUser?.role === "md" && <button className="danger-button" onClick={async () => {
                if (!window.confirm("Cancel this order and restore all ready stock?")) return;
                const data = await mutate({ action: "cancelBill", id: selectedBill.id }, "Bill cancelled. Stock restored everywhere.");
                if (data) setSelectedBill(data.bills.find((bill) => bill.id === selectedBill.id) || null);
              }}>Cancel order</button>}
              {currentUser?.role !== "md" && <span className="md-approval-note">Edit / cancel requires Managing Director approval.</span>}
            </div>}
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

      {showCommitmentForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveCommitment}>
          <div className="modal-head"><div><span className="eyebrow">Finance · Commitment</span><h2>{commitmentForm.id ? "Edit commitment" : "Add commitment"}</h2></div><button type="button" onClick={() => setShowCommitmentForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Amount<input type="number" min="0.01" step="0.01" value={commitmentForm.amount || ""} onChange={(event) => setCommitmentForm({ ...commitmentForm, amount: Number(event.target.value) || 0 })} required /></label>
            <label>To / payee<input value={commitmentForm.payee || ""} onChange={(event) => setCommitmentForm({ ...commitmentForm, payee: event.target.value })} required /></label>
            <label>Due date<input type="date" value={commitmentForm.dueDate || ""} onChange={(event) => setCommitmentForm({ ...commitmentForm, dueDate: event.target.value })} /></label>
            <label>Account head<input value={commitmentForm.accountHead || ""} onChange={(event) => setCommitmentForm({ ...commitmentForm, accountHead: event.target.value })} placeholder="IB 1 · Marketing" /></label>
            <label>Raised by<input value={commitmentForm.raisedBy || ""} onChange={(event) => setCommitmentForm({ ...commitmentForm, raisedBy: event.target.value })} /></label>
            <label>Approved by<input value={commitmentForm.approvedBy || ""} onChange={(event) => setCommitmentForm({ ...commitmentForm, approvedBy: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowCommitmentForm(false)}>Cancel</button><button className="primary-small" disabled={busy}>Save commitment</button></div>
        </form></div>
      )}

      {showExpenseForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveExpense}>
          <div className="modal-head"><div><span className="eyebrow">Finance · Expense</span><h2>{expenseForm.id ? "Edit expense" : "Add expense"}</h2></div><button type="button" onClick={() => setShowExpenseForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Amount<input type="number" min="0.01" step="0.01" value={expenseForm.amount || ""} onChange={(event) => setExpenseForm({ ...expenseForm, amount: Number(event.target.value) || 0 })} required /></label>
            <label>To / payee<input value={expenseForm.payee || ""} onChange={(event) => setExpenseForm({ ...expenseForm, payee: event.target.value })} required /></label>
            <label>Automated date<input type="date" value={expenseForm.automatedDate || isoDate()} onChange={(event) => setExpenseForm({ ...expenseForm, automatedDate: event.target.value })} /></label>
            <label>Account head<input value={expenseForm.accountHead || ""} onChange={(event) => setExpenseForm({ ...expenseForm, accountHead: event.target.value })} placeholder="IB 1 · Marketing" /></label>
            <label>Raised by<input value={expenseForm.raisedBy || ""} onChange={(event) => setExpenseForm({ ...expenseForm, raisedBy: event.target.value })} /></label>
            <label>Approved by<input value={expenseForm.approvedBy || ""} onChange={(event) => setExpenseForm({ ...expenseForm, approvedBy: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowExpenseForm(false)}>Cancel</button><button className="primary-small" disabled={busy}>Save expense</button></div>
        </form></div>
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
          <div className="modal-head"><div><span className="eyebrow">Task & schedule</span><h2>{taskForm.title || (taskForm.id ? "Edit task" : "Add task")}</h2><small>{taskTemplateKey === "cleaning" ? "Record the cleaning activity and assign the responsible staff member." : taskTemplateKey === "marketing" ? "Capture the lead or promotion details and the next action." : taskTemplateKey === "development" ? "Record the showroom improvement and owner." : taskTemplateKey === "financial" ? "Capture the payment commitment and responsible staff member." : "Capture the customer, commitment and person responsible before saving."}</small></div><button type="button" onClick={() => setShowTaskForm(false)}>×</button></div>
          <div className="form-grid">
            {!taskCategoryLocked && <label className="wide task-title-field">Task title<input value={taskForm.title || ""} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} required /></label>}
            <label className="wide assigned-task-field">Assigned to<input list="task-staff" value={taskForm.assignedTo || ""} onChange={(event) => setTaskForm({ ...taskForm, assignedTo: event.target.value })} placeholder="Type or choose the staff member responsible" required /><small className="field-hint">This person owns the task. You can filter the list by multiple staff names.</small><datalist id="task-staff">{state.settings.staffNames.map((name) => <option key={name} value={name} />)}</datalist></label>
            {(!taskCategoryLocked || ["follow-up", "marketing", "financial"].includes(taskTemplateKey)) && <label>Customer name<input value={taskForm.customerName || ""} onChange={(event) => setTaskForm({ ...taskForm, customerName: event.target.value })} /></label>}
            {(!taskCategoryLocked || ["follow-up", "marketing", "financial"].includes(taskTemplateKey)) && <label>Phone number<input value={taskForm.customerPhone || ""} onChange={(event) => setTaskForm({ ...taskForm, customerPhone: event.target.value, linkedCustomerPhone: event.target.value })} /></label>}
            {(!taskCategoryLocked || ["follow-up", "marketing"].includes(taskTemplateKey)) && <label>Enquired products<input value={taskForm.enquiredProducts || ""} onChange={(event) => setTaskForm({ ...taskForm, enquiredProducts: event.target.value })} placeholder="Sofa, cot, dining set…" /></label>}
            {(!taskCategoryLocked || ["follow-up", "cleaning", "marketing", "development"].includes(taskTemplateKey)) && <label>Attended by<input list="attended-staff" value={taskForm.attendedBy || ""} onChange={(event) => setTaskForm({ ...taskForm, attendedBy: event.target.value })} /><datalist id="attended-staff">{state.settings.staffNames.map((name) => <option key={name} value={name} />)}</datalist></label>}
            <label>Commitment date<input type="date" value={taskForm.commitmentDate || ""} onChange={(event) => setTaskForm({ ...taskForm, commitmentDate: event.target.value })} /></label>
            {!taskCategoryLocked && <label>Due date<input type="date" value={taskForm.dueDate || ""} onChange={(event) => setTaskForm({ ...taskForm, dueDate: event.target.value })} /></label>}
            <label className="wide customer-notes-field">{taskTemplateKey === "cleaning" ? "Cleaning notes" : taskTemplateKey === "development" ? "Development notes" : taskTemplateKey === "financial" ? "Payment notes" : "Customer notes"}<textarea rows={3} value={taskForm.notes || ""} onChange={(event) => setTaskForm({ ...taskForm, notes: event.target.value })} placeholder={taskTemplateKey === "cleaning" ? "Record the cleaning work, issue or materials needed…" : taskTemplateKey === "development" ? "Record the improvement, decision or next action…" : taskTemplateKey === "financial" ? "Record the commitment, amount or payment plan…" : "Customer requirement, promised action or follow-up notes…"} /></label>
            {!taskCategoryLocked && <label>Category<select value={taskForm.category || "Follow-up"} onChange={(event) => setTaskForm({ ...taskForm, category: event.target.value })}>{["Follow-up", "Cleaning", "Marketing", "Development", "Recruitment", "Financial Commitment", "Financial", "Delivery", "Complaint", "General"].map((item) => <option key={item}>{item}</option>)}</select></label>}
            <label>Priority<select value={taskForm.priority || "Normal"} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}><option>Low</option><option>Normal</option><option>High</option><option>Urgent</option></select></label>
            {!taskCategoryLocked && <label className="wide">Details<textarea rows={3} value={taskForm.details || ""} onChange={(event) => setTaskForm({ ...taskForm, details: event.target.value })} /></label>}
            {!taskCategoryLocked && <label>Status<select value={taskForm.status || "Pending"} onChange={(event) => setTaskForm({ ...taskForm, status: event.target.value })}><option>Pending</option><option>In progress</option><option>Incomplete</option><option>Completed</option></select></label>}
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowTaskForm(false)}>Cancel</button><button className="primary-small" disabled={busy}>{busy ? "Saving…" : "Save task once"}</button></div>
        </form></div>
      )}

      {incompleteTask && (
        <div className="modal-backdrop"><form className="modal-card task-reason-modal" onSubmit={saveTaskIncomplete}>
          <div className="modal-head"><div><span className="eyebrow">Task unfinished</span><h2>Why is this task not complete?</h2><small>{incompleteTask.title}</small></div><button type="button" onClick={() => { setIncompleteTask(null); setIncompleteReason(""); }}>×</button></div>
          <label className="reason-field">Reason<textarea rows={4} autoFocus value={incompleteReason} onChange={(event) => setIncompleteReason(event.target.value)} placeholder="Add a clear reason so the team knows what to do next…" required /></label>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => { setIncompleteTask(null); setIncompleteReason(""); }}>Cancel</button><button className="primary-small" disabled={busy || !incompleteReason.trim()}>Save unfinished reason</button></div>
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
            <label className="wide follow-up-notes-field">Notes<textarea rows={4} value={interactionForm.details || ""} onChange={(event) => setInteractionForm({ ...interactionForm, details: event.target.value })} placeholder="Add the customer’s requirement, conversation summary or next action…" required /></label>
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

      {showLeadForm && (
        <div className="modal-backdrop"><form className="modal-card" onSubmit={saveLead}>
          <div className="modal-head"><div><span className="eyebrow">Marketing & leads</span><h2>{leadForm.id ? "Edit lead" : "Add walk-in / enquiry"}</h2></div><button type="button" onClick={() => setShowLeadForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Customer name<input value={leadForm.customerName || ""} onChange={(event) => setLeadForm({ ...leadForm, customerName: event.target.value })} required /></label>
            <label>Phone<input value={leadForm.phone || ""} onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })} required /></label>
            <label>Lead source<select value={leadForm.source || "Walk-in"} onChange={(event) => setLeadForm({ ...leadForm, source: event.target.value })}>{leadSources.map((source) => <option key={source}>{source}</option>)}</select></label>
            <label>Status<select value={leadForm.status || "New"} onChange={(event) => setLeadForm({ ...leadForm, status: event.target.value })}>{leadStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
            <label className="wide">Interested products / requirement<input value={leadForm.interest || ""} onChange={(event) => setLeadForm({ ...leadForm, interest: event.target.value })} placeholder="Sofa, cot, custom dining set…" /></label>
            <label>Assigned staff<input list="lead-staff" value={leadForm.assignedTo || ""} onChange={(event) => setLeadForm({ ...leadForm, assignedTo: event.target.value })} /><datalist id="lead-staff">{state.settings.staffNames.map((name) => <option key={name} value={name} />)}</datalist></label>
            <label>Next follow-up<input type="date" value={leadForm.followUpDate || ""} onChange={(event) => setLeadForm({ ...leadForm, followUpDate: event.target.value })} /></label>
            <label className="wide">Notes<textarea rows={3} value={leadForm.notes || ""} onChange={(event) => setLeadForm({ ...leadForm, notes: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowLeadForm(false)}>Cancel</button><button className="primary-small" disabled={busy}>{busy ? "Saving…" : "Save lead"}</button></div>
        </form></div>
      )}

      {showJobCardForm && (
        <div className="modal-backdrop"><form className="modal-card job-card-modal" onSubmit={saveJobCard}>
          <div className="modal-head"><div><span className="eyebrow">Custom furniture production</span><h2>{jobCardForm.id ? `Update ${jobCardForm.jobNo}` : "Create job card"}</h2><small>Measurements, materials, reference photos, costing and progress in one record.</small></div><button type="button" onClick={() => setShowJobCardForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Customer name<input value={jobCardForm.customerName || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, customerName: event.target.value })} required /></label>
            <label>Phone<input value={jobCardForm.phone || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, phone: event.target.value })} /></label>
            <label>Linked bill<select value={jobCardForm.billId || ""} onChange={(event) => { const bill = activeBills.find((row) => row.id === event.target.value); setJobCardForm({ ...jobCardForm, billId: event.target.value, customerName: jobCardForm.customerName || bill?.customerName || "", phone: jobCardForm.phone || bill?.customerPhone || "" }); }}><option value="">No linked bill</option>{activeBills.map((bill) => <option value={bill.id} key={bill.id}>{bill.billNo} · {bill.customerName}</option>)}</select></label>
            <label>Stage<select value={jobCardForm.stage || "New"} onChange={(event) => setJobCardForm({ ...jobCardForm, stage: event.target.value })}>{jobStages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            <label className="wide">Measurements<textarea rows={3} value={jobCardForm.measurements || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, measurements: event.target.value })} placeholder="Width, height, depth, room measurements…" /></label>
            <label>Wood / material<input value={jobCardForm.woodMaterial || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, woodMaterial: event.target.value })} /></label>
            <label>Fabric / colour<input value={jobCardForm.fabric || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, fabric: event.target.value })} /></label>
            <label>Foam specification<input value={jobCardForm.foam || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, foam: event.target.value })} /></label>
            <label>Polish / finish<input value={jobCardForm.polish || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, polish: event.target.value })} /></label>
            <label>Estimated cost<input type="number" min="0" value={jobCardForm.estimatedCost || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, estimatedCost: Number(event.target.value) })} /></label>
            <label>Expected completion<input type="date" value={jobCardForm.expectedDate || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, expectedDate: event.target.value })} /></label>
            <label>Assigned worker<input list="job-staff" value={jobCardForm.assignedTo || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, assignedTo: event.target.value })} /><datalist id="job-staff">{state.settings.staffNames.map((name) => <option key={name} value={name} />)}</datalist></label>
            <label>Reference photos<input type="file" accept="image/*" multiple onChange={(event) => setJobReferenceFiles(Array.from(event.target.files || []).slice(0, 6))} /><small>{jobReferenceFiles.length ? `${jobReferenceFiles.length} new image(s) selected` : `${jobCardForm.referenceImages?.length || 0} saved image(s)`}</small></label>
            <label className="wide">Production notes<textarea rows={3} value={jobCardForm.notes || ""} onChange={(event) => setJobCardForm({ ...jobCardForm, notes: event.target.value })} /></label>
          </div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowJobCardForm(false)}>Cancel</button><button className="primary-small" disabled={busy}>{busy ? "Saving…" : "Save job card"}</button></div>
        </form></div>
      )}

      {showHeldOrders && (
        <div className="modal-backdrop"><div className="modal-card held-orders-modal">
          <div className="modal-head"><div><span className="eyebrow">Safe bill parking</span><h2>Held bills</h2><small>Continue any customer bill from the same point on any device.</small></div><button onClick={() => setShowHeldOrders(false)}>×</button></div>
          <div className="held-order-list">{state.heldOrders.map((held) => <article key={held.id}><div><strong>{held.name}</strong><small>{shortDate(held.updatedAt)} · {held.payload.cart?.length || 0} product lines</small></div><span>{money((held.payload.cart || []).reduce((sum, item) => sum + item.price * item.qty, 0))}</span><div className="row-actions"><button onClick={() => resumeHeldOrder(held)}>Continue</button><button className="danger-link" onClick={() => mutate({ action: "deleteHeldOrder", id: held.id }, "Held bill removed.")}>Remove</button></div></article>)}{!state.heldOrders.length && <div className="today-empty">No held bills. Use “Hold bill” while billing to park unfinished work safely.</div>}</div>
        </div></div>
      )}

      {showStockVerification && (
        <div className="modal-backdrop"><form className="modal-card stock-verification-modal" onSubmit={saveStockVerification}>
          <div className="modal-head"><div><span className="eyebrow">Physical stock verification</span><h2>Count showroom stock</h2><small>Only entered rows will be updated. Differences are saved in audit history.</small></div><button type="button" onClick={() => setShowStockVerification(false)}>×</button></div>
          <div className="stock-check-meta"><label>Checked by<input value={stockCheckMeta.checkedBy} onChange={(event) => setStockCheckMeta({ ...stockCheckMeta, checkedBy: event.target.value })} /></label><label>Notes<input value={stockCheckMeta.notes} onChange={(event) => setStockCheckMeta({ ...stockCheckMeta, notes: event.target.value })} /></label></div>
          <div className="stock-count-list"><header><span>Product</span><span>System</span><span>Physical</span><span>Difference</span></header>{state.products.map((product) => { const counted = stockCounts[product.id]; const difference = counted === "" || counted === undefined ? null : Number(counted) - product.stockQty; return <div key={product.id}><span><strong>{product.name}</strong><small>{product.code}</small></span><b>{product.stockQty}</b><input type="number" min="0" value={counted ?? ""} onChange={(event) => setStockCounts({ ...stockCounts, [product.id]: event.target.value === "" ? "" : Math.max(0, Math.floor(Number(event.target.value))) })} placeholder="—" /><em className={difference && difference !== 0 ? "changed" : ""}>{difference === null ? "—" : difference > 0 ? `+${difference}` : difference}</em></div>; })}</div>
          <div className="modal-actions"><button type="button" className="secondary-action" onClick={() => setShowStockVerification(false)}>Cancel</button><button className="primary-small" disabled={busy}>{busy ? "Applying…" : "Apply verified counts"}</button></div>
        </form></div>
      )}

      {showShortcuts && (
        <div className="modal-backdrop"><div className="modal-card shortcuts-modal">
          <div className="modal-head"><div><span className="eyebrow">Universal keyboard shortcuts</span><h2>Work faster</h2></div><button onClick={() => setShowShortcuts(false)}>×</button></div>
          <div className="shortcut-list"><span><kbd>Alt + 1</kbd><b>Dashboard</b></span><span><kbd>Alt + 2</kbd><b>New order</b></span><span><kbd>Alt + 3</kbd><b>Inventory</b></span><span><kbd>Alt + 4</kbd><b>Orders</b></span><span><kbd>Alt + 5</kbd><b>Deliveries</b></span><span><kbd>F2</kbd><b>Product search</b></span><span><kbd>Ctrl + S</kbd><b>Save bill in payment step</b></span><span><kbd>Ctrl + Shift + H</kbd><b>Hold current bill</b></span><span><kbd>Esc</kbd><b>Close drawer / help</b></span><span><kbd>?</kbd><b>Open this guide</b></span></div>
        </div></div>
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
function TagPicker({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) {
  const selected = splitProductTags(value);
  const toggle = (tag: string) => onChange(selected.includes(tag) ? selected.filter((item) => item !== tag).join(", ") : [...selected, tag].join(", "));
  return <div className="tag-picker-field"><span className="tag-picker-label">{label}</span><div className="tag-picker" role="group" aria-label={label}>{options.map((tag) => <button type="button" key={tag} className={selected.includes(tag) ? "selected" : ""} onClick={() => toggle(tag)} aria-pressed={selected.includes(tag)}>{tag}</button>)}</div>{selected.length > 0 && <small className="tag-picker-selected">Selected: {selected.join(" · ")}</small>}</div>;
}
function Metric({
  label,
  value,
  note,
  alert = false,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  alert?: boolean;
  icon?: string;
}) {
  return (
    <article className={`metric-card ${alert ? "alert" : ""}`}>
      <span className="metric-label">{icon && <i>{icon}</i>}{label}</span>
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
      ],
      rows: list.map((bill) => [
        bill.billNo,
        bill.customerName,
        bill.grandTotal,
        bill.paidAmount,
        bill.balanceAmount,
        bill.staffName,
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
