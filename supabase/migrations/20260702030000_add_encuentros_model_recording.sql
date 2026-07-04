create table if not exists public.encuentros_model_recording (
  model_id uuid primary key references public.encuentros_models(id) on delete cascade,
  records_encounters boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.encuentros_model_recording enable row level security;

drop trigger if exists encuentros_model_recording_set_updated_at on public.encuentros_model_recording;
create trigger encuentros_model_recording_set_updated_at
before update on public.encuentros_model_recording
for each row execute procedure public.handle_updated_at();

drop policy if exists "encuentros model recording public read" on public.encuentros_model_recording;
create policy "encuentros model recording public read"
on public.encuentros_model_recording
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.encuentros_models m
    where m.id = model_id
      and m.status = 'published'
      and m.deleted_at is null
  )
  or public.is_admin()
);

drop policy if exists "encuentros model recording admin write" on public.encuentros_model_recording;
create policy "encuentros model recording admin write"
on public.encuentros_model_recording
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.encuentros_model_recording (model_id, records_encounters)
select
  m.id,
  coalesce(
    nullif(m.content->>'recordsEncounters', '')::boolean,
    nullif(m.content->>'recordingEnabled', '')::boolean,
    nullif(m.content->'encuentrosRecording'->>'enabled', '')::boolean,
    nullif(m.content->'encuentrosRecording'->>'recordsEncounters', '')::boolean,
    false
  )
from public.encuentros_models m
on conflict (model_id) do update set
  records_encounters = excluded.records_encounters,
  updated_at = timezone('utc', now());
