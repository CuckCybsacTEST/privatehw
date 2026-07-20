begin;

alter table public.encuentros_model_profiles
  add column if not exists hair_color text,
  add column if not exists body_type text,
  add column if not exists hair_type text;

alter table public.encuentros_model_requests
  add column if not exists hair_color text,
  add column if not exists body_type text,
  add column if not exists hair_type text;

update public.encuentros_model_profiles p
set
  hair_color = coalesce(
    nullif(p.hair_color, ''),
    nullif(m.content->>'profileHairColor', ''),
    nullif(m.content->>'hairColor', ''),
    nullif(m.content->>'profileHairTone', '')
  ),
  body_type = coalesce(
    nullif(p.body_type, ''),
    nullif(m.content->>'profileBodyType', ''),
    nullif(m.content->>'bodyType', '')
  ),
  hair_type = coalesce(
    nullif(p.hair_type, ''),
    nullif(m.content->>'profileHairType', ''),
    nullif(m.content->>'hairType', '')
  )
from public.encuentros_models m
where m.id = p.model_id;

commit;
