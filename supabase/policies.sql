create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $is_admin$
declare
  admin_match boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  )
  into admin_match;

  return coalesce(admin_match, false);
end;
$is_admin$;

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

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.get_my_profile() to authenticated;

alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.encuentros_models enable row level security;
alter table public.media_assets enable row level security;
alter table public.blog_posts enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.entitlements enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "site content public read" on public.site_content;
create policy "site content public read"
on public.site_content
for select
to anon, authenticated
using (true);

drop policy if exists "site content admin write" on public.site_content;
create policy "site content admin write"
on public.site_content
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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

drop policy if exists "media public read" on public.media_assets;
create policy "media public read"
on public.media_assets
for select
to anon, authenticated
using (true);

drop policy if exists "media admin write" on public.media_assets;
create policy "media admin write"
on public.media_assets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "blog public read published" on public.blog_posts;
create policy "blog public read published"
on public.blog_posts
for select
to anon, authenticated
using (status = 'published' or public.is_admin());

drop policy if exists "blog admin write" on public.blog_posts;
create policy "blog admin write"
on public.blog_posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "products public read" on public.products;
create policy "products public read"
on public.products
for select
to anon, authenticated
using (active = true or public.is_admin());

drop policy if exists "products admin write" on public.products;
create policy "products admin write"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "orders self read" on public.orders;
create policy "orders self read"
on public.orders
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders admin write" on public.orders;
create policy "orders admin write"
on public.orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "order items self read" on public.order_items;
create policy "order items self read"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.orders
    where id = order_id
      and (user_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "order items admin write" on public.order_items;
create policy "order items admin write"
on public.order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "entitlements self read" on public.entitlements;
create policy "entitlements self read"
on public.entitlements
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "entitlements admin write" on public.entitlements;
create policy "entitlements admin write"
on public.entitlements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('site-images', 'site-images', true),
  ('site-videos', 'site-videos', true),
  ('blog-media', 'blog-media', true)
on conflict (id) do nothing;

drop policy if exists "site images public read" on storage.objects;
create policy "site images public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id in ('site-images', 'site-videos', 'blog-media'));

drop policy if exists "site media admin write" on storage.objects;
create policy "site media admin write"
on storage.objects
for all
to authenticated
using (
  bucket_id in ('site-images', 'site-videos', 'blog-media')
  and public.is_admin()
)
with check (
  bucket_id in ('site-images', 'site-videos', 'blog-media')
  and public.is_admin()
);
