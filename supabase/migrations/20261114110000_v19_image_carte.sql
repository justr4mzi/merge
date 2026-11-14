-- v19 (appliquée le 14 nov. 2026). Image ajoutée par l'élève sur une carte (chemin dans le stockage « cours »).
alter table public.cards add column if not exists picture text check (picture is null or char_length(picture) <= 300);
