-- v20 : réglages des rappels (synchronisés sur tous les appareils) et suivi des nouveaux rappels.
-- Ajouts seulement : aucune donnée supprimée.
alter table public.profiles add column if not exists reminders_enabled boolean not null default true;
alter table public.profiles add column if not exists quiet_weekend boolean not null default false;
alter table public.profiles add column if not exists quiet_holidays boolean not null default false;
alter table public.profiles add column if not exists holiday_zone text not null default 'A';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_holiday_zone_check') then
    alter table public.profiles add constraint profiles_holiday_zone_check check (holiday_zone in ('A', 'B', 'C'));
  end if;
end $$;
-- Rappel de série (21 h) : au plus un par jour. « Bien joué » : au plus un par semaine.
alter table public.push_subscriptions add column if not exists last_streak_sent date;
alter table public.push_subscriptions add column if not exists last_praise_sent date;
