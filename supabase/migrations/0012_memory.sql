-- =====================================================================
-- MISSÃO ALPHA-01 — Revisão espaçada adaptativa dos tópicos da Biblioteca
--
-- * Cada tópico concluído vira um "item de memória" (memory_items) com dificuldade (D),
--   estabilidade (S, em dias) e a data da próxima revisão. O cálculo (modelo FSRS) é feito
--   no app (src/features/memory/fsrs.ts); o banco guarda, valida e mantém o registro.
-- * memory_reviews é o registro imutável de cada revisão (fonte da verdade do histórico).
-- * memory_settings: meta de retenção, tempo diário, data da prova e calibração.
-- * library_topic_meta / library_topic_links: peso do tópico no edital e os assuntos do
--   banco de questões ligados a ele (catálogo, escrito só pela conta administradora).
-- Nenhuma tabela existente muda. Pode ser rodado mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo: peso no edital e ligação tópico ↔ assunto de questão
-- ---------------------------------------------------------------------
create table if not exists public.library_topic_meta (
  topic_id   text primary key references public.library_topics (id) on delete cascade,
  incidence  text not null default 'media' check (incidence in ('alta', 'media', 'baixa')),
  updated_at timestamptz not null default now()
);

create table if not exists public.library_topic_links (
  topic_id   text not null references public.library_topics (id) on delete cascade,
  disciplina text not null check (char_length(btrim(disciplina)) between 1 and 120),
  assunto    text not null check (char_length(btrim(assunto)) between 1 and 200),
  created_at timestamptz not null default now(),
  primary key (topic_id, disciplina, assunto)
);
create index if not exists library_topic_links_subject_idx on public.library_topic_links (disciplina, assunto);

alter table public.library_topic_meta  enable row level security;
alter table public.library_topic_links enable row level security;

do $$
declare t text;
begin
  foreach t in array array['library_topic_meta', 'library_topic_links'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.library_can_read())',
                   t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated
                      using (exists (select 1 from public.question_admins where user_id = (select auth.uid())))
                      with check (exists (select 1 from public.question_admins where user_id = (select auth.uid())))',
                   t || '_admin', t);
  end loop;
end $$;

drop trigger if exists library_topic_meta_updated_at on public.library_topic_meta;
create trigger library_topic_meta_updated_at before update on public.library_topic_meta
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Ajustes pessoais
-- ---------------------------------------------------------------------
create table if not exists public.memory_settings (
  user_id          uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  target_retention numeric(3, 2) not null default 0.85 check (target_retention between 0.70 and 0.97),
  final_retention  numeric(3, 2) not null default 0.90 check (final_retention between 0.70 and 0.97),
  daily_minutes    integer not null default 30 check (daily_minutes between 5 and 240),
  exam_date        date,
  max_interval     integer not null default 180 check (max_interval between 7 and 365),
  interval_factor  numeric(4, 2) not null default 1.00 check (interval_factor between 0.50 and 2.00),
  calibrated_at    timestamptz,
  params           jsonb check (params is null or (jsonb_typeof(params) = 'array' and jsonb_array_length(params) = 19)),
  updated_at       timestamptz not null default now()
);
alter table public.memory_settings enable row level security;
drop policy if exists memory_settings_own on public.memory_settings;
create policy memory_settings_own on public.memory_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop trigger if exists memory_settings_updated_at on public.memory_settings;
create trigger memory_settings_updated_at before update on public.memory_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Itens de memória (estado atual de cada tópico, por pessoa)
-- ---------------------------------------------------------------------
create table if not exists public.memory_items (
  user_id            uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  topic_id           text not null references public.library_topics (id) on delete cascade,
  state              text not null default 'new' check (state in ('new', 'review', 'suspended')),
  difficulty         real check (difficulty between 1 and 10),
  stability          real check (stability > 0),
  last_review_at     timestamptz,
  last_review_on     date,
  due_on             date not null,
  reps               integer not null default 0 check (reps >= 0),
  lapses             integer not null default 0 check (lapses >= 0),
  -- últimas 4 revisões: [{"g": nota, "t": questões, "c": acertos}]
  recent             jsonb not null default '[]'::jsonb check (jsonb_typeof(recent) = 'array'),
  content_changed_at timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  primary key (user_id, topic_id),
  check (state <> 'review' or (difficulty is not null and stability is not null and last_review_on is not null))
);
create index if not exists memory_items_due_idx on public.memory_items (user_id, due_on) where state <> 'suspended';
create index if not exists memory_items_topic_idx on public.memory_items (topic_id);

alter table public.memory_items enable row level security;
drop policy if exists memory_items_select on public.memory_items;
create policy memory_items_select on public.memory_items for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists memory_items_insert on public.memory_items;
create policy memory_items_insert on public.memory_items for insert to authenticated
  with check (user_id = (select auth.uid()) and public.library_can_read());
drop policy if exists memory_items_update on public.memory_items;
create policy memory_items_update on public.memory_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists memory_items_delete on public.memory_items;
create policy memory_items_delete on public.memory_items for delete to authenticated
  using (user_id = (select auth.uid()));
drop trigger if exists memory_items_updated_at on public.memory_items;
create trigger memory_items_updated_at before update on public.memory_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Registro de revisões (imutável)
-- ---------------------------------------------------------------------
create table if not exists public.memory_reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  topic_id          text not null references public.library_topics (id) on delete cascade,
  client_id         uuid not null,
  reviewed_at       timestamptz not null default now(),
  reviewed_on       date not null,
  elapsed_days      integer not null check (elapsed_days >= 0),
  grade             smallint not null check (grade between 1 and 4),
  source            text not null check (source in ('self', 'questions', 'both', 'practice')),
  self_grade        smallint check (self_grade between 1 and 4),
  questions_total   smallint not null default 0 check (questions_total between 0 and 200),
  questions_correct smallint not null default 0 check (questions_correct between 0 and questions_total),
  seconds           integer check (seconds between 0 and 86400),
  r_before          real check (r_before between 0 and 1),
  s_before          real,
  d_before          real,
  s_after           real not null check (s_after > 0),
  d_after           real not null check (d_after between 1 and 10),
  scheduled_days    integer not null check (scheduled_days between 1 and 400),
  target            real check (target between 0.5 and 0.99),
  unique (user_id, client_id)
);
create index if not exists memory_reviews_user_idx on public.memory_reviews (user_id, reviewed_on desc);
create index if not exists memory_reviews_topic_idx on public.memory_reviews (user_id, topic_id, reviewed_at desc);

alter table public.memory_reviews enable row level security;
drop policy if exists memory_reviews_select on public.memory_reviews;
create policy memory_reviews_select on public.memory_reviews for select to authenticated
  using (user_id = (select auth.uid()));
-- Escrita só pela função memory_record (que mantém o item coerente com o registro).

-- ---------------------------------------------------------------------
-- Concluir um tópico na Biblioteca cria o item (primeira revisão no dia seguinte)
-- ---------------------------------------------------------------------
create or replace function public.memory_on_progress()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    insert into public.memory_items (user_id, topic_id, due_on)
    values (new.user_id, new.topic_id,
            coalesce(public.local_today(new.user_id), current_date) + 1)
    on conflict (user_id, topic_id) do update
      set state = 'new', due_on = excluded.due_on
      where public.memory_items.state = 'suspended' and public.memory_items.reps = 0;
  end if;
  return new;
end $$;
drop trigger if exists library_progress_memory on public.library_progress;
create trigger library_progress_memory after insert or update of status on public.library_progress
  for each row execute function public.memory_on_progress();

-- Tópicos concluídos antes desta migração entram nas revisões, espalhados pelos próximos 7 dias.
insert into public.memory_items (user_id, topic_id, due_on)
select p.user_id, p.topic_id,
       (select (now() at time zone coalesce(pr.timezone, 'America/Sao_Paulo'))::date
          from public.profiles pr where pr.id = p.user_id) + 1
       + ((row_number() over (partition by p.user_id order by p.completed_at nulls last, p.topic_id) - 1) % 7)::int
  from public.library_progress p
 where p.status = 'done'
on conflict (user_id, topic_id) do nothing;

-- ---------------------------------------------------------------------
-- Conteúdo do tópico mudou (nova importação): revisar em até 3 dias
-- ---------------------------------------------------------------------
create or replace function public.memory_on_block_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.memory_items m
     set content_changed_at = now(),
         due_on = least(m.due_on, coalesce(public.local_today_any(m.user_id), current_date) + 3)
   where m.topic_id = new.topic_id
     and m.state = 'review'
     and m.content_changed_at is distinct from now();
  return null;
end $$;
revoke all on function public.memory_on_block_change() from public, anon, authenticated;

-- local_today só responde pela própria pessoa (ou o parceiro); aqui o gatilho roda pela importação.
create or replace function public.local_today_any(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce(p.timezone, 'America/Sao_Paulo'))::date
    from public.profiles p where p.id = p_user;
$$;
revoke all on function public.local_today_any(uuid) from public, anon, authenticated;

drop trigger if exists library_blocks_memory_ins on public.library_blocks;
create trigger library_blocks_memory_ins after insert on public.library_blocks
  for each row execute function public.memory_on_block_change();
drop trigger if exists library_blocks_memory_upd on public.library_blocks;
create trigger library_blocks_memory_upd after update of text_hash, archived_at on public.library_blocks
  for each row
  when (old.text_hash is distinct from new.text_hash or old.archived_at is distinct from new.archived_at)
  execute function public.memory_on_block_change();

-- ---------------------------------------------------------------------
-- Grava uma revisão e o novo estado do item numa transação.
-- O cálculo vem do app; aqui só se valida e se protege a ordem (sincronização offline).
-- Reenviar o mesmo client_id não duplica nada.
-- ---------------------------------------------------------------------
create or replace function public.memory_record(p jsonb)
returns public.memory_items language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_topic text := p->>'topic_id';
  v_client uuid := (p->>'client_id')::uuid;
  v_on date := (p->>'reviewed_on')::date;
  v_grade smallint := (p->>'grade')::smallint;
  v_days int := (p->>'scheduled_days')::int;
  v_qt int := coalesce((p->>'questions_total')::int, 0);
  v_qc int := coalesce((p->>'questions_correct')::int, 0);
  v_today date;
  it public.memory_items;
begin
  if v_uid is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  v_today := public.local_today(v_uid);

  select * into it from public.memory_items where user_id = v_uid and topic_id = v_topic for update;
  if not found then
    raise exception 'Este tópico ainda não está nas suas revisões.' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.memory_reviews where user_id = v_uid and client_id = v_client) then
    return it; -- já registrada
  end if;
  if v_on is null or v_on > v_today + 1 then
    raise exception 'Data da revisão inválida.' using errcode = '22023';
  end if;
  if it.last_review_on is not null and v_on < it.last_review_on then
    raise exception 'Já existe uma revisão mais recente deste tópico.' using errcode = 'P0001';
  end if;

  insert into public.memory_reviews (user_id, topic_id, client_id, reviewed_on, elapsed_days, grade, source,
                                     self_grade, questions_total, questions_correct, seconds,
                                     r_before, s_before, d_before, s_after, d_after, scheduled_days, target)
  values (v_uid, v_topic, v_client, v_on,
          coalesce(v_on - it.last_review_on, 0), v_grade, p->>'source',
          (p->>'self_grade')::smallint, v_qt, v_qc, (p->>'seconds')::int,
          (p->>'r_before')::real, it.stability, it.difficulty,
          (p->>'s_after')::real, (p->>'d_after')::real, v_days, (p->>'target')::real);

  update public.memory_items
     set state = 'review',
         difficulty = (p->>'d_after')::real,
         stability = (p->>'s_after')::real,
         last_review_at = now(),
         last_review_on = v_on,
         due_on = v_on + v_days,
         reps = reps + 1,
         lapses = lapses + (case when v_grade = 1 then 1 else 0 end),
         recent = (select coalesce(jsonb_agg(e order by n), '[]'::jsonb)
                     from (select e, n from jsonb_array_elements(
                             recent || jsonb_build_array(jsonb_build_object('g', v_grade, 't', v_qt, 'c', v_qc)))
                             with ordinality as x(e, n)
                           order by n desc limit 4) y),
         content_changed_at = null
   where user_id = v_uid and topic_id = v_topic
  returning * into it;
  return it;
end $$;
revoke all on function public.memory_record(jsonb) from public, anon;
grant execute on function public.memory_record(jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Questões ↔ tópicos
-- ---------------------------------------------------------------------
-- Assuntos existentes no banco de questões (para ligar a um tópico).
create or replace function public.question_subjects()
returns table (disciplina text, assunto text, total bigint)
language sql stable security invoker set search_path = '' as $$
  select q.disciplina, q.assunto, count(*) from public.questions q
   where q.tipo <> 'discursiva' group by 1, 2 order by 1, 2;
$$;
revoke all on function public.question_subjects() from public, anon;
grant execute on function public.question_subjects() to authenticated;

-- Questões para a revisão de um tópico: primeiro as nunca respondidas, depois as que errou,
-- depois as respondidas há mais tempo (empates mudam a cada dia).
create or replace function public.memory_topic_questions(p_topic text, p_limit integer default 8)
returns table (id text, tipo text, choices integer)
language sql stable security invoker set search_path = '' as $$
  with l as (select disciplina, assunto from public.library_topic_links where topic_id = p_topic),
  q as (
    select q.id, q.tipo,
           case when q.tipo = 'certo_errado' then 2
                else (select count(*) from jsonb_object_keys(q.alternativas))::int end as choices,
           (select a.is_correct from public.question_attempts a
             where a.question_id = q.id and a.user_id = (select auth.uid())
             order by a.created_at desc limit 1) as last_ok,
           (select max(a.created_at) from public.question_attempts a
             where a.question_id = q.id and a.user_id = (select auth.uid())) as last_at
      from public.questions q join l on l.disciplina = q.disciplina and l.assunto = q.assunto
     where q.tipo <> 'discursiva'
  )
  select id, tipo, choices from q
   order by (last_at is not null), coalesce(last_ok, false), last_at nulls first, md5(id || current_date::text)
   limit least(greatest(coalesce(p_limit, 8), 1), 20);
$$;
revoke all on function public.memory_topic_questions(text, integer) from public, anon;
grant execute on function public.memory_topic_questions(text, integer) to authenticated;

-- Questões respondidas hoje fora da revisão, por tópico ligado à questão (para contar como revisão).
-- Só tópicos já em revisão, ainda não revisados hoje.
create or replace function public.memory_practice_stats(p_question text)
returns table (topic_id text, total integer, correct integer, wrong integer, chance_sum real)
language sql stable security invoker set search_path = '' as $$
  with me as (select (select auth.uid()) as uid, public.local_today((select auth.uid())) as today),
  src as (select q.disciplina, q.assunto from public.questions q where q.id = p_question),
  t as (
    select distinct l.topic_id
      from public.library_topic_links l
      join src on src.disciplina = l.disciplina and src.assunto = l.assunto
      join public.memory_items m on m.topic_id = l.topic_id and m.user_id = (select uid from me)
     where m.state = 'review' and m.last_review_on < (select today from me)
       and not exists (select 1 from public.memory_reviews r
                        where r.user_id = m.user_id and r.topic_id = m.topic_id
                          and r.reviewed_on = (select today from me))
  )
  select t.topic_id, count(*)::int, (count(*) filter (where a.is_correct))::int,
         (count(*) filter (where not a.is_correct))::int,
         sum(case when q.tipo = 'certo_errado' then 0.5
                  else 1.0 / greatest(2, (select count(*) from jsonb_object_keys(q.alternativas))) end)::real
    from t
    join public.library_topic_links l on l.topic_id = t.topic_id
    join public.questions q on q.disciplina = l.disciplina and q.assunto = l.assunto and q.tipo <> 'discursiva'
    join public.question_attempts a on a.question_id = q.id and a.user_id = (select uid from me)
                                   and a.answered_on = (select today from me)
   group by t.topic_id;
$$;
revoke all on function public.memory_practice_stats(text) from public, anon;
grant execute on function public.memory_practice_stats(text) to authenticated;

-- ---------------------------------------------------------------------
-- Aviso diário (mesma categoria e horário das revisões em Configurações → Notificações)
-- ---------------------------------------------------------------------
create or replace function public.generate_memory_notifications()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  u record;
  v_now timestamp;
  v_count integer;
  v_min integer;
  v_n integer := 0;
begin
  for u in
    select p.id, p.timezone,
           coalesce(n.cat_reviews, true) as cat_reviews,
           coalesce(n.reviews_time, '08:00') as reviews_time,
           coalesce(s.daily_minutes, 30) as daily_minutes
      from public.profiles p
      left join public.notification_prefs n on n.user_id = p.id
      left join public.memory_settings s on s.user_id = p.id
     where exists (select 1 from public.memory_items m where m.user_id = p.id)
  loop
    v_now := now() at time zone u.timezone;
    continue when not u.cat_reviews or not public.in_window(v_now::time, u.reviews_time);
    select count(*) into v_count
      from public.memory_items m
      join public.library_topics t on t.id = m.topic_id and t.archived_at is null
     where m.user_id = u.id and m.state <> 'suspended' and m.due_on <= v_now::date;
    continue when v_count = 0;
    v_min := least(u.daily_minutes, v_count * 8);
    perform public.notify(u.id, 'reviews',
      case when v_count = 1 then '1 tópico para revisar' else v_count || ' tópicos para revisar' end,
      'Revisões de hoje da Biblioteca, cerca de ' || public.fmt_minutes(v_min) || '. Lembre antes de reler.',
      '/revisoes/hoje', 'memory:' || v_now::date);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.generate_memory_notifications() from public, anon, authenticated;

-- Mesmo agendador da 0008: agora também gera o aviso das revisões da Biblioteca.
create or replace function public.run_notifications()
returns void language plpgsql security definer set search_path = '' as $$
declare c record;
begin
  perform public.generate_notifications();
  perform public.generate_memory_notifications();
  select * into c from alpha_private.push_config limit 1;
  if found and exists (select 1 from pg_catalog.pg_extension where extname = 'pg_net') then
    execute 'select net.http_post(url := $1, body := ''{}''::jsonb,
               headers := jsonb_build_object(''content-type'', ''application/json'', ''x-dispatch-secret'', $2),
               timeout_milliseconds := 20000)'
      using c.dispatch_url, c.secret;
  end if;
end $$;
revoke all on function public.run_notifications() from public, anon, authenticated;

notify pgrst, 'reload schema';
