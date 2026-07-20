create table if not exists public.encuentros_model_owners (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.encuentros_models(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_scope text not null default 'owner' check (permission_scope in ('owner', 'editor')),
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists encuentros_model_owners_model_id_idx
  on public.encuentros_model_owners (model_id);

create unique index if not exists encuentros_model_owners_profile_id_idx
  on public.encuentros_model_owners (profile_id);

drop trigger if exists encuentros_model_owners_set_updated_at on public.encuentros_model_owners;
create trigger encuentros_model_owners_set_updated_at
before update on public.encuentros_model_owners
for each row execute procedure public.handle_updated_at();

alter table public.encuentros_model_owners enable row level security;

drop policy if exists "encuentros model owners self read" on public.encuentros_model_owners;
create policy "encuentros model owners self read"
on public.encuentros_model_owners
for select
to authenticated
using (profile_id = auth.uid() or public.is_admin());

drop policy if exists "encuentros model owners admin write" on public.encuentros_model_owners;
create policy "encuentros model owners admin write"
on public.encuentros_model_owners
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
