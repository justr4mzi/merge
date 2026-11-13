-- FACULTATIF, pas encore appliqué. À coller dans l'éditeur SQL de Supabase si tu veux.
-- La fonction actuelle supprime déjà tout (le carnet d'erreurs et le cache partent avec les chapitres, par cascade).
-- Cette version garde en plus le compteur d'appels IA du jour, pour qu'on ne puisse pas remettre son quota à zéro
-- en supprimant ses données.

create or replace function public.delete_my_data()
 returns void language plpgsql security definer set search_path to ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from public.mistakes where user_id = uid;
  delete from public.ai_cache where user_id = uid;
  delete from public.quiz_results where user_id = uid;
  delete from public.quizzes where user_id = uid;
  delete from public.exams where user_id = uid;
  delete from public.cards where user_id = uid;
  delete from public.summaries where user_id = uid;
  delete from public.sources where user_id = uid;
  delete from public.chapters where user_id = uid;
  delete from public.groups where user_id = uid;
  delete from public.subjects where user_id = uid;
  delete from public.study_sessions where user_id = uid;
  delete from public.share_links where a_id = uid or b_id = uid;
  delete from public.push_subscriptions where user_id = uid;
  delete from public.ai_usage where user_id = uid and day < current_date;
  delete from public.profiles where user_id = uid;
end; $$;
