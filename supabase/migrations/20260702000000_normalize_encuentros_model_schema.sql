create table if not exists public.encuentros_model_profiles (
  model_id uuid primary key references public.encuentros_models(id) on delete cascade,
  age integer check (age is null or age >= 18),
  city text,
  nationality text,
  top_badge text,
  avatar_url text,
  attendance_modes jsonb not null default '[]'::jsonb,
  voice_audio_url text,
  voice_audio_label text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.encuentros_model_booking (
  model_id uuid primary key references public.encuentros_models(id) on delete cascade,
  eyebrow text,
  title text,
  description text,
  gallery_title text,
  gallery_subtitle text,
  gallery_exclusive_title text,
  gallery_exclusive_description text,
  gallery_exclusive_hint text,
  price_label text,
  price_amount integer,
  advance_label text,
  advance_amount integer,
  recording_discount_percent numeric(5, 2) not null default 0,
  recording_discount_label text,
  recording_prompt_title text,
  recording_prompt_description text,
  recording_yes_label text,
  recording_no_label text,
  currency text,
  duration_minutes integer,
  available_dates jsonb not null default '[]'::jsonb,
  booking_start_time text,
  booking_end_time text,
  slot_interval_minutes integer,
  availability_mode text not null default 'everyday' check (availability_mode in ('everyday', 'manual')),
  available_days integer,
  payment_methods jsonb not null default '[]'::jsonb,
  login_note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.encuentros_model_social_links (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.encuentros_models(id) on delete cascade,
  network text not null,
  label text,
  url text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.encuentros_model_media (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.encuentros_models(id) on delete cascade,
  kind text not null check (kind in ('image', 'audio', 'video')),
  slot text not null default 'gallery' check (slot in ('cover', 'gallery', 'top', 'bottom', 'voice')),
  url text not null,
  alt_text text,
  caption text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists encuentros_model_social_links_model_id_idx
  on public.encuentros_model_social_links (model_id, sort_order asc);

create index if not exists encuentros_model_media_model_id_idx
  on public.encuentros_model_media (model_id, slot, sort_order asc);

alter table public.encuentros_model_profiles enable row level security;
alter table public.encuentros_model_booking enable row level security;
alter table public.encuentros_model_social_links enable row level security;
alter table public.encuentros_model_media enable row level security;

drop trigger if exists encuentros_model_profiles_set_updated_at on public.encuentros_model_profiles;
create trigger encuentros_model_profiles_set_updated_at
before update on public.encuentros_model_profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists encuentros_model_booking_set_updated_at on public.encuentros_model_booking;
create trigger encuentros_model_booking_set_updated_at
before update on public.encuentros_model_booking
for each row execute procedure public.handle_updated_at();

drop trigger if exists encuentros_model_social_links_set_updated_at on public.encuentros_model_social_links;
create trigger encuentros_model_social_links_set_updated_at
before update on public.encuentros_model_social_links
for each row execute procedure public.handle_updated_at();

drop trigger if exists encuentros_model_media_set_updated_at on public.encuentros_model_media;
create trigger encuentros_model_media_set_updated_at
before update on public.encuentros_model_media
for each row execute procedure public.handle_updated_at();

drop policy if exists "encuentros model profiles public read" on public.encuentros_model_profiles;
create policy "encuentros model profiles public read"
on public.encuentros_model_profiles
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

drop policy if exists "encuentros model profiles admin write" on public.encuentros_model_profiles;
create policy "encuentros model profiles admin write"
on public.encuentros_model_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "encuentros model booking public read" on public.encuentros_model_booking;
create policy "encuentros model booking public read"
on public.encuentros_model_booking
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

drop policy if exists "encuentros model booking admin write" on public.encuentros_model_booking;
create policy "encuentros model booking admin write"
on public.encuentros_model_booking
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "encuentros model social links public read" on public.encuentros_model_social_links;
create policy "encuentros model social links public read"
on public.encuentros_model_social_links
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

drop policy if exists "encuentros model social links admin write" on public.encuentros_model_social_links;
create policy "encuentros model social links admin write"
on public.encuentros_model_social_links
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "encuentros model media public read" on public.encuentros_model_media;
create policy "encuentros model media public read"
on public.encuentros_model_media
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

drop policy if exists "encuentros model media admin write" on public.encuentros_model_media;
create policy "encuentros model media admin write"
on public.encuentros_model_media
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into public.encuentros_model_profiles (model_id, age, city, nationality, top_badge, avatar_url, attendance_modes, voice_audio_url, voice_audio_label)
select
  m.id,
  nullif(m.content->>'profileAge', '')::integer,
  nullif(coalesce(m.content->>'profileCity', m.content->>'profileLocation', m.content->>'city', ''), ''),
  nullif(coalesce(m.content->>'profileNationality', m.content->>'nationality', m.content->>'country', ''), ''),
  nullif(coalesce(m.content->>'profileTopBadge', m.content->>'topBadge', m.content->>'badgeTop', ''), ''),
  nullif(coalesce(m.content->>'profileAvatarUrl', m.content->>'avatarUrl', m.content->>'profilePhotoUrl', ''), ''),
  coalesce(m.content->'profileAttendanceModes', m.content->'attendanceModes', '[]'::jsonb),
  nullif(coalesce(m.content->>'profileVoiceAudioUrl', m.content->>'voiceAudioUrl', ''), ''),
  nullif(coalesce(m.content->>'profileVoiceAudioLabel', m.content->>'voiceAudioLabel', ''), '')
from public.encuentros_models m
on conflict (model_id) do update set
  age = excluded.age,
  city = excluded.city,
  nationality = excluded.nationality,
  top_badge = excluded.top_badge,
  avatar_url = excluded.avatar_url,
  attendance_modes = excluded.attendance_modes,
  voice_audio_url = excluded.voice_audio_url,
  voice_audio_label = excluded.voice_audio_label,
  updated_at = timezone('utc', now());

insert into public.encuentros_model_booking (
  model_id,
  eyebrow,
  title,
  description,
  gallery_title,
  gallery_subtitle,
  gallery_exclusive_title,
  gallery_exclusive_description,
  gallery_exclusive_hint,
  price_label,
  price_amount,
  advance_label,
  advance_amount,
  recording_discount_percent,
  recording_discount_label,
  recording_prompt_title,
  recording_prompt_description,
  recording_yes_label,
  recording_no_label,
  currency,
  duration_minutes,
  available_dates,
  booking_start_time,
  booking_end_time,
  slot_interval_minutes,
  availability_mode,
  available_days,
  payment_methods,
  login_note
)
select
  m.id,
  nullif(m.content->'encuentrosBooking'->>'eyebrow', ''),
  nullif(m.content->'encuentrosBooking'->>'title', ''),
  nullif(m.content->'encuentrosBooking'->>'description', ''),
  nullif(m.content->'encuentrosBooking'->>'galleryTitle', ''),
  nullif(m.content->'encuentrosBooking'->>'gallerySubtitle', ''),
  nullif(m.content->'encuentrosBooking'->>'galleryExclusiveTitle', ''),
  nullif(m.content->'encuentrosBooking'->>'galleryExclusiveDescription', ''),
  nullif(m.content->'encuentrosBooking'->>'galleryExclusiveHint', ''),
  nullif(m.content->'encuentrosBooking'->>'priceLabel', ''),
  nullif(m.content->'encuentrosBooking'->>'priceAmount', '')::integer,
  nullif(m.content->'encuentrosBooking'->>'advanceLabel', ''),
  nullif(m.content->'encuentrosBooking'->>'advanceAmount', '')::integer,
  coalesce((m.content->'encuentrosBooking'->>'recordingDiscountPercent')::numeric, 0),
  nullif(m.content->'encuentrosBooking'->>'recordingDiscountLabel', ''),
  nullif(m.content->'encuentrosBooking'->>'recordingPromptTitle', ''),
  nullif(m.content->'encuentrosBooking'->>'recordingPromptDescription', ''),
  nullif(m.content->'encuentrosBooking'->>'recordingYesLabel', ''),
  nullif(m.content->'encuentrosBooking'->>'recordingNoLabel', ''),
  nullif(m.content->'encuentrosBooking'->>'currency', ''),
  nullif(m.content->'encuentrosBooking'->>'durationMinutes', '')::integer,
  coalesce(m.content->'encuentrosBooking'->'availableDates', '[]'::jsonb),
  nullif(m.content->'encuentrosBooking'->>'bookingStartTime', ''),
  nullif(m.content->'encuentrosBooking'->>'bookingEndTime', ''),
  nullif(m.content->'encuentrosBooking'->>'slotIntervalMinutes', '')::integer,
  coalesce(nullif(m.content->'encuentrosBooking'->>'availabilityMode', ''), 'everyday'),
  nullif(m.content->'encuentrosBooking'->>'availableDays', '')::integer,
  coalesce(m.content->'encuentrosBooking'->'paymentMethods', '[]'::jsonb),
  nullif(m.content->'encuentrosBooking'->>'loginNote', '')
from public.encuentros_models m
on conflict (model_id) do update set
  eyebrow = excluded.eyebrow,
  title = excluded.title,
  description = excluded.description,
  gallery_title = excluded.gallery_title,
  gallery_subtitle = excluded.gallery_subtitle,
  gallery_exclusive_title = excluded.gallery_exclusive_title,
  gallery_exclusive_description = excluded.gallery_exclusive_description,
  gallery_exclusive_hint = excluded.gallery_exclusive_hint,
  price_label = excluded.price_label,
  price_amount = excluded.price_amount,
  advance_label = excluded.advance_label,
  advance_amount = excluded.advance_amount,
  recording_discount_percent = excluded.recording_discount_percent,
  recording_discount_label = excluded.recording_discount_label,
  recording_prompt_title = excluded.recording_prompt_title,
  recording_prompt_description = excluded.recording_prompt_description,
  recording_yes_label = excluded.recording_yes_label,
  recording_no_label = excluded.recording_no_label,
  currency = excluded.currency,
  duration_minutes = excluded.duration_minutes,
  available_dates = excluded.available_dates,
  booking_start_time = excluded.booking_start_time,
  booking_end_time = excluded.booking_end_time,
  slot_interval_minutes = excluded.slot_interval_minutes,
  availability_mode = excluded.availability_mode,
  available_days = excluded.available_days,
  payment_methods = excluded.payment_methods,
  login_note = excluded.login_note,
  updated_at = timezone('utc', now());

delete from public.encuentros_model_social_links
where model_id in (select id from public.encuentros_models);

insert into public.encuentros_model_social_links (
  model_id,
  network,
  label,
  url,
  sort_order,
  active
)
select
  m.id,
  nullif(coalesce(link->>'network', link->>'label', link->>'value', ''), ''),
  nullif(coalesce(link->>'label', link->>'network', link->>'value', ''), ''),
  nullif(coalesce(link->>'url', link->>'href', ''), ''),
  ordinality - 1,
  coalesce(nullif(link->>'active', '')::boolean, true)
from public.encuentros_models m
cross join lateral jsonb_array_elements(
  coalesce(m.content->'socialLinks', m.content->'profileSocialLinks', '[]'::jsonb)
) with ordinality as links(link, ordinality)
where coalesce(link->>'url', link->>'href', '') <> ''
   or coalesce(link->>'network', link->>'label', link->>'value', '') <> '';

delete from public.encuentros_model_media
where model_id in (select id from public.encuentros_models);

insert into public.encuentros_model_media (
  model_id,
  kind,
  slot,
  url,
  alt_text,
  caption,
  sort_order,
  active
)
select
  m.id,
  'image',
  pool.slot,
  nullif(
    coalesce(
      case
        when jsonb_typeof(item) = 'string' then trim(both '"' from item::text)
        else null
      end,
      item->>'src',
      item->>'image',
      item->>'url',
      item->>'value',
      ''
    ),
    ''
  ),
  nullif(coalesce(item->>'alt', item->>'caption', item->>'title', ''), ''),
  nullif(coalesce(item->>'caption', item->>'title', ''), ''),
  ordinality - 1,
  true
from public.encuentros_models m
cross join lateral (
  values
    ('gallery', coalesce(m.content->'profileGalleryImages', m.content->'galleryImages', '[]'::jsonb)),
    ('top', coalesce(m.content->'topCarouselImages', '[]'::jsonb)),
    ('bottom', coalesce(m.content->'bottomCarouselImages', '[]'::jsonb))
) as pool(slot, items)
cross join lateral jsonb_array_elements(pool.items) with ordinality as media_items(item, ordinality)
where nullif(
  coalesce(
    case
      when jsonb_typeof(item) = 'string' then trim(both '"' from item::text)
      else null
    end,
    item->>'src',
    item->>'image',
    item->>'url',
    item->>'value',
    ''
  ),
  ''
) is not null;

insert into public.encuentros_model_media (
  model_id,
  kind,
  slot,
  url,
  alt_text,
  caption,
  sort_order,
  active
)
select
  m.id,
  'audio',
  'voice',
  nullif(coalesce(m.content->>'profileVoiceAudioUrl', m.content->>'voiceAudioUrl', ''), ''),
  nullif(coalesce(m.content->>'profileVoiceAudioLabel', m.content->>'voiceAudioLabel', ''), ''),
  nullif(coalesce(m.content->>'profileVoiceAudioLabel', m.content->>'voiceAudioLabel', ''), ''),
  0,
  true
from public.encuentros_models m
where nullif(coalesce(m.content->>'profileVoiceAudioUrl', m.content->>'voiceAudioUrl', ''), '') is not null;
