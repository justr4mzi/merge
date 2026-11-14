-- Corbeille 30 jours (PAS ENCORE APPLIQUÉE : la fenêtre de confirmation Supabase n'a pas eu de réponse le 14 nov. à 3 h).
-- À coller dans l'éditeur SQL de Supabase. Ajoute des colonnes et une table ; la fonction purge_my_trash supprime
-- seulement ce qui est dans la corbeille depuis plus de 30 jours.
alter table public.subjects add column if not exists deleted_at timestamptz;
alter table public.chapters add column if not exists deleted_at timestamptz;
create table if not exists public.card_trash (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  card_id uuid not null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  payload jsonb not null,
  deleted_at timestamptz not null default now()
);
alter table public.card_trash enable row level security;
create policy "card_trash_select_own" on public.card_trash for select to authenticated using (user_id = (select auth.uid()));
create policy "card_trash_insert_own" on public.card_trash for insert to authenticated with check (user_id = (select auth.uid()));
create policy "card_trash_delete_own" on public.card_trash for delete to authenticated using (user_id = (select auth.uid()));
create index if not exists card_trash_user_idx on public.card_trash(user_id, deleted_at);
create or replace function public.purge_my_trash()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  delete from public.card_trash where user_id = auth.uid() and deleted_at < now() - interval '30 days';
  delete from public.chapters where user_id = auth.uid() and deleted_at is not null and deleted_at < now() - interval '30 days';
  delete from public.subjects where user_id = auth.uid() and deleted_at is not null and deleted_at < now() - interval '30 days';
end $$;
revoke all on function public.purge_my_trash() from public, anon;
grant execute on function public.purge_my_trash() to authenticated;
