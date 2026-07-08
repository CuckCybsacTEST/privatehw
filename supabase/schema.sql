create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $handle$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$handle$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  stripe_customer_id text,
  role text not null default 'public' check (role in ('admin', 'public')),
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles add column if not exists stripe_customer_id text;

create table if not exists public.site_content (
  slug text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.encuentros_model_requests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  email text not null,
  city text,
  nationality text,
  phone text,
  telegram text,
  bio text not null,
  notes text,
  verification_photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended', 'observed')),
  model_id uuid references public.encuentros_models(id) on delete set null,
  review_notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null unique,
  kind text not null check (kind in ('image', 'video', 'audio')),
  alt_text text,
  width integer,
  height integer,
  duration_seconds numeric,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default 'Sample Title A',
  excerpt text default '',
  body jsonb not null default '[]'::jsonb,
  cover_media_path text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  product_type text not null check (product_type in ('subscription', 'video', 'pack', 'physical')),
  checkout_mode text not null default 'payment' check (checkout_mode in ('payment', 'subscription')),
  access_scope text not null,
  price_amount integer not null default 0,
  currency text not null default 'PEN',
  price_label text not null default 'S/0',
  active boolean not null default true,
  stripe_product_id text,
  stripe_price_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  provider text not null default 'manual',
  provider_order_id text unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  total_amount integer not null default 0,
  currency text not null default 'PEN',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_slug text not null,
  quantity integer not null default 1,
  unit_amount integer not null default 0,
  total_amount integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists order_items_product_slug_idx
  on public.order_items (product_slug);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_slug text,
  entitlement_key text not null,
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  source_order_id uuid references public.orders(id) on delete set null,
  grant_source text not null default 'checkout',
  granted_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists entitlements_product_slug_idx
  on public.entitlements (product_slug);

create unique index if not exists profiles_stripe_customer_id_idx
on public.profiles (stripe_customer_id)
where stripe_customer_id is not null;

create index if not exists encuentros_models_status_sort_order_idx
  on public.encuentros_models (status, sort_order asc, published_at desc);

create index if not exists encuentros_models_deleted_at_idx
  on public.encuentros_models (deleted_at);

create index if not exists encuentros_model_requests_status_created_at_idx
  on public.encuentros_model_requests (status, created_at desc);

create index if not exists encuentros_model_requests_model_id_idx
  on public.encuentros_model_requests (model_id);

create unique index if not exists entitlements_user_key_idx
on public.entitlements (user_id, entitlement_key);

alter table public.entitlements add column if not exists grant_source text not null default 'checkout';
alter table public.entitlements add column if not exists granted_by uuid references public.profiles(id) on delete set null;

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_id uuid references public.profiles(id) on delete set null,
  target_user_id uuid references public.profiles(id) on delete set null,
  entity_type text not null default 'user',
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_audit_events_created_at_idx
  on public.admin_audit_events (created_at desc);

create index if not exists admin_audit_events_actor_id_idx
  on public.admin_audit_events (actor_id);

create index if not exists admin_audit_events_target_user_id_idx
  on public.admin_audit_events (target_user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $new_user$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$new_user$;

create or replace function public.get_my_profile()
returns table (
  id uuid,
  email text,
  display_name text,
  stripe_customer_id text,
  role text,
  status text
)
language sql
stable
security definer
set search_path = public
as $profile$
  select
    p.id,
    p.email,
    p.display_name,
    p.stripe_customer_id,
    p.role,
    p.status
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$profile$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
before update on public.site_content
for each row execute procedure public.handle_updated_at();

drop trigger if exists encuentros_models_set_updated_at on public.encuentros_models;
create trigger encuentros_models_set_updated_at
before update on public.encuentros_models
for each row execute procedure public.handle_updated_at();

drop trigger if exists encuentros_model_requests_set_updated_at on public.encuentros_model_requests;
create trigger encuentros_model_requests_set_updated_at
before update on public.encuentros_model_requests
for each row execute procedure public.handle_updated_at();

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute procedure public.handle_updated_at();

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
before update on public.blog_posts
for each row execute procedure public.handle_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute procedure public.handle_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row execute procedure public.handle_updated_at();

drop trigger if exists entitlements_set_updated_at on public.entitlements;
create trigger entitlements_set_updated_at
before update on public.entitlements
for each row execute procedure public.handle_updated_at();

insert into public.site_content (slug, content)
values ('home', '{}'::jsonb)
on conflict (slug) do nothing;
