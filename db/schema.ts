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
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(),
  billNo: text("bill_no").notNull().unique(),
  customerName: text("customer_name").notNull().default("Walk-in Customer"),
  customerPhone: text("customer_phone").notNull().default(""),
  customerAddress: text("customer_address").notNull().default(""),
  itemsJson: text("items_json").notNull(),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  grandTotal: integer("grand_total").notNull(),
  paidAmount: integer("paid_amount").notNull().default(0),
  balanceAmount: integer("balance_amount").notNull().default(0),
  paymentMode: text("payment_mode").notNull().default("Cash"),
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
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const counters = sqliteTable("counters", {
  key: text("key").primaryKey(),
  value: integer("value").notNull().default(0),
});
