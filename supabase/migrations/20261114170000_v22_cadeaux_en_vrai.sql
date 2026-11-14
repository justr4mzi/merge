-- v22 : cadeaux en vrai de la boutique (gros bisou, Milky Way, Reese's, massage, Tasty Crousty, pizza, cinéma, surprise), seulement pour les comptes activés par l'admin.
-- Ajouts seulement : aucune donnée supprimée.
create table if not exists public.gift_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.gift_access enable row level security;
drop policy if exists "gift_access: lire le sien" on public.gift_access;
create policy "gift_access: lire le sien" on public.gift_access for select to authenticated using (user_id = auth.uid());
-- Pas de droit d'écriture pour les élèves : seul l'admin (clé de service) active ou retire l'accès.

create table if not exists public.gift_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  gift text not null check (gift in ('bisou', 'milkyway', 'reeses', 'massage', 'tasty', 'pizza', 'cinema', 'surprise')),
  price integer not null check (price > 0),
  created_at timestamptz not null default now(),
  given_at timestamptz
);
alter table public.gift_claims enable row level security;
drop policy if exists "gift_claims: lire les siens" on public.gift_claims;
create policy "gift_claims: lire les siens" on public.gift_claims for select to authenticated using (user_id = auth.uid());
drop policy if exists "gift_claims: demander si autorisé" on public.gift_claims;
create policy "gift_claims: demander si autorisé" on public.gift_claims for insert to authenticated
  with check (user_id = auth.uid() and given_at is null and exists (select 1 from public.gift_access a where a.user_id = auth.uid()));
create index if not exists gift_claims_user on public.gift_claims (user_id, created_at desc);
