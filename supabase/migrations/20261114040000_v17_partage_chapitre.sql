-- v17 (appliquée le 14 nov. 2026, nuit). Partage d'un chapitre par lien : un invité, même sans compte, révise ce qui existe déjà.
create table if not exists public.chapter_shares (
  chapter_id uuid primary key references public.chapters(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.chapter_shares enable row level security;
create policy "chapter_shares_select_own" on public.chapter_shares for select to authenticated using (user_id = (select auth.uid()));
create or replace function public.share_chapter(p_chapter uuid, p_renew boolean default false)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare t text;
begin
  if not exists (select 1 from public.chapters where id = p_chapter and user_id = auth.uid()) then raise exception 'chapitre introuvable'; end if;
  t := translate(encode(gen_random_bytes(18), 'base64'), '+/=', '-_');
  insert into public.chapter_shares(chapter_id, user_id, token, active) values (p_chapter, auth.uid(), t, true)
    on conflict (chapter_id) do update set token = case when p_renew then excluded.token else public.chapter_shares.token end, active = true;
  select token into t from public.chapter_shares where chapter_id = p_chapter;
  return t;
end $$;
create or replace function public.unshare_chapter(p_chapter uuid)
returns void language sql security definer set search_path = public as $$
  update public.chapter_shares set active = false where chapter_id = p_chapter and user_id = auth.uid();
$$;
create or replace function public.get_shared_chapter(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'name', c.name,
    'subject', (select s.name from public.subjects s where s.id = c.subject_id),
    'cards', coalesce((select jsonb_agg(jsonb_build_object('front', k.front, 'back', k.back) order by k.created_at) from public.cards k where k.chapter_id = c.id), '[]'::jsonb),
    'summary', (select m.markdown from public.summaries m where m.chapter_id = c.id),
    'content', coalesce((select jsonb_object_agg(a.kind, a.content) from public.ai_cache a where a.chapter_id = c.id and a.kind in ('quiz', 'fiche', 'mindmap', 'cloze', 'interro')), '{}'::jsonb))
  from public.chapter_shares sh join public.chapters c on c.id = sh.chapter_id
  where sh.token = p_token and sh.active and length(p_token) >= 20 and not c.archived;
$$;
revoke all on function public.share_chapter(uuid, boolean) from public, anon;
revoke all on function public.unshare_chapter(uuid) from public, anon;
grant execute on function public.share_chapter(uuid, boolean) to authenticated;
grant execute on function public.unshare_chapter(uuid) to authenticated;
grant execute on function public.get_shared_chapter(text) to anon, authenticated;
