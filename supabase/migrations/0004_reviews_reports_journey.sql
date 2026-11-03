-- =====================================================================
-- FOCO AÍ — Etapas 7, 8 e 9: revisões, desempenho e Nossa Jornada
-- Pode ser rodado mais de uma vez (create or replace).
-- =====================================================================

-- Dia de hoje no fuso de uma pessoa (só a própria ou a do parceiro).
create or replace function public.local_today(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date
    from public.profiles p
   where p.id = p_user and (p_user = (select auth.uid()) or p_user = public.partner_id());
$$;

-- ---------------------------------------------------------------------
-- Etapa 7: revisões
-- ---------------------------------------------------------------------

-- Conclui (ou pula) uma revisão e, se pedido, agenda a próxima. Tudo numa transação.
create or replace function public.review_complete(
  p_id uuid, p_comment text default null, p_next_due date default null, p_skip boolean default false)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare r public.study_reviews; v_next uuid; v_today date := public.local_today((select auth.uid()));
begin
  select * into r from public.study_reviews where id = p_id and user_id = (select auth.uid()) for update;
  if not found then raise exception 'Revisão não encontrada.' using errcode = 'P0002'; end if;
  if r.status <> 'pending' then raise exception 'Esta revisão já foi concluída.' using errcode = 'P0001'; end if;
  if p_next_due is not null and p_next_due <= v_today then
    raise exception 'A próxima revisão precisa ser depois de hoje.' using errcode = '22023';
  end if;

  update public.study_reviews
     set status = case when p_skip then 'skipped'::public.review_status else 'done'::public.review_status end,
         completed_at = now(),
         comment = nullif(btrim(coalesce(p_comment, '')), '')
   where id = p_id;

  if p_next_due is not null then
    insert into public.study_reviews (subject_id, topic, note_id, session_id, previous_review_id, due_date, interval_days)
    values (r.subject_id, r.topic, r.note_id, r.session_id, r.id, p_next_due, p_next_due - v_today)
    returning id into v_next;
  end if;
  return v_next;
end $$;

-- Desfaz uma conclusão: volta a pendente e apaga a próxima revisão gerada (se ainda pendente).
create or replace function public.review_reopen(p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.study_reviews
   where previous_review_id = p_id and status = 'pending' and user_id = (select auth.uid());
  update public.study_reviews
     set status = 'pending', completed_at = null
   where id = p_id and user_id = (select auth.uid()) and status <> 'pending';
  if not found then raise exception 'Revisão não encontrada.' using errcode = 'P0002'; end if;
end $$;

-- ---------------------------------------------------------------------
-- Etapa 8: desempenho (agregados compactos, poucas linhas)
-- ---------------------------------------------------------------------

create or replace function public.my_daily_totals(p_from date, p_to date)
returns table (day date, seconds bigint, sessions bigint, questions bigint, correct bigint)
language sql stable security invoker set search_path = '' as $$
  select s.session_date, sum(s.duration_seconds)::bigint, count(*)::bigint,
         coalesce(sum(s.questions_answered), 0)::bigint,
         coalesce(sum(s.questions_correct) filter (where s.questions_answered is not null), 0)::bigint
    from public.study_sessions s
   where s.user_id = (select auth.uid())
     and s.session_date between p_from and p_to
     and p_to - p_from <= 1100
   group by 1;
$$;

create or replace function public.my_breakdown(p_from date, p_to date)
returns table (subject_id uuid, study_type public.study_type, seconds bigint, sessions bigint,
               questions bigint, correct bigint)
language sql stable security invoker set search_path = '' as $$
  select s.subject_id, s.study_type, sum(s.duration_seconds)::bigint, count(*)::bigint,
         coalesce(sum(s.questions_answered), 0)::bigint,
         coalesce(sum(s.questions_correct) filter (where s.questions_answered is not null), 0)::bigint
    from public.study_sessions s
   where s.user_id = (select auth.uid())
     and s.session_date between p_from and p_to
   group by 1, 2;
$$;

create or replace function public.my_monthly_totals()
returns table (month date, seconds bigint, sessions bigint, study_days bigint)
language sql stable security invoker set search_path = '' as $$
  select date_trunc('month', s.session_date)::date, sum(s.duration_seconds)::bigint, count(*)::bigint,
         count(distinct s.session_date)::bigint
    from public.study_sessions s
   where s.user_id = (select auth.uid())
   group by 1;
$$;

-- ---------------------------------------------------------------------
-- Etapa 9: conquistas
-- ---------------------------------------------------------------------

-- Registra as conquistas alcançadas (cada tipo uma vez), com o dia em que foram alcançadas.
create or replace function public.refresh_my_achievements()
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_tz text; v_count integer;
begin
  if v_uid is null then return 0; end if;
  select timezone into v_tz from public.profiles where id = v_uid;

  with days as (
    select session_date as d, sum(duration_seconds) as secs, coalesce(sum(questions_answered), 0) as q
      from public.study_sessions where user_id = v_uid group by 1
  ), cum as (
    select d, sum(secs) over (order by d) as secs, sum(q) over (order by d) as q from days
  ), runs as (
    select min(d) as s, count(*) as len from (
      select d, d - (row_number() over (order by d))::int as g from days) x group by g
  ), revs as (
    select (completed_at at time zone v_tz)::date as d,
           row_number() over (order by completed_at) as n
      from public.study_reviews where user_id = v_uid and status = 'done'
  ), hits as (
    select 'first_session' as kind, 'Primeira sessão' as title, (select min(d) from days) as on_day
    union all
    select 'streak_' || n, n || ' dias seguidos', (select min(s + (n - 1)) from runs where len >= n)
      from unnest(array[3, 7, 14, 30, 60, 100]) n
    union all
    select 'hours_' || n, n || ' horas de estudo', (select min(d) from cum where secs >= n * 3600)
      from unnest(array[10, 25, 50, 100, 250, 500, 1000]) n
    union all
    select 'questions_' || n, replace(to_char(n, 'FM999G999'), ',', '.') || ' questões resolvidas',
           (select min(d) from cum where q >= n)
      from unnest(array[100, 500, 1000, 5000]) n
    union all
    select 'reviews_' || n, n || ' revisões feitas', (select d from revs where revs.n = x.n)
      from unnest(array[10, 50, 100]) as x(n)
  )
  insert into public.achievements (user_id, kind, title, achieved_on)
  select v_uid, f.kind, f.title, f.on_day from hits f
   where f.on_day is not null
     and not exists (select 1 from public.achievements a where a.user_id = v_uid and a.kind = f.kind);
  get diagnostics v_count = row_count;
  return v_count;
end $$;

-- ---------------------------------------------------------------------
-- Etapa 9: Nossa Jornada — dados agregados que respeitam shared_settings
-- ---------------------------------------------------------------------

-- Sequência atual e recorde de cada membro (o próprio sempre; o outro se compartilha o tempo).
create or replace function public.couple_streaks()
returns table (user_id uuid, current_streak integer, best_streak integer)
language sql stable security definer set search_path = '' as $$
  with members as (
    select m.user_id from public.couple_members m
      join public.shared_settings ss on ss.couple_id = m.couple_id and ss.user_id = m.user_id
     where m.couple_id = public.my_couple_id()
       and (m.user_id = (select auth.uid()) or ss.share_study_time)
  ), days as (
    select distinct s.user_id, s.session_date as d
      from public.study_sessions s join members using (user_id)
  ), runs as (
    select user_id, max(d) as e, count(*)::int as len from (
      select user_id, d, d - (row_number() over (partition by user_id order by d))::int as g from days) x
     group by user_id, g
  )
  select m.user_id,
         coalesce((select r.len from runs r where r.user_id = m.user_id
                    and r.e >= public.local_today(m.user_id) - 1 order by r.e desc limit 1), 0),
         coalesce((select max(r.len) from runs r where r.user_id = m.user_id), 0)
    from members m;
$$;

-- Progresso das metas pessoais no período atual (o próprio sempre; o outro se compartilha metas).
-- O nome da matéria do outro só aparece se ele também compartilha as matérias.
create or replace function public.couple_goal_progress()
returns table (user_id uuid, goal_id uuid, period public.goal_period, metric public.goal_metric,
               target integer, subject_name text, has_subject boolean, value bigint)
language sql stable security definer set search_path = '' as $$
  with members as (
    select m.user_id, ss.share_subject_breakdown, p.week_starts_on, public.local_today(m.user_id) as today
      from public.couple_members m
      join public.shared_settings ss on ss.couple_id = m.couple_id and ss.user_id = m.user_id
      join public.profiles p on p.id = m.user_id
     where m.couple_id = public.my_couple_id()
       and (m.user_id = (select auth.uid()) or ss.share_goal_progress)
  ), goals as (
    select g.*, mb.share_subject_breakdown, mb.today,
           case g.period
             when 'daily' then mb.today
             when 'weekly' then mb.today - ((extract(dow from mb.today)::int - mb.week_starts_on + 7) % 7)
             else date_trunc('month', mb.today)::date
           end as starts
      from public.study_goals g join members mb on mb.user_id = g.user_id
     where g.is_active
  )
  select g.user_id, g.id, g.period, g.metric, g.target,
         case when g.user_id = (select auth.uid()) or g.share_subject_breakdown then sub.name end,
         g.subject_id is not null,
         coalesce((
           select case g.metric
                    when 'minutes' then sum(s.duration_seconds) / 60
                    when 'sessions' then count(*)
                    else coalesce(sum(s.questions_answered), 0)
                  end
             from public.study_sessions s
            where s.user_id = g.user_id
              and s.session_date between g.starts and g.today
              and (g.subject_id is null or s.subject_id = g.subject_id)
         ), 0)::bigint
    from goals g left join public.subjects sub on sub.id = g.subject_id;
$$;

-- Conquistas compartilhadas deixam de valer quando a pessoa sai do espaço (já tratado em couple_leave).

-- =====================================================================
-- Permissões
-- =====================================================================
revoke execute on function
  public.local_today(uuid),
  public.review_complete(uuid, text, date, boolean), public.review_reopen(uuid),
  public.my_daily_totals(date, date), public.my_breakdown(date, date), public.my_monthly_totals(),
  public.refresh_my_achievements(), public.couple_streaks(), public.couple_goal_progress()
from public, anon;

grant execute on function
  public.local_today(uuid),
  public.review_complete(uuid, text, date, boolean), public.review_reopen(uuid),
  public.my_daily_totals(date, date), public.my_breakdown(date, date), public.my_monthly_totals(),
  public.refresh_my_achievements(), public.couple_streaks(), public.couple_goal_progress()
to authenticated;
