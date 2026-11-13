-- v7 (appliquée le 13 nov. 2026). Aucune suppression de données.
-- 1) Compteur d'appels IA incrémenté de façon atomique : les lots de photos partent en parallèle.
create or replace function public.ai_usage_bump(p_user uuid, p_day date, p_in int, p_out int)
returns int language sql security definer set search_path = public as $$
  insert into public.ai_usage as u (user_id, day, calls, tokens_in, tokens_out)
  values (p_user, p_day, 1, p_in, p_out)
  on conflict (user_id, day) do update
    set calls = u.calls + 1, tokens_in = u.tokens_in + excluded.tokens_in, tokens_out = u.tokens_out + excluded.tokens_out
  returning calls;
$$;
revoke all on function public.ai_usage_bump(uuid, date, int, int) from public, anon, authenticated;
grant execute on function public.ai_usage_bump(uuid, date, int, int) to service_role;

-- 2) Noms de matières déjà créés par les élèves d'une classe, proposés à tous à l'inscription.
--    Ne renvoie que des noms et un nombre d'élèves, jamais qui les a créés.
create or replace function public.shared_subject_names(p_classe text)
returns table(name text, uses bigint) language sql stable security definer set search_path = public as $$
  select min(btrim(s.name)) as name, count(distinct s.user_id) as uses
  from public.subjects s join public.profiles p on p.user_id = s.user_id
  where auth.uid() is not null and char_length(btrim(s.name)) between 2 and 40
    and (p_classe is null or p.classe = p_classe)
  group by lower(btrim(s.name)) order by uses desc, name limit 30;
$$;
revoke all on function public.shared_subject_names(text) from public, anon;
grant execute on function public.shared_subject_names(text) to authenticated;
