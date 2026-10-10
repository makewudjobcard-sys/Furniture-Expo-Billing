import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  hsnCode: text("hsn_code").notNull().default(""),
  name: text("name").notNull(),
  category: text("category").notNull().default("Others"),
  size: text("size").notNull().default(""),
  woodType: text("wood_type").notNull().default(""),
  price: integer("price").notNull().default(0),
  stockQty: integer("stock_qty").notNull().default(0),
  mrp: integer("mrp").notNull().default(0),
  notes: text("notes").notNull().default(""),
  imageKey: text("image_key").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(),
  billNo: text("bill_no").notNull().unique(),
  clientRequestId: text("client_request_id").notNull().default(""),
  customerName: text("customer_name").notNull().default("Walk-in Customer"),
  customerPhone: text("customer_phone").notNull().default(""),
  customerAddress: text("customer_address").notNull().default(""),
  itemsJson: text("items_json").notNull(),
  staffName: text("staff_name").notNull().default(""),
  counterName: text("counter_name").notNull().default(""),
  productTotal: integer("product_total").notNull().default(0),
  againstOrderExtra: integer("against_order_extra").notNull().default(0),
  subtotal: integer("subtotal").notNull(),
  discountType: text("discount_type").notNull().default("amount"),
  discountValue: integer("discount_value").notNull().default(0),
  discount: integer("discount").notNull().default(0),
  taxableValue: integer("taxable_value").notNull().default(0),
  cgst: integer("cgst").notNull().default(0),
  sgst: integer("sgst").notNull().default(0),
  gst: integer("gst").notNull().default(0),
  grandTotal: integer("grand_total").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  balanceAmount: integer("balance_amount").notNull().default(0),
  paymentMode: text("payment_mode").notNull().default("Cash"),
  paymentHistoryJson: text("payment_history_json").notNull().default("[]"),
  deliveryDate: text("delivery_date").notNull().default(""),
  deliveryStatus: text("delivery_status").notNull().default("Pending"),
  deliveredAt: text("delivered_at").notNull().default(""),
  status: text("status").notNull().default("confirmed"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  businessName: text("business_name").notNull().default("Furniture Expo"),
  subtitle: text("subtitle").notNull().default("Live Billing Desk"),
  gstin: text("gstin").notNull().default(""),
  phone: text("phone").notNull().default(""),
  address: text("address").notNull().default(""),
  gstRate: integer("gst_rate").notNull().default(18),
  billPrefix: text("bill_prefix").notNull().default("EXP"),
  staffNamesJson: text("staff_names_json").notNull().default("[]"),
  counterNamesJson: text("counter_names_json").notNull().default('["Counter 1"]'),
  defaultCounter: text("default_counter").notNull().default("Counter 1"),
  invoiceTerms: text("invoice_terms").notNull().default("Goods once sold cannot be returned without approval."),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const counters = sqliteTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});

export const suppliers = sqliteTable("suppliers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  contactPerson: text("contact_person").notNull().default(""),
  phone: text("phone").notNull().default(""),
  gstin: text("gstin").notNull().default(""),
  address: text("address").notNull().default(""),
  categories: text("categories").notNull().default(""),
  bankDetails: text("bank_details").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("Active"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  category: text("category").notNull().default("General"),
  title: text("title").notNull(),
  details: text("details").notNull().default(""),
  assignedTo: text("assigned_to").notNull().default(""),
  dueDate: text("due_date").notNull().default(""),
  priority: text("priority").notNull().default("Normal"),
  status: text("status").notNull().default("Pending"),
  linkedBillId: text("linked_bill_id").notNull().default(""),
  linkedCustomerPhone: text("linked_customer_phone").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customerInteractions = sqliteTable("customer_interactions", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  type: text("type").notNull().default("Follow-up"),
  details: text("details").notNull().default(""),
  assignedTo: text("assigned_to").notNull().default(""),
  nextFollowUp: text("next_follow_up").notNull().default(""),
  status: text("status").notNull().default("Open"),
  billId: text("bill_id").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const supplierAssignments = sqliteTable("supplier_assignments", {
  id: text("id").primaryKey(),
  billId: text("bill_id").notNull(),
  billNo: text("bill_no").notNull(),
  productId: text("product_id").notNull().default(""),
  productCode: text("product_code").notNull().default(""),
  productName: text("product_name").notNull(),
  qty: integer("qty").notNull().default(1),
  supplierId: text("supplier_id").notNull(),
  purchaseCost: integer("purchase_cost").notNull().default(0),
  advancePaid: integer("advance_paid").notNull().default(0),
  expectedDate: text("expected_date").notNull().default(""),
  status: text("status").notNull().default("Not ordered"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
