-- =====================================================================
-- MISSÃO ALPHA-01 — App instalável: notificações, push e registros offline
--
-- * notifications: central de notificações (o sino). Cada pessoa só vê e mexe
--   nas próprias; só funções do banco criam notificações.
-- * notification_prefs: categorias e horários escolhidos por pessoa.
-- * push_subscriptions: aparelhos que aceitaram receber push.
-- * generate_notifications(): roda a cada 5 min (pg_cron) e cria os avisos.
-- * push_claim/push_report: usados pela rota /api/push/dispatch (Vercel), que
--   envia o push com a chave VAPID. Protegidos por um segredo guardado num
--   schema privado; a chave secreta do Supabase não é usada em lugar nenhum.
-- * timer_finish_offline(): finaliza um cronômetro registrado sem internet,
--   sem duplicar e sem finalizar o cronômetro errado.
--
-- Pode ser rodado mais de uma vez.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- Cronômetro finalizado sem internet
-- ---------------------------------------------------------------------
-- O aparelho guarda o id do cronômetro e o tempo no momento em que a pessoa
-- finalizou. Ao reenviar:
--   * o cronômetro ainda existe  -> finaliza ESTE cronômetro (nunca outro);
--   * já virou sessão            -> devolve a sessão (reenvio não duplica);
--   * foi descartado em outro aparelho -> cria a sessão com os dados guardados.
create or replace function public.timer_finish_offline(
  p_timer_id uuid, p_subject_id uuid, p_study_type public.study_type, p_started_at timestamptz,
  p_ended_at timestamptz, p_duration_seconds integer,
  p_topic text default null, p_notes text default null,
  p_questions_answered integer default null, p_questions_correct integer default null)
returns public.study_sessions language plpgsql security invoker set search_path = '' as $$
declare
  t public.active_timers;
  s public.study_sessions;
  v_elapsed integer;
  v_end timestamptz;
  v_tz text;
begin
  select * into s from public.study_sessions where timer_id = p_timer_id and user_id = (select auth.uid());
  if found then return s; end if;

  select timezone into v_tz from public.profiles where id = (select auth.uid());

  select * into t from public.active_timers
   where id = p_timer_id and user_id = (select auth.uid()) for update;
  if found then
    v_elapsed := t.accumulated_seconds
               + case when t.status = 'running'
                      then greatest(0, floor(extract(epoch from (now() - t.segment_started_at))))::int
                      else 0 end;
    v_elapsed := least(coalesce(p_duration_seconds, v_elapsed), v_elapsed, 86400);
    v_end := least(now(), greatest(coalesce(p_ended_at, now()), t.started_at + make_interval(secs => v_elapsed)));
    if v_elapsed < 60 then
      raise exception 'Sessões precisam ter ao menos 1 minuto.' using errcode = 'P0003';
    end if;
    insert into public.study_sessions (user_id, subject_id, session_date, started_at, ended_at, duration_seconds,
                                       study_type, topic, notes, questions_answered, questions_correct, source, timer_id)
    values (t.user_id, t.subject_id, (t.started_at at time zone v_tz)::date, t.started_at, v_end, v_elapsed,
            t.study_type, coalesce(nullif(btrim(p_topic), ''), t.topic), nullif(btrim(p_notes), ''),
            p_questions_answered, p_questions_correct, 'timer', t.id)
    returning * into s;
    delete from public.active_timers where id = t.id;
    return s;
  end if;

  -- Descartado em outro aparelho: guarda o que foi estudado.
  v_elapsed := least(greatest(coalesce(p_duration_seconds, 0), 0), 86400);
  if v_elapsed < 60 then
    raise exception 'Sessões precisam ter ao menos 1 minuto.' using errcode = 'P0003';
  end if;
  v_end := greatest(coalesce(p_ended_at, now()), p_started_at + make_interval(secs => v_elapsed));
  insert into public.study_sessions (user_id, subject_id, session_date, started_at, ended_at, duration_seconds,
                                     study_type, topic, notes, questions_answered, questions_correct, source, timer_id)
  values ((select auth.uid()), p_subject_id, (p_started_at at time zone v_tz)::date, p_started_at, v_end, v_elapsed,
          p_study_type, nullif(btrim(p_topic), ''), nullif(btrim(p_notes), ''),
          p_questions_answered, p_questions_correct, 'timer', p_timer_id)
  returning * into s;
  return s;
end $$;

revoke all on function public.timer_finish_offline(uuid, uuid, public.study_type, timestamptz, timestamptz, integer,
  text, text, integer, integer) from public, anon;
grant execute on function public.timer_finish_offline(uuid, uuid, public.study_type, timestamptz, timestamptz, integer,
  text, text, integer, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Preferências
-- ---------------------------------------------------------------------
create table if not exists public.notification_prefs (
  user_id             uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  push_enabled        boolean not null default false,
  cat_reviews         boolean not null default true,
  cat_daily_goal      boolean not null default true,
  cat_study_reminder  boolean not null default true,
  cat_streak          boolean not null default true,
  cat_goal_reached    boolean not null default true,
  cat_system          boolean not null default true,
  reviews_time        time not null default '08:00',
  study_reminder_time time not null default '19:00',
  evening_check_time  time not null default '20:30',
  updated_at          timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
drop policy if exists notification_prefs_own on public.notification_prefs;
create policy notification_prefs_own on public.notification_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.notification_prefs from anon;
grant select, insert, update on public.notification_prefs to authenticated;

-- ---------------------------------------------------------------------
-- Aparelhos inscritos no push
-- ---------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique check (endpoint like 'https://%' and char_length(endpoint) <= 1000),
  p256dh       text not null check (char_length(p256dh) between 20 and 200),
  auth         text not null check (char_length(auth) between 10 and 100),
  user_agent   text check (char_length(user_agent) <= 300),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_select_own on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_delete_own on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;

-- Um aparelho pertence a quem está conectado nele agora (troca de conta no mesmo navegador).
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
end $$;
revoke all on function public.push_subscribe(text, text, text, text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Central de notificações
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('reviews', 'daily_goal', 'study_reminder', 'streak',
                                                 'goal_reached', 'system')),
  title           text not null check (char_length(title) between 1 and 120),
  body            text not null default '' check (char_length(body) <= 500),
  url             text not null default '/painel' check (url like '/%' and url not like '//%'
                                                          and char_length(url) <= 300),
  dedupe_key      text not null,
  created_at      timestamptz not null default now(),
  read_at         timestamptz,
  push_state      text not null default 'pending' check (push_state in ('pending', 'sent', 'skipped', 'failed')),
  push_claimed_at timestamptz,
  unique (user_id, dedupe_key)
);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_push_pending_idx on public.notifications (created_at) where push_state = 'pending';
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
drop policy if exists notifications_update_own on public.notifications;
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_select_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated; -- só marcar como lida

-- ---------------------------------------------------------------------
-- Geração (roda no agendador)
-- ---------------------------------------------------------------------
create or replace function public.notify(p_user uuid, p_kind text, p_title text, p_body text, p_url text, p_key text)
returns void language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title, body, url, dedupe_key)
  values (p_user, p_kind, p_title, p_body, p_url, p_key)
  on conflict (user_id, dedupe_key) do nothing;
$$;
revoke all on function public.notify(uuid, text, text, text, text, text) from public, anon, authenticated;

create or replace function public.fmt_minutes(p_min integer)
returns text language sql immutable set search_path = '' as $$
  select case when p_min < 60 then p_min || ' min'
              when p_min % 60 = 0 then (p_min / 60) || 'h'
              else (p_min / 60) || 'h ' || lpad((p_min % 60)::text, 2, '0') || 'min' end;
$$;

-- Dentro da janela de envio: a partir do horário escolhido, por até 3 horas.
create or replace function public.in_window(p_local time, p_at time)
returns boolean language sql immutable set search_path = '' as $$
  select p_local >= p_at and p_local < p_at + interval '3 hours' and p_at + interval '3 hours' > p_at
      or (p_at + interval '3 hours' <= p_at and (p_local >= p_at or p_local < p_at + interval '3 hours'));
$$;

create or replace function public.generate_notifications()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  u record;
  g record;
  v_now timestamp;
  v_today date;
  v_time time;
  v_count integer;
  v_done numeric;
  v_streak integer;
  v_start date;
  v_end date;
  v_label text;
  v_created integer := 0;
begin
  for u in
    select p.id, p.timezone, p.week_starts_on,
           coalesce(n.cat_reviews, true) as cat_reviews,
           coalesce(n.cat_daily_goal, true) as cat_daily_goal,
           coalesce(n.cat_study_reminder, true) as cat_study_reminder,
           coalesce(n.cat_streak, true) as cat_streak,
           coalesce(n.cat_goal_reached, true) as cat_goal_reached,
           coalesce(n.reviews_time, '08:00') as reviews_time,
           coalesce(n.study_reminder_time, '19:00') as study_reminder_time,
           coalesce(n.evening_check_time, '20:30') as evening_check_time
      from public.profiles p
      left join public.notification_prefs n on n.user_id = p.id
  loop
    v_now := now() at time zone u.timezone;
    v_today := v_now::date;
    v_time := v_now::time;

    -- Revisões de hoje (e atrasadas)
    if u.cat_reviews and public.in_window(v_time, u.reviews_time) then
      select count(*) into v_count from public.study_reviews
       where user_id = u.id and status = 'pending' and due_date <= v_today;
      if v_count > 0 then
        perform public.notify(u.id, 'reviews',
          case when v_count = 1 then '1 revisão para hoje' else v_count || ' revisões para hoje' end,
          'Abra as revisões para manter o conteúdo fresco.', '/revisoes', 'reviews:' || v_today);
      end if;
    end if;

    -- Lembrete de estudo: ainda não estudou hoje
    if u.cat_study_reminder and public.in_window(v_time, u.study_reminder_time)
       and not exists (select 1 from public.study_sessions where user_id = u.id and session_date = v_today)
       and not exists (select 1 from public.active_timers where user_id = u.id) then
      perform public.notify(u.id, 'study_reminder', 'Hora de estudar',
        'Você ainda não registrou estudo hoje. Que tal começar agora?', '/painel', 'study:' || v_today);
    end if;

    -- Meta diária ainda não concluída (metas gerais)
    if u.cat_daily_goal and public.in_window(v_time, u.evening_check_time) then
      for g in select * from public.study_goals
                where user_id = u.id and is_active and period = 'daily' and subject_id is null loop
        select case g.metric
                 when 'minutes' then coalesce(sum(duration_seconds), 0) / 60.0
                 when 'sessions' then count(*)
                 else coalesce(sum(questions_answered), 0) end
          into v_done
          from public.study_sessions where user_id = u.id and session_date = v_today;
        if v_done < g.target then
          perform public.notify(u.id, 'daily_goal', 'Meta do dia em aberto',
            case g.metric
              when 'minutes' then 'Faltam ' || public.fmt_minutes(ceil(g.target - v_done)::int) || ' para a meta de hoje.'
              when 'sessions' then 'Faltam ' || (g.target - v_done)::int || ' sessões para a meta de hoje.'
              else 'Faltam ' || (g.target - v_done)::int || ' questões para a meta de hoje.' end,
            '/metas', 'daily-goal:' || g.id || ':' || v_today);
        end if;
      end loop;
    end if;

    -- Sequência em risco: estudou ontem (e antes), ainda não hoje
    if u.cat_streak and public.in_window(v_time, u.evening_check_time)
       and not exists (select 1 from public.study_sessions where user_id = u.id and session_date = v_today) then
      v_streak := 0;
      while v_streak < 400 and exists (select 1 from public.study_sessions
                                        where user_id = u.id and session_date = v_today - (v_streak + 1)) loop
        v_streak := v_streak + 1;
      end loop;
      if v_streak >= 2 then
        perform public.notify(u.id, 'streak', 'Sua sequência está em risco',
          'Estude hoje para manter ' || v_streak || ' dias seguidos.', '/painel', 'streak:' || v_today);
      end if;
    end if;

    -- Metas alcançadas no período atual
    if u.cat_goal_reached then
      for g in select gl.*, s.name as subject_name from public.study_goals gl
                 left join public.subjects s on s.id = gl.subject_id
                where gl.user_id = u.id and gl.is_active loop
        if g.period = 'daily' then
          v_start := v_today; v_end := v_today; v_label := 'de hoje';
        elsif g.period = 'weekly' then
          v_start := v_today - ((extract(dow from v_today)::int - u.week_starts_on + 7) % 7);
          v_end := v_start + 6; v_label := 'da semana';
        else
          v_start := date_trunc('month', v_today)::date;
          v_end := (date_trunc('month', v_today) + interval '1 month - 1 day')::date; v_label := 'do mês';
        end if;
        select case g.metric
                 when 'minutes' then coalesce(sum(duration_seconds), 0) / 60.0
                 when 'sessions' then count(*)
                 else coalesce(sum(questions_answered), 0) end
          into v_done
          from public.study_sessions
         where user_id = u.id and session_date between v_start and v_end
           and (g.subject_id is null or subject_id = g.subject_id);
        if v_done >= g.target then
          perform public.notify(u.id, 'goal_reached', 'Meta alcançada',
            'Você completou a meta ' || v_label
              || coalesce(' de ' || g.subject_name, '') || ': '
              || case g.metric when 'minutes' then public.fmt_minutes(g.target)
                               when 'sessions' then g.target || ' sessões'
                               else g.target || ' questões' end || '.',
            '/metas', 'goal:' || g.id || ':' || v_start);
        end if;
      end loop;
    end if;
  end loop;

  -- Todas as notificações criadas nesta execução têm created_at = now() (início da transação).
  select count(*) into v_created from public.notifications where created_at = now();
  return v_created;
end $$;
revoke all on function public.generate_notifications() from public, anon, authenticated;

-- Aviso importante para todas as contas (rode no SQL Editor):
--   select public.notify_everyone('Título', 'Mensagem', '/painel');
create or replace function public.notify_everyone(p_title text, p_body text, p_url text default '/painel')
returns integer language plpgsql security definer set search_path = '' as $$
declare v_key text := 'system:' || gen_random_uuid(); v_n integer;
begin
  insert into public.notifications (user_id, kind, title, body, url, dedupe_key)
  select p.id, 'system', p_title, coalesce(p_body, ''), coalesce(p_url, '/painel'), v_key
    from public.profiles p
    left join public.notification_prefs n on n.user_id = p.id
   where coalesce(n.cat_system, true);
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.notify_everyone(text, text, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Envio do push (rota /api/push/dispatch na Vercel)
-- ---------------------------------------------------------------------
create schema if not exists alpha_private;
revoke all on schema alpha_private from public, anon, authenticated;
create table if not exists alpha_private.push_config (
  id           boolean primary key default true check (id),
  dispatch_url text not null check (dispatch_url like 'https://%' or dispatch_url like 'http://localhost%'
                                    or dispatch_url like 'http://127.0.0.1%'),
  secret       text not null check (char_length(secret) >= 32)
);
revoke all on alpha_private.push_config from public, anon, authenticated;

-- Configuração única (rode no SQL Editor com o endereço do site e o mesmo segredo da Vercel):
--   select public.configure_push('https://SEU-SITE.vercel.app/api/push/dispatch', 'SEGREDO');
create or replace function public.configure_push(p_url text, p_secret text)
returns void language sql security definer set search_path = '' as $$
  insert into alpha_private.push_config (id, dispatch_url, secret) values (true, p_url, p_secret)
  on conflict (id) do update set dispatch_url = excluded.dispatch_url, secret = excluded.secret;
$$;
revoke all on function public.configure_push(text, text) from public, anon, authenticated;

create or replace function public.push_secret_ok(p_secret text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from alpha_private.push_config c
                  where p_secret is not null and char_length(p_secret) >= 32
                    and extensions.digest(c.secret, 'sha256') = extensions.digest(p_secret, 'sha256'));
$$;
revoke all on function public.push_secret_ok(text) from public, anon, authenticated;

-- Pega um lote de notificações para enviar. Notificações antigas (> 6 h) não viram push.
create or replace function public.push_claim(p_secret text, p_limit integer default 50)
returns table (notification_id uuid, title text, body text, url text, kind text, subscriptions jsonb)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.push_secret_ok(p_secret) then
    raise exception 'Não autorizado.' using errcode = '42501';
  end if;

  update public.notifications n set push_state = 'skipped'
   where n.push_state = 'pending'
     and (n.created_at < now() - interval '6 hours'
          or not exists (select 1 from public.notification_prefs p where p.user_id = n.user_id and p.push_enabled)
          or not exists (select 1 from public.push_subscriptions s where s.user_id = n.user_id));

  return query
  with batch as (
    select n.id from public.notifications n
     where n.push_state = 'pending'
       and (n.push_claimed_at is null or n.push_claimed_at < now() - interval '10 minutes')
     order by n.created_at
     limit least(greatest(p_limit, 1), 200)
     for update skip locked
  ), claimed as (
    update public.notifications n set push_claimed_at = now()
      from batch b where n.id = b.id
    returning n.id, n.user_id, n.title, n.body, n.url, n.kind
  )
  select c.id, c.title, c.body, c.url, c.kind,
         (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint,
                                                       'p256dh', s.p256dh, 'auth', s.auth)), '[]'::jsonb)
            from public.push_subscriptions s where s.user_id = c.user_id)
    from claimed c;
end $$;
revoke all on function public.push_claim(text, integer) from public, authenticated;
grant execute on function public.push_claim(text, integer) to anon;

-- Resultado do envio: [{ "id": <notificação>, "sent": true|false, "gone": [<inscrições expiradas>], "ok": [<inscrições entregues>] }]
create or replace function public.push_report(p_secret text, p_results jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if not public.push_secret_ok(p_secret) then
    raise exception 'Não autorizado.' using errcode = '42501';
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_results, '[]'::jsonb)) loop
    update public.notifications
       set push_state = case when (r->>'sent')::boolean then 'sent' else 'failed' end
     where id = (r->>'id')::uuid and push_state = 'pending';
    delete from public.push_subscriptions
     where id in (select (jsonb_array_elements_text(coalesce(r->'gone', '[]'::jsonb)))::uuid);
    update public.push_subscriptions set last_used_at = now()
     where id in (select (jsonb_array_elements_text(coalesce(r->'ok', '[]'::jsonb)))::uuid);
  end loop;
end $$;
revoke all on function public.push_report(text, jsonb) from public, authenticated;
grant execute on function public.push_report(text, jsonb) to anon;

-- Gera os avisos e chama o envio (o agendador executa a cada 5 minutos).
create or replace function public.run_notifications()
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  perform public.generate_notifications();
  select * into c from alpha_private.push_config limit 1;
  if found and exists (select 1 from pg_catalog.pg_extension where extname = 'pg_net') then
    execute 'select net.http_post(url := $1, body := ''{}''::jsonb,
               headers := jsonb_build_object(''content-type'', ''application/json'', ''x-dispatch-secret'', $2),
               timeout_milliseconds := 20000)'
      using c.dispatch_url, c.secret;
  end if;
end $$;
revoke all on function public.run_notifications() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- Agendador (Supabase: extensões pg_cron e pg_net)
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_cron with schema pg_catalog;
    create extension if not exists pg_net with schema extensions;
    perform cron.schedule('alpha-notificacoes', '*/5 * * * *', 'select public.run_notifications()');
  else
    raise notice 'pg_cron/pg_net indisponíveis: rode public.run_notifications() por outro agendador.';
  end if;
end $$;

-- Notificação de teste (botão em Configurações → Notificações). No máximo uma por minuto.
create or replace function public.notify_test()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  perform public.notify(v_uid, 'system', 'Notificações ativadas',
    'É assim que os avisos do Missão Alpha-01 vão chegar neste aparelho.', '/notificacoes',
    'test:' || to_char(now(), 'YYYY-MM-DD"T"HH24:MI'));
end $$;
revoke all on function public.notify_test() from public, anon;
grant execute on function public.notify_test() to authenticated;
