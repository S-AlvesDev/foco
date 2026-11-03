-- =====================================================================
-- FOCO AÍ — Etapa 2: funções de apoio às matérias
-- Todas são security invoker: o RLS de subjects/study_sessions se aplica.
-- =====================================================================

-- Reordena as matérias do usuário na ordem do array (posição 0, 1, 2…).
-- Ids de outras pessoas são ignorados pelo filtro e pelo RLS.
create or replace function public.reorder_subjects(p_ids uuid[])
returns void language sql security invoker set search_path = '' as $$
  update public.subjects s
     set position = o.ord - 1
    from unnest(p_ids) with ordinality as o(id, ord)
   where s.id = o.id
     and s.user_id = (select auth.uid());
$$;

-- Totais de estudo por matéria (todo o histórico).
create or replace function public.my_subject_totals()
returns table (subject_id uuid, seconds bigint, sessions bigint, last_date date)
language sql stable security invoker set search_path = '' as $$
  select s.subject_id, sum(s.duration_seconds)::bigint, count(*)::bigint, max(s.session_date)
    from public.study_sessions s
   where s.user_id = (select auth.uid())
   group by s.subject_id;
$$;

-- O que será afetado ao excluir uma matéria (mostrado na confirmação).
create or replace function public.subject_usage(p_subject_id uuid)
returns table (sessions bigint, seconds bigint, notes bigint, reviews bigint, goals bigint)
language sql stable security invoker set search_path = '' as $$
  select
    (select count(*) from public.study_sessions where subject_id = p_subject_id and user_id = (select auth.uid())),
    (select coalesce(sum(duration_seconds), 0) from public.study_sessions
      where subject_id = p_subject_id and user_id = (select auth.uid()))::bigint,
    (select count(*) from public.study_notes where subject_id = p_subject_id and user_id = (select auth.uid())),
    (select count(*) from public.study_reviews where subject_id = p_subject_id and user_id = (select auth.uid())),
    (select count(*) from public.study_goals where subject_id = p_subject_id and user_id = (select auth.uid()));
$$;

revoke execute on function public.reorder_subjects(uuid[]), public.my_subject_totals(),
  public.subject_usage(uuid) from public, anon;
grant execute on function public.reorder_subjects(uuid[]), public.my_subject_totals(),
  public.subject_usage(uuid) to authenticated;
