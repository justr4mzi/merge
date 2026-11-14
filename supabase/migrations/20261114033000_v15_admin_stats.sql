-- v15 (appliquée le 14 nov. 2026, nuit). Chiffres par élève pour /admin, calculés en SQL (pas de limite de 1000 lignes). Réservé au service.
create or replace function public.admin_user_stats(p_day date, p_week date, p_month date)
returns table(user_id uuid, cards bigint, chapters bigint, ai_all bigint, ai_day bigint, t_day bigint, t_week bigint, t_month bigint, t_all bigint)
language sql stable security definer set search_path = public as $$
  with ids as (select id as user_id from auth.users)
  select i.user_id,
    (select count(*) from public.cards c where c.user_id = i.user_id),
    (select count(*) from public.chapters h where h.user_id = i.user_id and not h.archived),
    coalesce((select sum(calls) from public.ai_usage a where a.user_id = i.user_id), 0),
    coalesce((select sum(calls) from public.ai_usage a where a.user_id = i.user_id and a.day = p_day), 0),
    coalesce((select sum(seconds) from public.app_usage u where u.user_id = i.user_id and u.day = p_day), 0),
    coalesce((select sum(seconds) from public.app_usage u where u.user_id = i.user_id and u.day >= p_week), 0),
    coalesce((select sum(seconds) from public.app_usage u where u.user_id = i.user_id and u.day >= p_month), 0),
    coalesce((select sum(seconds) from public.app_usage u where u.user_id = i.user_id), 0)
  from ids i;
$$;
revoke all on function public.admin_user_stats(date, date, date) from public, anon, authenticated;
grant execute on function public.admin_user_stats(date, date, date) to service_role;
