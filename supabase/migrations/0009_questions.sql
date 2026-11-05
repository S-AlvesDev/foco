-- =====================================================================
-- MISSÃO ALPHA-01 — Banco de questões
--
-- * questions: catálogo compartilhado (todos leem). Só entra pela função
--   import_questions(), que exige uma conta administradora do banco.
-- * question_admins: quem pode importar. A primeira conta que ativar a
--   importação no app vira administradora (claim_question_admin).
-- * question_attempts: cada resposta dada, só o dono vê. O acerto é calculado
--   pelo banco a partir do gabarito, nunca pelo aparelho.
-- * question_notes: favorita e anotação pessoal por questão.
-- * question_reports: erros reportados; o dono vê os seus, administradores
--   veem todos e marcam como resolvidos.
-- * question_prefs: área escolhida por pessoa (ex.: policial, farmácia).
--
-- Não altera tabelas existentes. Pode ser rodado mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table if not exists public.questions (
  id                       text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$'),
  area                     text not null check (area ~ '^[a-z0-9_-]{1,40}$'),
  concurso                 text not null check (char_length(btrim(concurso)) between 1 and 120),
  cargo                    text check (char_length(cargo) <= 160),
  curso_referencia         text check (char_length(curso_referencia) <= 200),
  especialidade_referencia text check (char_length(especialidade_referencia) <= 200),
  disciplina               text not null check (char_length(btrim(disciplina)) between 1 and 120),
  assunto                  text not null check (char_length(btrim(assunto)) between 1 and 200),
  subassunto               text check (char_length(subassunto) <= 200),
  banca_referencia         text check (char_length(banca_referencia) <= 80),
  tipo                     text not null check (tipo in ('certo_errado', 'multipla_escolha')),
  dificuldade              text not null check (dificuldade in ('facil', 'intermediaria', 'dificil')),
  enunciado                text not null check (char_length(btrim(enunciado)) between 1 and 10000),
  alternativas             jsonb,
  gabarito                 text not null,
  comentario               text check (char_length(comentario) <= 20000),
  justificativa            text check (char_length(justificativa) <= 5000),
  explicacoes_incorretas   jsonb,
  origem                   text check (char_length(origem) <= 60),
  fonte                    text check (char_length(fonte) <= 500),
  referencias              jsonb not null default '[]'::jsonb check (jsonb_typeof(referencias) = 'array'),
  licenca                  text check (char_length(licenca) <= 500),
  lote_producao            integer,
  versao_schema            text check (char_length(versao_schema) <= 20),
  data_producao            date,
  status_revisao           text check (char_length(status_revisao) <= 40),
  imported_by              uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  constraint questions_answer_shape check (
    (tipo = 'certo_errado' and gabarito in ('C', 'E') and alternativas is null)
    or (tipo = 'multipla_escolha' and gabarito ~ '^[A-E]$'
        and jsonb_typeof(alternativas) = 'object' and alternativas ? gabarito)),
  constraint questions_explanations_shape check (
    explicacoes_incorretas is null or jsonb_typeof(explicacoes_incorretas) = 'object')
);

create index if not exists questions_area_idx on public.questions (area, concurso, disciplina);
create index if not exists questions_disciplina_idx on public.questions (area, disciplina, assunto);

drop trigger if exists questions_updated_at on public.questions;
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

alter table public.questions enable row level security;
drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions for select to authenticated using (true);
revoke all on public.questions from anon;
grant select on public.questions to authenticated;

-- ---------------------------------------------------------------------
-- Administradores do banco
-- ---------------------------------------------------------------------
create table if not exists public.question_admins (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.question_admins enable row level security;
drop policy if exists question_admins_select_own on public.question_admins;
create policy question_admins_select_own on public.question_admins for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.question_admins from anon, authenticated;
grant select on public.question_admins to authenticated;

create or replace function public.is_question_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.question_admins where user_id = (select auth.uid()));
$$;

/** Existe alguma conta administradora? Usado só para mostrar o botão de ativar. */
create or replace function public.question_admin_exists()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.question_admins);
$$;

/** A primeira conta que pedir vira administradora; depois disso ninguém mais consegue. */
create or replace function public.claim_question_admin()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Entre na sua conta.' using errcode = '42501';
  end if;
  lock table public.question_admins in exclusive mode;
  if exists (select 1 from public.question_admins) then
    return exists (select 1 from public.question_admins where user_id = (select auth.uid()));
  end if;
  insert into public.question_admins (user_id) values ((select auth.uid()));
  return true;
end $$;

-- ---------------------------------------------------------------------
-- Importação
-- ---------------------------------------------------------------------
-- Recebe um array JSON no formato do lote (até 1000 itens por chamada).
-- Insere as novas, atualiza as que mudaram e ignora as idênticas. Uma questão
-- inválida não derruba o lote: volta em "errors" com o motivo.
create or replace function public.import_questions(p_items jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  it jsonb;
  v_inserted int := 0;
  v_updated int := 0;
  v_unchanged int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_new boolean;
  v_id text;
begin
  if not public.is_question_admin() then
    raise exception 'Só a conta administradora do banco pode importar questões.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'O arquivo precisa conter uma lista de questões.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 1000 then
    raise exception 'Envie no máximo 1000 questões por vez.' using errcode = '22023';
  end if;

  for it in select value from jsonb_array_elements(p_items) loop
    v_id := it->>'id';
    v_new := null;
    begin
      if jsonb_typeof(it) is distinct from 'object' then
        raise exception 'item não é um objeto';
      end if;
      insert into public.questions as q (
        id, area, concurso, cargo, curso_referencia, especialidade_referencia, disciplina, assunto,
        subassunto, banca_referencia, tipo, dificuldade, enunciado, alternativas, gabarito, comentario,
        justificativa, explicacoes_incorretas, origem, fonte, referencias, licenca, lote_producao,
        versao_schema, data_producao, status_revisao, imported_by)
      values (
        btrim(v_id), lower(btrim(it->>'area')), btrim(it->>'concurso'), nullif(btrim(it->>'cargo'), ''),
        nullif(btrim(it->>'curso_referencia'), ''), nullif(btrim(it->>'especialidade_referencia'), ''),
        btrim(it->>'disciplina'), btrim(it->>'assunto'), nullif(btrim(it->>'subassunto'), ''),
        nullif(btrim(it->>'banca_referencia'), ''), it->>'tipo', it->>'dificuldade', it->>'enunciado',
        case when jsonb_typeof(it->'alternativas') = 'object' then it->'alternativas' end,
        upper(btrim(it->>'gabarito')), it->>'comentario', it->>'justificativa',
        case when jsonb_typeof(it->'explicacoes_incorretas') = 'object' then it->'explicacoes_incorretas' end,
        it->>'origem', it->>'fonte',
        case when jsonb_typeof(it->'referencias') = 'array' then it->'referencias' else '[]'::jsonb end,
        it->>'licenca', (it->>'lote_producao')::int, it->>'versao_schema',
        (it->>'data_producao')::date, it->>'status_revisao', (select auth.uid()))
      on conflict (id) do update set
        area = excluded.area, concurso = excluded.concurso, cargo = excluded.cargo,
        curso_referencia = excluded.curso_referencia, especialidade_referencia = excluded.especialidade_referencia,
        disciplina = excluded.disciplina, assunto = excluded.assunto, subassunto = excluded.subassunto,
        banca_referencia = excluded.banca_referencia, tipo = excluded.tipo, dificuldade = excluded.dificuldade,
        enunciado = excluded.enunciado, alternativas = excluded.alternativas, gabarito = excluded.gabarito,
        comentario = excluded.comentario, justificativa = excluded.justificativa,
        explicacoes_incorretas = excluded.explicacoes_incorretas, origem = excluded.origem,
        fonte = excluded.fonte, referencias = excluded.referencias, licenca = excluded.licenca,
        lote_producao = excluded.lote_producao, versao_schema = excluded.versao_schema,
        data_producao = excluded.data_producao, status_revisao = excluded.status_revisao,
        imported_by = excluded.imported_by
      where (q.area, q.concurso, q.cargo, q.curso_referencia, q.especialidade_referencia, q.disciplina,
             q.assunto, q.subassunto, q.banca_referencia, q.tipo, q.dificuldade, q.enunciado, q.alternativas,
             q.gabarito, q.comentario, q.justificativa, q.explicacoes_incorretas, q.origem, q.fonte,
             q.referencias, q.licenca, q.lote_producao, q.versao_schema, q.data_producao, q.status_revisao)
        is distinct from
            (excluded.area, excluded.concurso, excluded.cargo, excluded.curso_referencia,
             excluded.especialidade_referencia, excluded.disciplina, excluded.assunto, excluded.subassunto,
             excluded.banca_referencia, excluded.tipo, excluded.dificuldade, excluded.enunciado,
             excluded.alternativas, excluded.gabarito, excluded.comentario, excluded.justificativa,
             excluded.explicacoes_incorretas, excluded.origem, excluded.fonte, excluded.referencias,
             excluded.licenca, excluded.lote_producao, excluded.versao_schema, excluded.data_producao,
             excluded.status_revisao)
      returning (xmax = 0) into v_new;

      if v_new is null then v_unchanged := v_unchanged + 1;
      elsif v_new then v_inserted := v_inserted + 1;
      else v_updated := v_updated + 1;
      end if;
    exception when others then
      v_errors := v_errors || jsonb_build_object('id', coalesce(v_id, '(sem id)'), 'message', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('inserted', v_inserted, 'updated', v_updated,
                            'unchanged', v_unchanged, 'errors', v_errors);
end $$;

-- ---------------------------------------------------------------------
-- Respostas
-- ---------------------------------------------------------------------
create table if not exists public.question_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  answer      text not null check (answer ~ '^[A-E]$'),
  is_correct  boolean not null default false,
  answered_on date not null default current_date,
  created_at  timestamptz not null default now()
);
create index if not exists question_attempts_user_q_idx
  on public.question_attempts (user_id, question_id, created_at desc);
create index if not exists question_attempts_user_day_idx
  on public.question_attempts (user_id, answered_on);
create index if not exists question_attempts_q_idx on public.question_attempts (question_id);

-- O banco confere a resposta: o aparelho só informa a letra escolhida.
create or replace function public.question_attempts_defaults()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  q public.questions;
  v_tz text;
begin
  select * into q from public.questions where id = new.question_id;
  if not found then
    raise exception 'Questão não encontrada.' using errcode = 'P0002';
  end if;
  new.answer := upper(new.answer);
  if q.tipo = 'certo_errado' and new.answer not in ('C', 'E') then
    raise exception 'Responda com Certo ou Errado.' using errcode = '22023';
  end if;
  if q.tipo = 'multipla_escolha' and not (q.alternativas ? new.answer) then
    raise exception 'Alternativa inexistente.' using errcode = '22023';
  end if;
  new.is_correct := new.answer = q.gabarito;
  select p.timezone into v_tz from public.profiles p where p.id = new.user_id;
  new.created_at := now();
  new.answered_on := (now() at time zone coalesce(v_tz, 'America/Sao_Paulo'))::date;
  return new;
end $$;

drop trigger if exists question_attempts_defaults on public.question_attempts;
create trigger question_attempts_defaults before insert on public.question_attempts
  for each row execute function public.question_attempts_defaults();

alter table public.question_attempts enable row level security;
drop policy if exists question_attempts_select_own on public.question_attempts;
drop policy if exists question_attempts_insert_own on public.question_attempts;
drop policy if exists question_attempts_delete_own on public.question_attempts;
create policy question_attempts_select_own on public.question_attempts for select to authenticated
  using (user_id = (select auth.uid()));
create policy question_attempts_insert_own on public.question_attempts for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy question_attempts_delete_own on public.question_attempts for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.question_attempts from anon;
grant select, insert, delete on public.question_attempts to authenticated;

-- ---------------------------------------------------------------------
-- Favoritas e anotações
-- ---------------------------------------------------------------------
create table if not exists public.question_notes (
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  favorite    boolean not null default false,
  note        text check (note is null or char_length(btrim(note)) between 1 and 5000),
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
drop trigger if exists question_notes_updated_at on public.question_notes;
create trigger question_notes_updated_at before update on public.question_notes
  for each row execute function public.set_updated_at();

alter table public.question_notes enable row level security;
drop policy if exists question_notes_all_own on public.question_notes;
create policy question_notes_all_own on public.question_notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.question_notes from anon;
grant select, insert, update, delete on public.question_notes to authenticated;

-- ---------------------------------------------------------------------
-- Erros reportados
-- ---------------------------------------------------------------------
create table if not exists public.question_reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  category    text not null check (category in ('gabarito', 'enunciado', 'comentario', 'classificacao', 'outro')),
  message     text check (message is null or char_length(btrim(message)) between 1 and 2000),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists question_reports_open_idx on public.question_reports (created_at desc) where resolved_at is null;

alter table public.question_reports enable row level security;
drop policy if exists question_reports_select on public.question_reports;
drop policy if exists question_reports_insert_own on public.question_reports;
drop policy if exists question_reports_update_admin on public.question_reports;
create policy question_reports_select on public.question_reports for select to authenticated
  using (user_id = (select auth.uid()) or public.is_question_admin());
create policy question_reports_insert_own on public.question_reports for insert to authenticated
  with check (user_id = (select auth.uid()) and resolved_at is null);
create policy question_reports_update_admin on public.question_reports for update to authenticated
  using (public.is_question_admin()) with check (public.is_question_admin());
revoke all on public.question_reports from anon;
grant select, insert on public.question_reports to authenticated;
grant update (resolved_at) on public.question_reports to authenticated;

-- ---------------------------------------------------------------------
-- Área escolhida
-- ---------------------------------------------------------------------
create table if not exists public.question_prefs (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  area       text check (area is null or area ~ '^[a-z0-9_-]{1,40}$'),
  updated_at timestamptz not null default now()
);
alter table public.question_prefs enable row level security;
drop policy if exists question_prefs_all_own on public.question_prefs;
create policy question_prefs_all_own on public.question_prefs for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.question_prefs from anon;
grant select, insert, update, delete on public.question_prefs to authenticated;

-- ---------------------------------------------------------------------
-- Busca e filtros
-- ---------------------------------------------------------------------
-- p: {"area": "policial", "concurso": [...], "disciplina": [...], "assunto": [...],
--     "banca": [...], "dificuldade": [...], "tipo": [...], "status": "wrong", "text": "..."}
-- p_skip ignora um dos filtros (para contar as opções daquele filtro).

drop function if exists public.question_facets(jsonb);
drop function if exists public.question_search(jsonb, integer, integer, text);
drop function if exists public.question_filter(jsonb, text);

/** Todas as questões com a situação da pessoa: última resposta, favorita, anotação. */
create or replace function public.question_base()
returns table (id text, area text, concurso text, disciplina text, assunto text, banca text,
               dificuldade text, tipo text, search text, last_correct boolean, favorite boolean, noted boolean)
language sql stable security invoker set search_path = '' as $$
  select q.id, q.area, q.concurso, q.disciplina, q.assunto, coalesce(q.banca_referencia, 'Sem banca'),
         q.dificuldade, q.tipo, lower(q.enunciado || ' ' || q.assunto), la.is_correct,
         coalesce(n.favorite, false), n.note is not null
    from public.questions q
    left join (
      select distinct on (a.question_id) a.question_id, a.is_correct
        from public.question_attempts a
       where a.user_id = (select auth.uid())
       order by a.question_id, a.created_at desc) la on la.question_id = q.id
    left join public.question_notes n on n.user_id = (select auth.uid()) and n.question_id = q.id;
$$;

create or replace function public.question_match(
  p jsonb, p_skip text, area text, concurso text, disciplina text, assunto text, banca text,
  dificuldade text, tipo text, search text, last_correct boolean, favorite boolean, noted boolean)
returns boolean language sql immutable as $$
  -- Sem "set search_path" de propósito: assim o Postgres incorpora a condição na
  -- consulta (é bem mais rápido). Só usa operadores embutidos, sem tabelas.
  select (p_skip = 'area' or nullif(p->>'area', '') is null or area = p->>'area')
     and (p_skip = 'concurso' or coalesce(jsonb_array_length(case when jsonb_typeof(p->'concurso') = 'array' then p->'concurso' end), 0) = 0
          or (p->'concurso') ? concurso)
     and (p_skip = 'disciplina' or coalesce(jsonb_array_length(case when jsonb_typeof(p->'disciplina') = 'array' then p->'disciplina' end), 0) = 0
          or (p->'disciplina') ? disciplina)
     and (p_skip = 'assunto' or coalesce(jsonb_array_length(case when jsonb_typeof(p->'assunto') = 'array' then p->'assunto' end), 0) = 0
          or (p->'assunto') ? assunto)
     and (p_skip = 'banca' or coalesce(jsonb_array_length(case when jsonb_typeof(p->'banca') = 'array' then p->'banca' end), 0) = 0
          or (p->'banca') ? banca)
     and (p_skip = 'dificuldade' or coalesce(jsonb_array_length(case when jsonb_typeof(p->'dificuldade') = 'array' then p->'dificuldade' end), 0) = 0
          or (p->'dificuldade') ? dificuldade)
     and (p_skip = 'tipo' or coalesce(jsonb_array_length(case when jsonb_typeof(p->'tipo') = 'array' then p->'tipo' end), 0) = 0
          or (p->'tipo') ? tipo)
     and (nullif(btrim(p->>'text'), '') is null or strpos(search, lower(btrim(p->>'text'))) > 0)
     and (p_skip = 'status' or case p->>'status'
            when 'unanswered' then last_correct is null
            when 'answered'   then last_correct is not null
            when 'correct'    then last_correct is true
            when 'wrong'      then last_correct is false
            when 'favorite'   then favorite
            when 'noted'      then noted
            else true end);
$$;

create or replace function public.question_filter(p jsonb, p_skip text default null)
returns table (id text, area text, concurso text, disciplina text, assunto text, banca text,
               dificuldade text, tipo text, search text, last_correct boolean, favorite boolean, noted boolean)
language sql stable security invoker set search_path = '' as $$
  select b.* from public.question_base() b
   where public.question_match(p, p_skip, b.area, b.concurso, b.disciplina, b.assunto, b.banca,
                               b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted);
$$;

/** Contagem de cada opção de cada filtro, considerando os demais filtros. */
create or replace function public.question_facets(p jsonb)
returns table (field text, value text, n bigint)
language sql stable security invoker set search_path = '' as $$
  with b as materialized (select * from public.question_base()),
  m as materialized (
    select b.*,
      public.question_match(p, 'concurso', b.area, b.concurso, b.disciplina, b.assunto, b.banca, b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted) as m_concurso,
      public.question_match(p, 'disciplina', b.area, b.concurso, b.disciplina, b.assunto, b.banca, b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted) as m_disciplina,
      public.question_match(p, 'assunto', b.area, b.concurso, b.disciplina, b.assunto, b.banca, b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted) as m_assunto,
      public.question_match(p, 'banca', b.area, b.concurso, b.disciplina, b.assunto, b.banca, b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted) as m_banca,
      public.question_match(p, 'dificuldade', b.area, b.concurso, b.disciplina, b.assunto, b.banca, b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted) as m_dificuldade,
      public.question_match(p, 'tipo', b.area, b.concurso, b.disciplina, b.assunto, b.banca, b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted) as m_tipo,
      public.question_match(p, 'status', b.area, b.concurso, b.disciplina, b.assunto, b.banca, b.dificuldade, b.tipo, b.search, b.last_correct, b.favorite, b.noted) as m_status
    from b)
  -- Áreas: tamanho de cada uma no catálogo, sem os demais filtros (são as abas do topo).
  select 'area', m.area, count(*) from m group by 2
  union all select 'concurso', m.concurso, count(*) from m where m.m_concurso group by 2
  union all select 'disciplina', m.disciplina, count(*) from m where m.m_disciplina group by 2
  union all select 'assunto', m.assunto, count(*) from m where m.m_assunto group by 2
  union all select 'banca', m.banca, count(*) from m where m.m_banca group by 2
  union all select 'dificuldade', m.dificuldade, count(*) from m where m.m_dificuldade group by 2
  union all select 'tipo', m.tipo, count(*) from m where m.m_tipo group by 2
  union all
  select 'status', s.k, s.n from (
    select count(*) filter (where m.last_correct is null)     as unanswered,
           count(*) filter (where m.last_correct is not null) as answered,
           count(*) filter (where m.last_correct)             as correct,
           count(*) filter (where m.last_correct is false)    as wrong,
           count(*) filter (where m.favorite)                 as favorite,
           count(*) filter (where m.noted)                    as noted,
           count(*)                                           as total
      from m where m.m_status) c
  cross join lateral (values ('unanswered', c.unanswered), ('answered', c.answered), ('correct', c.correct),
                             ('wrong', c.wrong), ('favorite', c.favorite), ('noted', c.noted),
                             ('all', c.total)) s(k, n);
$$;

/**
 * Página de resultados. Ordem estável (pelo número da questão) ou embaralhada
 * por uma semente, para "Questão 14 de 120" continuar a mesma ao navegar.
 */
create or replace function public.question_search(p jsonb, p_offset integer default 0,
                                                  p_limit integer default 1, p_seed text default null)
returns table (id text, total bigint)
language sql stable security invoker set search_path = '' as $$
  select f.id, count(*) over ()
    from public.question_filter(p) f
   order by case when nullif(p_seed, '') is null then null else md5(f.id || p_seed) end,
            length(f.id), f.id
  offset greatest(p_offset, 0) limit least(greatest(p_limit, 1), 200);
$$;

-- ---------------------------------------------------------------------
-- Estatísticas
-- ---------------------------------------------------------------------
/** Como as respostas de todo mundo no app se distribuem nesta questão (sem identificar ninguém). */
create or replace function public.question_community(p_id text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'total', count(*),
    'correct', count(*) filter (where a.is_correct),
    'by_answer', coalesce((select jsonb_object_agg(x.answer, x.n) from (
        select b.answer, count(*) as n from public.question_attempts b
         where b.question_id = p_id group by b.answer) x), '{}'::jsonb))
    from public.question_attempts a
   where a.question_id = p_id
     and (select auth.uid()) is not null;
$$;

/** Respostas da própria pessoa num período, agrupadas por dia, disciplina e assunto. */
create or replace function public.question_daily(p_from date, p_to date)
returns table (day date, area text, disciplina text, assunto text, answered bigint, correct bigint)
language sql stable security invoker set search_path = '' as $$
  select a.answered_on, q.area, q.disciplina, q.assunto, count(*), count(*) filter (where a.is_correct)
    from public.question_attempts a
    join public.questions q on q.id = a.question_id
   where a.user_id = (select auth.uid()) and a.answered_on between p_from and p_to
   group by 1, 2, 3, 4;
$$;

revoke all on function public.is_question_admin() from public, anon;
revoke all on function public.question_admin_exists() from public, anon;
revoke all on function public.claim_question_admin() from public, anon;
revoke all on function public.import_questions(jsonb) from public, anon;
revoke all on function public.question_attempts_defaults() from public, anon, authenticated;
revoke all on function public.question_base() from public, anon;
revoke all on function public.question_match(jsonb, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean) from public, anon;
revoke all on function public.question_filter(jsonb, text) from public, anon;
revoke all on function public.question_facets(jsonb) from public, anon;
revoke all on function public.question_search(jsonb, integer, integer, text) from public, anon;
revoke all on function public.question_community(text) from public, anon;
revoke all on function public.question_daily(date, date) from public, anon;
grant execute on function public.is_question_admin() to authenticated;
grant execute on function public.question_admin_exists() to authenticated;
grant execute on function public.claim_question_admin() to authenticated;
grant execute on function public.import_questions(jsonb) to authenticated;
grant execute on function public.question_base() to authenticated;
grant execute on function public.question_match(jsonb, text, text, text, text, text, text, text, text, text, boolean, boolean, boolean) to authenticated;
grant execute on function public.question_filter(jsonb, text) to authenticated;
grant execute on function public.question_facets(jsonb) to authenticated;
grant execute on function public.question_search(jsonb, integer, integer, text) to authenticated;
grant execute on function public.question_community(text) to authenticated;
grant execute on function public.question_daily(date, date) to authenticated;

-- Avisa a API do Supabase para enxergar as tabelas e funções novas.
notify pgrst, 'reload schema';
