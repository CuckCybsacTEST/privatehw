alter table public.encuentros_model_profiles
add column if not exists attendance_modes jsonb not null default '[]'::jsonb;

update public.encuentros_model_profiles p
set attendance_modes = coalesce(
  nullif(m.content->'profileAttendanceModes', 'null'::jsonb),
  nullif(m.content->'attendanceModes', 'null'::jsonb),
  '[]'::jsonb
)
from public.encuentros_models m
where m.id = p.model_id
  and (
    m.content ? 'profileAttendanceModes'
    or m.content ? 'attendanceModes'
  );
