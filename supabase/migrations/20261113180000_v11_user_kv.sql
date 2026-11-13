-- v11 (appliquée le 13 nov. 2026). Contenus personnels synchronisés entre les appareils d'un même compte.
create table if not exists public.user_kv (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null check (char_length(key) <= 120),
  value text not null check (char_length(value) <= 200000),
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_kv enable row level security;
create policy "user_kv_select_own" on public.user_kv for select to authenticated using (user_id = (select auth.uid()));
create policy "user_kv_insert_own" on public.user_kv for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_kv_update_own" on public.user_kv for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
