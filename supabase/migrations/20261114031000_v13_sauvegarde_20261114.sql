-- v13 (appliquée le 14 nov. 2026, nuit). Sauvegarde des tables principales avant les modifications de la nuit.
-- Copie dans un schéma à part, invisible pour l'appli (aucun droit pour anon ou authenticated). Rien n'est supprimé.
create schema if not exists sauvegarde_20261114;
revoke all on schema sauvegarde_20261114 from anon, authenticated;
create table if not exists sauvegarde_20261114.profiles as select * from public.profiles;
create table if not exists sauvegarde_20261114.subjects as select * from public.subjects;
create table if not exists sauvegarde_20261114.groups as select * from public.groups;
create table if not exists sauvegarde_20261114.chapters as select * from public.chapters;
create table if not exists sauvegarde_20261114.cards as select * from public.cards;
create table if not exists sauvegarde_20261114.sources as select * from public.sources;
create table if not exists sauvegarde_20261114.summaries as select * from public.summaries;
create table if not exists sauvegarde_20261114.study_sessions as select * from public.study_sessions;
create table if not exists sauvegarde_20261114.ai_cache as select * from public.ai_cache;
create table if not exists sauvegarde_20261114.mistakes as select * from public.mistakes;
create table if not exists sauvegarde_20261114.user_kv as select * from public.user_kv;
create table if not exists sauvegarde_20261114.ai_usage as select * from public.ai_usage;
