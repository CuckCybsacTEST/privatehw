alter table public.profiles
  add column if not exists audience text not null default 'client';

alter table public.profiles
  drop constraint if exists profiles_audience_check;

alter table public.profiles
  add constraint profiles_audience_check
  check (audience in ('client', 'model', 'visitor'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $new_user$
begin
  insert into public.profiles (id, email, username, display_name, audience)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'audience', ''), 'client')
  )
  on conflict (id) do update
  set email = excluded.email,
      username = coalesce(excluded.username, public.profiles.username);

  return new;
end;
$new_user$;

create or replace function public.get_my_profile()
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  stripe_customer_id text,
  role text,
  audience text,
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
    p.username,
    p.display_name,
    p.stripe_customer_id,
    p.role,
    p.audience,
    p.status
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$profile$;

create or replace function public.set_my_profile_audience(new_audience text)
returns table (
  id uuid,
  email text,
  username text,
  display_name text,
  stripe_customer_id text,
  role text,
  audience text,
  status text
)
language plpgsql
security definer
set search_path = public
as $audience$
declare
  normalized_audience text;
begin
  normalized_audience := case
    when lower(coalesce(new_audience, '')) = 'model' then 'model'
    when lower(coalesce(new_audience, '')) = 'visitor' then 'visitor'
    else 'client'
  end;

  update public.profiles
  set audience = normalized_audience
  where id = auth.uid();

  return query
  select
    p.id,
    p.email,
    p.username,
    p.display_name,
    p.stripe_customer_id,
    p.role,
    p.audience,
    p.status
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
end;
$audience$;
