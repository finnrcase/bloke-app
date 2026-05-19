alter table public.profiles
add column if not exists appearance text default 'dark'
check (appearance in ('dark', 'light', 'system'));

update public.profiles
set language = 'en'
where language is null;

update public.profiles
set appearance = 'dark'
where appearance is null;
