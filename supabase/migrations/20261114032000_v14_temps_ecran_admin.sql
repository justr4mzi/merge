-- v14 (appliquée le 14 nov. 2026, nuit). Temps d'écran par jour et dernière connexion, pour le tableau de bord /admin.
-- Le mot de passe admin n'est pas ici : son empreinte SHA-256 est dans app_secrets (name = 'admin_pw_sha256').
create table if not exists public.app_usage (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  seconds integer not null default 0 check (seconds >= 0),
  primary key (user_id, day)
);
alter table public.app_usage enable row level security;
create policy "app_usage_select_own" on public.app_usage for select to authenticated using (user_id = (select auth.uid()));
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists last_seen_place text check (last_seen_place is null or char_length(last_seen_place) <= 120);
create or replace function public.track_usage(p_day date, p_seconds integer, p_place text)
returns void language plpgsql security definer set search_path = public as $$
declare s integer := least(greatest(coalesce(p_seconds, 0), 0), 120);
begin
  if auth.uid() is null then return; end if;
  if p_day is null or p_day < current_date - 2 or p_day > current_date + 1 then p_day := current_date; end if;
  insert into public.app_usage(user_id, day, seconds) values (auth.uid(), p_day, s)
    on conflict (user_id, day) do update set seconds = public.app_usage.seconds + excluded.seconds;
  update public.profiles set last_seen_at = now(), last_seen_place = left(coalesce(p_place, ''), 120) where user_id = auth.uid();
end $$;
revoke all on function public.track_usage(date, integer, text) from public, anon;
grant execute on function public.track_usage(date, integer, text) to authenticated;
