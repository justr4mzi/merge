-- v12 (appliquée le 14 nov. 2026, nuit). Couleur facultative pour les chapitres et les dossiers. Aucune donnée supprimée.
alter table public.chapters add column if not exists color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
alter table public.groups add column if not exists color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$');
