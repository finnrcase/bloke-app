-- Auto-create a profiles row when an auth user is created, so the app never
-- depends on the onboarding upsert to provision the row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, onboarding_complete)
  values (new.id, 'participant', false)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
