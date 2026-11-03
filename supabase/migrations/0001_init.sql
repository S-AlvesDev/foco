-- =====================================================================
-- FOCO AÍ — schema inicial
-- PostgreSQL 15+ (Supabase). Rodar com: supabase db push
--
-- Princípios:
--   * Toda tabela pessoal tem user_id e RLS "somente o dono".
--   * FKs compostas (id, user_id) impedem referenciar linhas de outra
--     pessoa (ex.: criar sessão numa matéria alheia), mesmo via API.
--   * O parceiro NUNCA lê tabelas pessoais diretamente. Dados de
--     "Nossa Jornada" saem só por funções que agregam e respeitam
--     shared_settings.
--   * Cronômetro vive no banco (active_timers) e é finalizado por uma
--     função transacional: sobrevive a reload/fechar app e não duplica.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.study_type       as enum ('theory', 'questions', 'review', 'mock_exam', 'reading');
create type public.theme_pref       as enum ('dark', 'light', 'system');
create type public.goal_period      as enum ('daily', 'weekly', 'monthly');
create type public.goal_metric      as enum ('minutes', 'sessions', 'questions');
create type public.review_status    as enum ('pending', 'done', 'skipped');
create type public.label_kind       as enum ('category', 'tag');
create type public.timer_status     as enum ('running', 'paused');
create type public.challenge_kind   as enum ('joint_goal', 'weekly_challenge');
create type public.challenge_scope  as enum ('combined', 'each');
create type public.challenge_metric as enum ('minutes', 'sessions', 'study_days', 'questions');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null default '' check (char_length(display_name) <= 60),
  avatar_path     text,
  timezone        text not null default 'America/Sao_Paulo',
  theme           public.theme_pref not null default 'dark',
  week_starts_on  smallint not null default 1 check (week_starts_on in (0, 1)), -- 0 dom, 1 seg
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function public.validate_profile()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Fuso horário inválido: %', new.timezone using errcode = '22023';
  end if;
  return new;
end $$;

create trigger profiles_validate before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile();

-- ---------------------------------------------------------------------
-- subjects (matérias livres por usuário)
-- ---------------------------------------------------------------------
create table public.subjects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  description  text check (char_length(description) <= 500),
  color        text not null default '#6E73E8' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position     integer not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id)
);
create unique index subjects_user_name_uq on public.subjects (user_id, lower(btrim(name)));
create index subjects_user_position_idx on public.subjects (user_id, position);

-- ---------------------------------------------------------------------
-- study_sessions
-- ---------------------------------------------------------------------
create table public.study_sessions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject_id          uuid not null,
  session_date        date not null,              -- dia local do usuário
  started_at          timestamptz,
  ended_at            timestamptz,
  duration_seconds    integer not null check (duration_seconds between 60 and 86400),
  study_type          public.study_type not null default 'theory',
  topic               text check (char_length(topic) <= 200),
  notes               text check (char_length(notes) <= 5000),
  questions_answered  integer check (questions_answered >= 0),
  questions_correct   integer check (questions_correct >= 0),
  source              text not null default 'manual' check (source in ('manual', 'timer')),
  timer_id            uuid unique,                -- idempotência do cronômetro
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  check (started_at is null or ended_at is null or ended_at > started_at),
  check (started_at is null or ended_at is null
         or duration_seconds <= extract(epoch from (ended_at - started_at)) + 60),
  check (questions_correct is null or questions_answered is null
         or questions_correct <= questions_answered)
);
create index study_sessions_user_date_idx    on public.study_sessions (user_id, session_date desc);
create index study_sessions_user_subject_idx on public.study_sessions (user_id, subject_id, session_date desc);

create or replace function public.study_sessions_defaults()
returns trigger language plpgsql set search_path = '' as $$
declare v_tz text;
begin
  if new.session_date is null then
    if new.started_at is null then
      raise exception 'Informe a data da sessão.' using errcode = '23502';
    end if;
    select p.timezone into v_tz from public.profiles p where p.id = new.user_id;
    new.session_date := (new.started_at at time zone coalesce(v_tz, 'UTC'))::date;
  end if;
  return new;
end $$;

create trigger study_sessions_defaults before insert or update on public.study_sessions
  for each row execute function public.study_sessions_defaults();

-- ---------------------------------------------------------------------
-- active_timers (um por usuário; estado no servidor)
-- ---------------------------------------------------------------------
create table public.active_timers (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null unique default auth.uid() references public.profiles (id) on delete cascade,
  subject_id           uuid not null,
  study_type           public.study_type not null default 'theory',
  topic                text check (char_length(topic) <= 200),
  started_at           timestamptz not null default now(),
  segment_started_at   timestamptz,                -- null quando pausado
  accumulated_seconds  integer not null default 0 check (accumulated_seconds >= 0),
  status               public.timer_status not null default 'running',
  updated_at           timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade,
  check ((status = 'running') = (segment_started_at is not null))
);

-- ---------------------------------------------------------------------
-- study_goals
-- ---------------------------------------------------------------------
create table public.study_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject_id  uuid,                                 -- null = meta geral
  period      public.goal_period not null,
  metric      public.goal_metric not null,
  target      integer not null check (target > 0),  -- minutos, sessões ou questões
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (subject_id, user_id) references public.subjects (id, user_id) on delete cascade
);
create unique index study_goals_active_uq
  on public.study_goals (user_id, subject_id, period, metric) nulls not distinct
  where is_active;

-- ---------------------------------------------------------------------
-- Anotações: categorias/etiquetas, notas e junção
-- ---------------------------------------------------------------------
create table public.note_labels (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  color       text not null default '#8A8F98' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  kind        public.label_kind not null default 'tag',
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (id, user_id)
);
create unique index note_labels_name_uq on public.note_labels (user_id, kind, lower(btrim(name)));

create table public.study_notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject_id    uuid,
  category_id   uuid,
  title         text not null default '' check (char_length(title) <= 200),
  topic         text check (char_length(topic) <= 200),
  content       jsonb not null default '{}'::jsonb check (octet_length(content::text) <= 500000), -- doc Tiptap
  content_text  text not null default '',          -- texto puro p/ busca e prévia
  is_favorite   boolean not null default false,
  search        tsvector generated always as (
                  setweight(to_tsvector('portuguese', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('portuguese', coalesce(topic, '')), 'B') ||
                  setweight(to_tsvector('portuguese', content_text), 'C')
                ) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id)  references public.subjects (id, user_id)    on delete set null (subject_id),
  foreign key (category_id, user_id) references public.note_labels (id, user_id) on delete set null (category_id)
);
create index study_notes_user_updated_idx on public.study_notes (user_id, updated_at desc);
create index study_notes_user_subject_idx on public.study_notes (user_id, subject_id);
create index study_notes_user_fav_idx     on public.study_notes (user_id) where is_favorite;
create index study_notes_search_idx       on public.study_notes using gin (search);

create table public.study_note_tags (
  note_id   uuid not null,
  label_id  uuid not null,
  user_id   uuid not null default auth.uid(),
  primary key (note_id, label_id),
  foreign key (note_id, user_id)  references public.study_notes (id, user_id) on delete cascade,
  foreign key (label_id, user_id) references public.note_labels (id, user_id) on delete cascade
);
create index study_note_tags_label_idx on public.study_note_tags (label_id);

-- ---------------------------------------------------------------------
-- study_diaries (uma entrada por dia)
-- ---------------------------------------------------------------------
create table public.study_diaries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entry_date    date not null,
  studied       text check (char_length(studied) <= 10000),
  learned       text check (char_length(learned) <= 10000),
  difficulties  text check (char_length(difficulties) <= 10000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ---------------------------------------------------------------------
-- study_reviews
-- ---------------------------------------------------------------------
create table public.study_reviews (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  subject_id          uuid not null,
  topic               text not null check (char_length(btrim(topic)) between 1 and 200),
  note_id             uuid,
  session_id          uuid,
  previous_review_id  uuid,
  due_date            date not null,
  interval_days       integer check (interval_days > 0),
  status              public.review_status not null default 'pending',
  completed_at        timestamptz,
  comment             text check (char_length(comment) <= 2000),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, user_id),
  foreign key (subject_id, user_id)         references public.subjects (id, user_id)       on delete cascade,
  foreign key (note_id, user_id)            references public.study_notes (id, user_id)    on delete set null (note_id),
  foreign key (session_id, user_id)         references public.study_sessions (id, user_id) on delete set null (session_id),
  foreign key (previous_review_id, user_id) references public.study_reviews (id, user_id)  on delete set null (previous_review_id),
  check ((status = 'pending') = (completed_at is null))
);
create index study_reviews_user_status_due_idx on public.study_reviews (user_id, status, due_date);
create index study_reviews_user_subject_idx    on public.study_reviews (user_id, subject_id);

-- ---------------------------------------------------------------------
-- achievements (conquistas; compartilháveis uma a uma)
-- ---------------------------------------------------------------------
create table public.achievements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind         text not null check (char_length(kind) <= 60),   -- ex.: streak_7, hours_100
  title        text not null check (char_length(title) <= 120),
  detail       text check (char_length(detail) <= 300),
  achieved_on  date not null,
  is_shared    boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (user_id, kind, achieved_on)
);
create index achievements_user_idx on public.achievements (user_id, achieved_on desc);

-- ---------------------------------------------------------------------
-- Nossa Jornada: couples, couple_members, shared_settings, challenges
-- ---------------------------------------------------------------------
create table public.couples (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null default 'Nossa Jornada' check (char_length(btrim(name)) between 1 and 60),
  invite_code        text unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  invite_expires_at  timestamptz default now() + interval '7 days',
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table public.couple_members (
  couple_id  uuid not null references public.couples (id) on delete cascade,
  user_id    uuid not null unique references public.profiles (id) on delete cascade, -- 1 espaço por pessoa
  joined_at  timestamptz not null default now(),
  primary key (couple_id, user_id)
);

create or replace function public.enforce_couple_capacity()
returns trigger language plpgsql set search_path = '' as $$
begin
  perform 1 from public.couples where id = new.couple_id for update;
  if (select count(*) from public.couple_members where couple_id = new.couple_id) >= 2 then
    raise exception 'Este espaço já tem duas pessoas.' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger couple_members_capacity before insert on public.couple_members
  for each row execute function public.enforce_couple_capacity();

create table public.shared_settings (
  couple_id                uuid not null,
  user_id                  uuid not null,
  share_study_time         boolean not null default true,   -- totais diários/semanais/mensais, calendário, sequência
  share_subject_breakdown  boolean not null default false,  -- nomes/cores das matérias e horas por matéria
  share_goal_progress      boolean not null default false,  -- % das metas pessoais
  updated_at               timestamptz not null default now(),
  primary key (couple_id, user_id),
  foreign key (couple_id, user_id) references public.couple_members (couple_id, user_id) on delete cascade
);

create table public.study_challenges (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  created_by   uuid default auth.uid() references public.profiles (id) on delete set null,
  kind         public.challenge_kind not null,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  description  text check (char_length(description) <= 500),
  metric       public.challenge_metric not null,
  scope        public.challenge_scope not null default 'combined',
  target       integer not null check (target > 0),
  starts_on    date not null,
  ends_on      date not null,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_on >= starts_on and ends_on - starts_on <= 366)
);
create index study_challenges_couple_idx on public.study_challenges (couple_id, ends_on desc);

-- ---------------------------------------------------------------------
-- Gatilhos updated_at
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles','subjects','study_sessions','active_timers','study_goals',
                           'study_notes','study_diaries','study_reviews','couples',
                           'shared_settings','study_challenges']
  loop
    execute format('create trigger %I before update on public.%I
                    for each row execute function public.set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Funções auxiliares de pertencimento (security definer evita recursão de RLS)
-- ---------------------------------------------------------------------
create or replace function public.my_couple_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select couple_id from public.couple_members where user_id = (select auth.uid());
$$;

create or replace function public.is_couple_member(p_couple_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.couple_members
                 where couple_id = p_couple_id and user_id = (select auth.uid()));
$$;

create or replace function public.partner_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.user_id from public.couple_members m
  where m.couple_id = public.my_couple_id() and m.user_id <> (select auth.uid());
$$;

-- ---------------------------------------------------------------------
-- Novo usuário: cria perfil e categorias padrão
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_tz text;
begin
  select name into v_tz from pg_catalog.pg_timezone_names
   where name = new.raw_user_meta_data ->> 'timezone' limit 1;

  insert into public.profiles (id, display_name, timezone)
  values (new.id,
          coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
          coalesce(v_tz, 'America/Sao_Paulo'));

  insert into public.note_labels (user_id, name, color, kind, position) values
    (new.id, 'Importante',  '#E5534B', 'category', 0),
    (new.id, 'Revisar',     '#E2A33D', 'category', 1),
    (new.id, 'Dúvida',      '#6E73E8', 'category', 2),
    (new.id, 'Dificuldade', '#B07CE8', 'category', 3),
    (new.id, 'Resumo',      '#4CB782', 'category', 4),
    (new.id, 'Concluído',   '#8A8F98', 'category', 5);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.subjects          enable row level security;
alter table public.study_sessions    enable row level security;
alter table public.active_timers     enable row level security;
alter table public.study_goals       enable row level security;
alter table public.note_labels       enable row level security;
alter table public.study_notes       enable row level security;
alter table public.study_note_tags   enable row level security;
alter table public.study_diaries     enable row level security;
alter table public.study_reviews     enable row level security;
alter table public.achievements      enable row level security;
alter table public.couples           enable row level security;
alter table public.couple_members    enable row level security;
alter table public.shared_settings   enable row level security;
alter table public.study_challenges  enable row level security;

-- Tabelas pessoais: somente o dono (select/insert/update/delete)
do $$
declare t text;
begin
  foreach t in array array['subjects','study_sessions','active_timers','study_goals','note_labels',
                           'study_notes','study_note_tags','study_diaries','study_reviews','achievements']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t||'_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t||'_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t||'_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t||'_delete_own', t);
  end loop;
end $$;

-- Conquistas marcadas como compartilhadas: o parceiro pode ler
create policy achievements_select_partner on public.achievements for select to authenticated
  using (is_shared and user_id = public.partner_id());

-- Perfis: o próprio e o do parceiro (nome/avatar); só edita o próprio
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or id = public.partner_id());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Espaço compartilhado: leitura para membros; entrada/saída só via RPC
create policy couples_select_member on public.couples for select to authenticated
  using (public.is_couple_member(id));
create policy couples_update_member on public.couples for update to authenticated
  using (public.is_couple_member(id)) with check (public.is_couple_member(id));

create policy couple_members_select on public.couple_members for select to authenticated
  using (public.is_couple_member(couple_id));

create policy shared_settings_select on public.shared_settings for select to authenticated
  using (public.is_couple_member(couple_id));
create policy shared_settings_update_own on public.shared_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy challenges_select on public.study_challenges for select to authenticated
  using (public.is_couple_member(couple_id));
create policy challenges_insert on public.study_challenges for insert to authenticated
  with check (public.is_couple_member(couple_id) and created_by = (select auth.uid()));
create policy challenges_update on public.study_challenges for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
create policy challenges_delete on public.study_challenges for delete to authenticated
  using (public.is_couple_member(couple_id));

-- =====================================================================
-- RPC: cronômetro (security invoker => RLS se aplica; now() do servidor)
-- =====================================================================
create or replace function public.timer_start(p_subject_id uuid, p_topic text default null,
                                              p_study_type public.study_type default 'theory')
returns public.active_timers language plpgsql security invoker set search_path = '' as $$
declare r public.active_timers;
begin
  insert into public.active_timers (user_id, subject_id, topic, study_type, started_at, segment_started_at, status)
  values ((select auth.uid()), p_subject_id, nullif(btrim(p_topic), ''), p_study_type, now(), now(), 'running')
  returning * into r;
  return r;
exception when unique_violation then
  raise exception 'Já existe um cronômetro ativo.' using errcode = 'P0001';
end $$;

create or replace function public.timer_pause()
returns public.active_timers language plpgsql security invoker set search_path = '' as $$
declare r public.active_timers;
begin
  update public.active_timers
     set accumulated_seconds = accumulated_seconds
                               + greatest(0, floor(extract(epoch from (now() - segment_started_at))))::int,
         segment_started_at = null,
         status = 'paused'
   where user_id = (select auth.uid()) and status = 'running'
  returning * into r;
  if not found then raise exception 'Nenhum cronômetro em andamento.' using errcode = 'P0002'; end if;
  return r;
end $$;

create or replace function public.timer_resume()
returns public.active_timers language plpgsql security invoker set search_path = '' as $$
declare r public.active_timers;
begin
  update public.active_timers
     set segment_started_at = now(), status = 'running'
   where user_id = (select auth.uid()) and status = 'paused'
  returning * into r;
  if not found then raise exception 'Nenhum cronômetro pausado.' using errcode = 'P0002'; end if;
  return r;
end $$;

-- Finaliza de forma atômica: trava a linha, cria a sessão e apaga o timer.
-- Chamadas concorrentes (duas abas) serializam; a segunda recebe P0002.
-- p_duration_seconds permite apenas REDUZIR (ex.: esqueceu ligado).
create or replace function public.timer_finish(
  p_topic text default null, p_notes text default null,
  p_questions_answered integer default null, p_questions_correct integer default null,
  p_duration_seconds integer default null)
returns public.study_sessions language plpgsql security invoker set search_path = '' as $$
declare
  t public.active_timers;
  s public.study_sessions;
  v_elapsed integer;
  v_tz text;
begin
  select * into t from public.active_timers where user_id = (select auth.uid()) for update;
  if not found then raise exception 'Nenhum cronômetro ativo.' using errcode = 'P0002'; end if;

  v_elapsed := t.accumulated_seconds
             + case when t.status = 'running'
                    then greatest(0, floor(extract(epoch from (now() - t.segment_started_at))))::int
                    else 0 end;

  if p_duration_seconds is not null then
    if p_duration_seconds > v_elapsed then
      raise exception 'A duração ajustada não pode ser maior que o tempo cronometrado.' using errcode = '22023';
    end if;
    v_elapsed := p_duration_seconds;
  end if;
  if v_elapsed < 60 then
    raise exception 'Sessões precisam ter ao menos 1 minuto.' using errcode = 'P0003';
  end if;
  v_elapsed := least(v_elapsed, 86400);

  select p.timezone into v_tz from public.profiles p where p.id = t.user_id;

  insert into public.study_sessions (user_id, subject_id, session_date, started_at, ended_at, duration_seconds,
                                     study_type, topic, notes, questions_answered, questions_correct, source, timer_id)
  values (t.user_id, t.subject_id, (t.started_at at time zone v_tz)::date, t.started_at, now(), v_elapsed,
          t.study_type, coalesce(nullif(btrim(p_topic), ''), t.topic), nullif(btrim(p_notes), ''),
          p_questions_answered, p_questions_correct, 'timer', t.id)
  returning * into s;

  delete from public.active_timers where id = t.id;
  return s;
end $$;

create or replace function public.timer_discard()
returns void language sql security invoker set search_path = '' as $$
  delete from public.active_timers where user_id = (select auth.uid());
$$;

-- =====================================================================
-- RPC: análises pessoais (security invoker => só os próprios dados)
-- =====================================================================
-- Granular por dia/matéria/tipo; o app agrega para dashboard, calendário e desempenho.
create or replace function public.my_study_stats(p_from date, p_to date)
returns table (day date, subject_id uuid, study_type public.study_type,
               seconds bigint, sessions bigint, questions bigint)
language sql stable security invoker set search_path = '' as $$
  select s.session_date, s.subject_id, s.study_type,
         sum(s.duration_seconds)::bigint, count(*)::bigint, coalesce(sum(s.questions_answered), 0)::bigint
    from public.study_sessions s
   where s.user_id = (select auth.uid())
     and s.session_date between p_from and p_to
     and p_to - p_from <= 800
   group by 1, 2, 3;
$$;

create or replace function public.my_streak()
returns table (current_streak integer, best_streak integer)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select distinct session_date as d from public.study_sessions where user_id = (select auth.uid())
  ), grp as (
    select d, d - (row_number() over (order by d))::int as g from days
  ), runs as (
    select max(d) as e, count(*)::int as len from grp group by g
  ), today as (
    select (now() at time zone p.timezone)::date as t from public.profiles p where p.id = (select auth.uid())
  )
  select coalesce((select r.len from runs r, today where r.e >= today.t - 1 order by r.e desc limit 1), 0),
         coalesce((select max(len) from runs), 0);
$$;

-- =====================================================================
-- RPC: Nossa Jornada (security definer, com checagens explícitas)
-- =====================================================================
create or replace function public.couple_create(p_name text default null)
returns public.couples language plpgsql security definer set search_path = '' as $$
declare c public.couples; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Não autenticado.' using errcode = '28000'; end if;
  if exists (select 1 from public.couple_members where user_id = v_uid) then
    raise exception 'Você já participa de um espaço compartilhado.' using errcode = 'P0001';
  end if;
  insert into public.couples (name, created_by)
  values (coalesce(nullif(btrim(p_name), ''), 'Nossa Jornada'), v_uid) returning * into c;
  insert into public.couple_members (couple_id, user_id) values (c.id, v_uid);
  insert into public.shared_settings (couple_id, user_id) values (c.id, v_uid);
  return c;
end $$;

create or replace function public.couple_join(p_code text)
returns public.couples language plpgsql security definer set search_path = '' as $$
declare c public.couples; v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Não autenticado.' using errcode = '28000'; end if;
  if exists (select 1 from public.couple_members where user_id = v_uid) then
    raise exception 'Você já participa de um espaço compartilhado.' using errcode = 'P0001';
  end if;
  select * into c from public.couples
   where invite_code = upper(btrim(p_code)) and invite_expires_at > now()
   for update;
  if not found then raise exception 'Convite inválido ou expirado.' using errcode = 'P0002'; end if;

  insert into public.couple_members (couple_id, user_id) values (c.id, v_uid); -- gatilho limita a 2
  insert into public.shared_settings (couple_id, user_id) values (c.id, v_uid);
  update public.couples set invite_code = null, invite_expires_at = null where id = c.id returning * into c;
  return c;
end $$;

create or replace function public.couple_regenerate_invite()
returns text language plpgsql security definer set search_path = '' as $$
declare v_code text; v_cid uuid := public.my_couple_id();
begin
  if v_cid is null then raise exception 'Você não participa de um espaço.' using errcode = 'P0002'; end if;
  if (select count(*) from public.couple_members where couple_id = v_cid) >= 2 then
    raise exception 'O espaço já está completo.' using errcode = 'P0001';
  end if;
  update public.couples
     set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
         invite_expires_at = now() + interval '7 days'
   where id = v_cid returning invite_code into v_code;
  return v_code;
end $$;

create or replace function public.couple_leave()
returns void language plpgsql security definer set search_path = '' as $$
declare v_cid uuid := public.my_couple_id();
begin
  if v_cid is null then return; end if;
  update public.achievements set is_shared = false where user_id = (select auth.uid());
  delete from public.couple_members where couple_id = v_cid and user_id = (select auth.uid());
  if not exists (select 1 from public.couple_members where couple_id = v_cid) then
    delete from public.couples where id = v_cid;
  else
    update public.couples
       set invite_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
           invite_expires_at = now() + interval '7 days'
     where id = v_cid;
  end if;
end $$;

-- Totais diários de cada membro (respeita share_study_time; o próprio sempre aparece)
create or replace function public.couple_daily_totals(p_from date, p_to date)
returns table (user_id uuid, day date, seconds bigint, sessions bigint)
language sql stable security definer set search_path = '' as $$
  select s.user_id, s.session_date, sum(s.duration_seconds)::bigint, count(*)::bigint
    from public.study_sessions s
    join public.shared_settings ss on ss.user_id = s.user_id and ss.couple_id = public.my_couple_id()
   where (s.user_id = (select auth.uid()) or ss.share_study_time)
     and s.session_date between p_from and p_to
     and p_to - p_from <= 800
   group by 1, 2;
$$;

-- Horas por matéria de cada membro (respeita share_subject_breakdown)
create or replace function public.couple_subject_totals(p_from date, p_to date)
returns table (user_id uuid, subject_name text, color text, seconds bigint)
language sql stable security definer set search_path = '' as $$
  select s.user_id, sub.name, sub.color, sum(s.duration_seconds)::bigint
    from public.study_sessions s
    join public.subjects sub on sub.id = s.subject_id
    join public.shared_settings ss on ss.user_id = s.user_id and ss.couple_id = public.my_couple_id()
   where (s.user_id = (select auth.uid()) or ss.share_subject_breakdown)
     and s.session_date between p_from and p_to
     and p_to - p_from <= 800
   group by 1, 2, 3;
$$;

-- Progresso de um desafio/meta conjunta por membro
create or replace function public.challenge_progress(p_challenge_id uuid)
returns table (user_id uuid, value bigint)
language plpgsql stable security definer set search_path = '' as $$
declare c public.study_challenges;
begin
  select * into c from public.study_challenges where id = p_challenge_id;
  if not found or not public.is_couple_member(c.couple_id) then return; end if;

  return query
  select m.user_id,
         coalesce((
           select case c.metric
                    when 'minutes'    then sum(s.duration_seconds) / 60
                    when 'sessions'   then count(*)
                    when 'study_days' then count(distinct s.session_date)
                    when 'questions'  then coalesce(sum(s.questions_answered), 0)
                  end
             from public.study_sessions s
            where s.user_id = m.user_id and s.session_date between c.starts_on and c.ends_on
         ), 0)::bigint
    from public.couple_members m
    join public.shared_settings ss on ss.couple_id = m.couple_id and ss.user_id = m.user_id
   where m.couple_id = c.couple_id
     and (m.user_id = (select auth.uid()) or ss.share_study_time);
end $$;

-- =====================================================================
-- Permissões de execução
-- =====================================================================
revoke execute on all functions in schema public from public, anon;

grant execute on function
  public.timer_start(uuid, text, public.study_type), public.timer_pause(), public.timer_resume(),
  public.timer_finish(text, text, integer, integer, integer), public.timer_discard(),
  public.my_study_stats(date, date), public.my_streak(),
  public.couple_create(text), public.couple_join(text), public.couple_regenerate_invite(), public.couple_leave(),
  public.couple_daily_totals(date, date), public.couple_subject_totals(date, date),
  public.challenge_progress(uuid),
  public.my_couple_id(), public.is_couple_member(uuid), public.partner_id()
to authenticated;

revoke execute on function public.handle_new_user() from authenticated;
