-- v8 (appliquée le 13 nov. 2026). Imports faits côté serveur : le travail continue même si l'élève ferme l'appli.
create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  status text not null default 'running',
  stage text not null default 'img',
  progress smallint not null default 0,
  message text,
  payload jsonb,
  state jsonb,
  result jsonb,
  error text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists import_jobs_user_idx on public.import_jobs(user_id, created_at desc);
alter table public.import_jobs enable row level security;
create policy "import_jobs_select_own" on public.import_jobs for select to authenticated using (user_id = (select auth.uid()));
create policy "import_jobs_delete_own" on public.import_jobs for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.import_jobs from anon, authenticated;
