CREATE TABLE `bills` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_no` text NOT NULL,
	`customer_name` text DEFAULT 'Walk-in Customer' NOT NULL,
	`customer_phone` text DEFAULT '' NOT NULL,
	`customer_address` text DEFAULT '' NOT NULL,
	`items_json` text NOT NULL,
	`subtotal` integer NOT NULL,
	`discount` integer DEFAULT 0 NOT NULL,
	`grand_total` integer NOT NULL,
	`paid_amount` integer DEFAULT 0 NOT NULL,
	`balance_amount` integer DEFAULT 0 NOT NULL,
	`payment_mode` text DEFAULT 'Cash' NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bills_bill_no_unique` ON `bills` (`bill_no`);--> statement-breakpoint
CREATE TABLE `counters` (
	`key` text PRIMARY KEY NOT NULL,
	`value` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`hsn_code` text DEFAULT '' NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Others' NOT NULL,
	`size` text DEFAULT '' NOT NULL,
	`wood_type` text DEFAULT '' NOT NULL,
	`price` integer DEFAULT 0 NOT NULL,
	`stock_qty` integer DEFAULT 0 NOT NULL,
	`mrp` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_code_unique` ON `products` (`code`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`business_name` text DEFAULT 'Furniture Expo' NOT NULL,
	`subtitle` text DEFAULT 'Live Billing Desk' NOT NULL,
	`gstin` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`gst_rate` integer DEFAULT 18 NOT NULL,
	`bill_prefix` text DEFAULT 'EXP' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_products_category` ON `products` (`category`);
--> statement-breakpoint
CREATE INDEX `idx_bills_created_at` ON `bills` (`created_at` DESC);
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`id`, `business_name`, `subtitle`, `gst_rate`, `bill_prefix`)
VALUES (1, 'Furniture Expo', 'Live Billing Desk', 18, 'EXP');
--> statement-breakpoint
INSERT OR IGNORE INTO `counters` (`key`, `value`) VALUES ('bill', 0);
--> statement-breakpoint
CREATE TRIGGER `bill_stock_guard`
BEFORE INSERT ON `bills`
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
END;
--> statement-breakpoint
CREATE TRIGGER `bill_cancel_restore`
AFTER UPDATE OF status ON `bills`
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
END;
--> statement-breakpoint
PRAGMA optimize;
