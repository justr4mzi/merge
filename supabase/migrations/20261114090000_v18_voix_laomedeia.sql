-- v18 (appliquée le 14 nov. 2026). Voix Laomedeia : fichiers audio gardés dans le compartiment privé « voix »
-- (une même phrase n'est jamais payée deux fois) et compteur de caractères du mois pour rester dans le gratuit.
insert into storage.buckets (id, name, public) values ('voix', 'voix', false) on conflict (id) do nothing;
create table if not exists public.tts_usage (
  month text primary key,
  chars bigint not null default 0,
  files integer not null default 0
);
alter table public.tts_usage enable row level security;
create or replace function public.tts_usage_bump(p_month text, p_chars integer)
returns bigint language sql security definer set search_path = public as $$
  insert into public.tts_usage(month, chars, files) values (p_month, greatest(p_chars, 0), 1)
    on conflict (month) do update set chars = public.tts_usage.chars + excluded.chars, files = public.tts_usage.files + 1
  returning chars;
$$;
revoke all on function public.tts_usage_bump(text, integer) from public, anon, authenticated;
grant execute on function public.tts_usage_bump(text, integer) to service_role;
