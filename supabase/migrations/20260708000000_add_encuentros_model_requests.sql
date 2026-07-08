begin;

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

create index if not exists encuentros_model_requests_status_created_at_idx
  on public.encuentros_model_requests (status, created_at desc);

create index if not exists encuentros_model_requests_model_id_idx
  on public.encuentros_model_requests (model_id);

drop trigger if exists encuentros_model_requests_set_updated_at on public.encuentros_model_requests;
create trigger encuentros_model_requests_set_updated_at
before update on public.encuentros_model_requests
for each row execute procedure public.handle_updated_at();

commit;
