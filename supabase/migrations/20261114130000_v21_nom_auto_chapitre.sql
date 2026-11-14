-- v21 : nom de chapitre choisi automatiquement d'après le cours importé (case à cocher à la création).
-- Ajout seulement : aucune donnée supprimée. false = nom écrit par l'élève (tous les chapitres existants).
alter table public.chapters add column if not exists auto_name boolean not null default false;
