create table if not exists public.encuentros_models (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'suspended')),
  sort_order integer not null default 0,
  content jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  deleted_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists encuentros_models_status_sort_order_idx
  on public.encuentros_models (status, sort_order asc, published_at desc);

create index if not exists encuentros_models_deleted_at_idx
  on public.encuentros_models (deleted_at);

alter table public.encuentros_models enable row level security;

drop trigger if exists encuentros_models_set_updated_at on public.encuentros_models;
create trigger encuentros_models_set_updated_at
before update on public.encuentros_models
for each row execute procedure public.handle_updated_at();

drop policy if exists "encuentros models public read published" on public.encuentros_models;
create policy "encuentros models public read published"
on public.encuentros_models
for select
to anon, authenticated
using ((status = 'published' and deleted_at is null) or public.is_admin());

drop policy if exists "encuentros models admin write" on public.encuentros_models;
create policy "encuentros models admin write"
on public.encuentros_models
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

with reservation_orders as (
  select id
  from public.orders
  where provider_order_id like 'manual-reservation-%'
    or metadata->>'checkoutType' = 'reservation'
    or metadata->>'productType' = 'reservation'
    or metadata->>'productSlug' = 'reservation-encuentros'
)
delete from public.order_items
where order_id in (select id from reservation_orders);

with reservation_orders as (
  select id
  from public.orders
  where provider_order_id like 'manual-reservation-%'
    or metadata->>'checkoutType' = 'reservation'
    or metadata->>'productType' = 'reservation'
    or metadata->>'productSlug' = 'reservation-encuentros'
)
delete from public.entitlements
where source_order_id in (select id from reservation_orders);

with reservation_orders as (
  select id
  from public.orders
  where provider_order_id like 'manual-reservation-%'
    or metadata->>'checkoutType' = 'reservation'
    or metadata->>'productType' = 'reservation'
    or metadata->>'productSlug' = 'reservation-encuentros'
)
delete from public.orders
where id in (select id from reservation_orders);
