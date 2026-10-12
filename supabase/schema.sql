-- Smaarthome Furniture Billing: Supabase schema and server-only SQL bridge.
-- The bridge is executable only by Supabase's service_role key used by the Render server.

create table if not exists public.products (
  id text primary key,
  code text not null unique,
  hsn_code text not null default '',
  name text not null,
  category text not null default 'Others',
  size text not null default '',
  wood_type text not null default '',
  price double precision not null default 0,
  stock_qty integer not null default 0,
  mrp double precision not null default 0,
  notes text not null default '',
  image_key text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.bills (
  id text primary key,
  bill_no text not null unique,
  client_request_id text not null default '',
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null default '',
  items_json text not null,
  staff_name text not null default '',
  counter_name text not null default '',
  product_total double precision not null default 0,
  against_order_extra double precision not null default 0,
  card_charge double precision not null default 0,
  transport_charge double precision not null default 0,
  other_charge double precision not null default 0,
  subtotal double precision not null default 0,
  discount_type text not null default 'amount',
  discount_value double precision not null default 0,
  discount double precision not null default 0,
  taxable_value double precision not null default 0,
  cgst double precision not null default 0,
  sgst double precision not null default 0,
  gst double precision not null default 0,
  grand_total double precision not null default 0,
  paid_amount double precision not null default 0,
  balance_amount double precision not null default 0,
  payment_mode text not null default 'CASH',
  payment_history_json text not null default '[]',
  delivery_date text not null default '',
  delivery_status text not null default 'Pending',
  delivered_at text not null default '',
  order_notes text not null default '',
  accountant_name text not null default '',
  manager_name text not null default '',
  document_type text not null default 'order_slip',
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id integer primary key check (id = 1),
  business_name text not null default 'Smaarthome Furniture',
  subtitle text not null default 'Live Billing Desk',
  gstin text not null default '',
  phone text not null default '',
  address text not null default '',
  gst_rate double precision not null default 18,
  bill_prefix text not null default 'EXP',
  staff_names_json text not null default '[]',
  counter_names_json text not null default '["Counter 1"]',
  default_counter text not null default 'Counter 1',
  invoice_terms text not null default 'Goods once sold cannot be returned without approval.',
  updated_at timestamptz not null default now()
);

create table if not exists public.counters (
  key text primary key,
  value integer not null default 0
);

create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  contact_person text not null default '',
  phone text not null default '',
  gstin text not null default '',
  address text not null default '',
  categories text not null default '',
  bank_details text not null default '',
  notes text not null default '',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key,
  category text not null default 'General',
  title text not null,
  details text not null default '',
  assigned_to text not null default '',
  due_date text not null default '',
  priority text not null default 'Normal',
  status text not null default 'Pending',
  linked_bill_id text not null default '',
  linked_customer_phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_interactions (
  id text primary key,
  customer_name text not null,
  customer_phone text not null,
  type text not null default 'Follow-up',
  details text not null default '',
  assigned_to text not null default '',
  next_follow_up text not null default '',
  status text not null default 'Open',
  bill_id text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supplier_assignments (
  id text primary key,
  bill_id text not null,
  bill_no text not null,
  product_id text not null default '',
  product_code text not null default '',
  product_name text not null,
  qty integer not null default 1,
  supplier_id text not null,
  purchase_cost double precision not null default 0,
  advance_paid double precision not null default 0,
  expected_date text not null default '',
  status text not null default 'Not ordered',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id text primary key,
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_products_category on public.products(category);
create index if not exists idx_bills_created_at on public.bills(created_at desc);
create index if not exists idx_bills_delivery_date on public.bills(delivery_date);
create unique index if not exists idx_bills_client_request_id on public.bills(client_request_id) where client_request_id <> '';
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);

create or replace function public.furniture_bill_stock_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  item jsonb;
  needed integer;
begin
  for item in select value from jsonb_array_elements(new.items_json::jsonb)
  loop
    if coalesce((item->>'againstOrder')::boolean, false) = false then
      needed := greatest(1, coalesce((item->>'qty')::integer, 1));
      update public.products
      set stock_qty = stock_qty - needed, updated_at = now()
      where id = item->>'productId' and stock_qty >= needed;
      if not found then raise exception 'INSUFFICIENT_STOCK'; end if;
    end if;
  end loop;
  return new;
end;
$$;

create or replace function public.furniture_bill_cancel_restore()
returns trigger language plpgsql security definer set search_path = public as $$
declare item jsonb;
begin
  if old.status <> 'cancelled' and new.status = 'cancelled' then
    for item in select value from jsonb_array_elements(old.items_json::jsonb)
    loop
      if coalesce((item->>'againstOrder')::boolean, false) = false then
        update public.products
        set stock_qty = stock_qty + greatest(1, coalesce((item->>'qty')::integer, 1)), updated_at = now()
        where id = item->>'productId';
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists bill_stock_guard on public.bills;
create trigger bill_stock_guard before insert on public.bills
for each row execute function public.furniture_bill_stock_guard();

drop trigger if exists bill_cancel_restore on public.bills;
create trigger bill_cancel_restore after update of status on public.bills
for each row execute function public.furniture_bill_cancel_restore();

create or replace function public.expo_query(p_sql text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service_role required'; end if;
  execute 'select coalesce(jsonb_agg(to_jsonb(q)), ''[]''::jsonb) from (' || p_sql || ') q' into result;
  return coalesce(result, '[]'::jsonb);
end;
$$;

create or replace function public.expo_exec(p_sql text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare affected integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service_role required'; end if;
  execute p_sql;
  get diagnostics affected = row_count;
  return jsonb_build_object('changes', affected);
end;
$$;

create or replace function public.expo_batch(p_statements jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare statement text; affected integer; total integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then raise exception 'service_role required'; end if;
  for statement in select jsonb_array_elements_text(p_statements)
  loop
    execute statement;
    get diagnostics affected = row_count;
    total := total + affected;
  end loop;
  return jsonb_build_object('changes', total);
end;
$$;

revoke all on function public.expo_query(text) from public, anon, authenticated;
revoke all on function public.expo_exec(text) from public, anon, authenticated;
revoke all on function public.expo_batch(jsonb) from public, anon, authenticated;
grant execute on function public.expo_query(text) to service_role;
grant execute on function public.expo_exec(text) to service_role;
grant execute on function public.expo_batch(jsonb) to service_role;

insert into public.settings (id, business_name, subtitle, gst_rate, bill_prefix)
values (1, 'Smaarthome Furniture', 'Showroom Billing & Operations', 18, 'SHF') on conflict do nothing;
insert into public.counters (key, value) values ('bill', 0) on conflict do nothing;
