alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_idx
on public.profiles (username)
where username is not null;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();
