ALTER TABLE `bills` ADD `card_charge` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `transport_charge` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `other_charge` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `order_notes` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `accountant_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `manager_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bills` ADD `document_type` text DEFAULT 'order_slip' NOT NULL;