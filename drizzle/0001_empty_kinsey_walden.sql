ALTER TABLE `bills` ADD `staff_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `counter_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `product_total` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `against_order_extra` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `discount_type` text DEFAULT 'amount' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `discount_value` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `taxable_value` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `cgst` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `sgst` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `gst` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `payment_history_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `delivery_date` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `delivery_status` text DEFAULT 'Pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `delivered_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `image_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `staff_names_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `counter_names_json` text DEFAULT '["Counter 1"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `default_counter` text DEFAULT 'Counter 1' NOT NULL;--> statement-breakpoint
ALTER TABLE `settings` ADD `invoice_terms` text DEFAULT 'Goods once sold cannot be returned without approval.' NOT NULL;