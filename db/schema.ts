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
