-- v9 (appliquée le 13 nov. 2026). Un import entier ne compte plus que pour 1 appel dans la limite du jour.
alter table public.import_jobs add column if not exists counted boolean not null default false;
create or replace function public.ai_usage_bump(p_user uuid, p_day date, p_in int, p_out int)
returns int language plpgsql security definer set search_path = public as $$
declare v_job uuid; v_add int := 1; v_calls int;
begin
  select id into v_job from public.import_jobs
   where user_id = p_user and (status = 'running' or (status = 'done' and stage = 'verify')) and updated_at > now() - interval '10 minutes'
   order by created_at desc limit 1;
  if v_job is not null then
    update public.import_jobs set counted = true where id = v_job and counted = false;
    if not found then v_add := 0; end if;
  end if;
  insert into public.ai_usage as u (user_id, day, calls, tokens_in, tokens_out)
  values (p_user, p_day, v_add, p_in, p_out)
  on conflict (user_id, day) do update
    set calls = u.calls + v_add, tokens_in = u.tokens_in + excluded.tokens_in, tokens_out = u.tokens_out + excluded.tokens_out
  returning calls into v_calls;
  return v_calls;
end $$;
revoke all on function public.ai_usage_bump(uuid, date, int, int) from public, anon, authenticated;
grant execute on function public.ai_usage_bump(uuid, date, int, int) to service_role;
