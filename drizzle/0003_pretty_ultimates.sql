CREATE TABLE `customer_interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_name` text NOT NULL,
	`customer_phone` text NOT NULL,
	`type` text DEFAULT 'Follow-up' NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`assigned_to` text DEFAULT '' NOT NULL,
	`next_follow_up` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Open' NOT NULL,
	`bill_id` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplier_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`bill_id` text NOT NULL,
	`bill_no` text NOT NULL,
	`product_id` text DEFAULT '' NOT NULL,
	`product_code` text DEFAULT '' NOT NULL,
	`product_name` text NOT NULL,
	`qty` integer DEFAULT 1 NOT NULL,
	`supplier_id` text NOT NULL,
	`purchase_cost` integer DEFAULT 0 NOT NULL,
	`advance_paid` integer DEFAULT 0 NOT NULL,
	`expected_date` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Not ordered' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`contact_person` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`gstin` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`categories` text DEFAULT '' NOT NULL,
	`bank_details` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text DEFAULT 'General' NOT NULL,
	`title` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`assigned_to` text DEFAULT '' NOT NULL,
	`due_date` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'Normal' NOT NULL,
	`status` text DEFAULT 'Pending' NOT NULL,
	`linked_bill_id` text DEFAULT '' NOT NULL,
	`linked_customer_phone` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
