create or replace function public.get_my_profile()
returns table (
  id uuid,
  email text,
  username text,
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
    p.username,
    p.display_name,
    p.stripe_customer_id,
    p.role,
    p.status
  from public.profiles p
  where p.id = auth.uid()
  limit 1;
$profile$;
