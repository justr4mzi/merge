-- Merge v6 : sous-dossiers, révision libre, cache des contenus générés, carnet d'erreurs, mnémotechniques.
-- Migration additive : aucune colonne ni donnée supprimée. APPLIQUÉE le 13 nov. 2026 (v6a + v6b).

alter table public.subjects add column if not exists free_revision boolean not null default false;

create index if not exists groups_subject_idx on public.groups (subject_id);
create index if not exists chapters_group_idx on public.chapters (group_id);

alter table public.cards add column if not exists mastered boolean not null default false;
alter table public.cards add column if not exists mnemonic text;

-- Cache de tout ce que l'IA génère pour un chapitre : un seul appel par (chapitre, type).
create table if not exists public.ai_cache (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 40),
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (chapter_id, kind)
);
alter table public.ai_cache enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ai_cache' and policyname = 'ai_cache_own') then
    create policy ai_cache_own on public.ai_cache for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
end $$;
create index if not exists ai_cache_user_idx on public.ai_cache (user_id);

-- Carnet d'erreurs.
create table if not exists public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  card_id uuid references public.cards (id) on delete set null,
  mode text not null default 'cartes',
  question text not null,
  expected text not null,
  given text,
  explanation text,
  times integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mistakes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'mistakes' and policyname = 'mistakes_own') then
    create policy mistakes_own on public.mistakes for all to authenticated
      using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
  end if;
end $$;
create index if not exists mistakes_user_idx on public.mistakes (user_id, updated_at desc);
create index if not exists mistakes_chapter_idx on public.mistakes (chapter_id);
create index if not exists mistakes_card_idx on public.mistakes (card_id);

-- Maîtrise partagée en Duo : même règle que dans l'appli (part des cartes réussies).
create or replace function public.partner_stats(partner uuid)
 returns table(mastery integer, quiz_avg numeric, best_exam numeric)
 language sql stable security definer set search_path to ''
as $$
  select
    (select coalesce(round(avg(case when c.mastered then 1 else 0 end) * 100), 0)::int
       from public.cards c join public.chapters ch on ch.id = c.chapter_id
      where c.user_id = partner and ch.archived = false),
    (select round(avg(r.score), 1) from public.quiz_results r where r.user_id = partner),
    (select max(e.best_score) from public.exams e where e.user_id = partner)
  where public.shares_stats_with(partner);
$$;
