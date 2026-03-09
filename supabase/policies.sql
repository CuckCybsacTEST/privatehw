create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.media_assets enable row level security;
alter table public.blog_posts enable row level security;

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
