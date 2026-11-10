-- =====================================================================
-- MISSÃO ALPHA-01 — Biblioteca de estudos
--
-- Catálogo (todos os que podem ler a biblioteca leem; só entra pelas funções
-- de importação, que exigem a conta administradora do banco de questões):
--   library_contests → library_disciplines → library_chapters → library_topics
--   (subtópico = tópico com parent_id) → library_blocks; library_sources = PDFs de origem.
--   Ids são textos estáveis vindos do arquivo importado: reimportar com os mesmos
--   ids atualiza no lugar. Nada do catálogo é apagado numa atualização: o que sair
--   do material fica arquivado (archived_at), para não perder marcações e anotações.
--
-- Pessoal (cada um só vê e altera o seu):
--   library_marks    → marcações (cor), anotações (texto) e favoritos, do tópico
--                      inteiro ou presos a um trecho (bloco + início/fim + texto marcado).
--   library_progress → situação, % lido, último bloco e data da última leitura.
--
-- Quem lê: a conta administradora e quem está no mesmo espaço da Nossa Jornada.
-- Não altera tabelas existentes. Pode ser rodado mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Acesso
-- ---------------------------------------------------------------------
create or replace function public.library_can_read()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.question_admins where user_id = (select auth.uid()))
      or exists (
        select 1
        from public.couple_members me
        join public.couple_members other on other.couple_id = me.couple_id
        join public.question_admins qa on qa.user_id = other.user_id
        where me.user_id = (select auth.uid()));
$$;
revoke all on function public.library_can_read() from public, anon;
grant execute on function public.library_can_read() to authenticated;

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table if not exists public.library_contests (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9_-]{0,59}$'),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  position    integer not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.library_disciplines (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]{0,99}$'),
  contest_id  text not null references public.library_contests (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 160),
  description text check (char_length(description) <= 2000),
  position    integer not null default 0,
  archived_at timestamptz,
  imported_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists library_disciplines_contest_idx on public.library_disciplines (contest_id, position);

create table if not exists public.library_sources (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]{0,119}$'),
  discipline_id text not null references public.library_disciplines (id) on delete cascade,
  file_name     text not null check (char_length(btrim(file_name)) between 1 and 300),
  title         text check (char_length(title) <= 300),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists library_sources_discipline_idx on public.library_sources (discipline_id);

create table if not exists public.library_chapters (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]{0,119}$'),
  discipline_id text not null references public.library_disciplines (id) on delete cascade,
  number        text check (char_length(number) <= 20),
  title         text not null check (char_length(btrim(title)) between 1 and 300),
  position      integer not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists library_chapters_discipline_idx on public.library_chapters (discipline_id, position);

create table if not exists public.library_topics (
  id            text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]{0,119}$'),
  chapter_id    text not null references public.library_chapters (id) on delete cascade,
  discipline_id text not null references public.library_disciplines (id) on delete cascade,
  parent_id     text references public.library_topics (id) on delete cascade,
  number        text check (char_length(number) <= 20),
  title         text not null check (char_length(btrim(title)) between 1 and 300),
  position      integer not null default 0,   -- ordem dentro da disciplina inteira (leitura linear)
  block_count   integer not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (parent_id is distinct from id)
);
create index if not exists library_topics_chapter_idx on public.library_topics (chapter_id, position);
create index if not exists library_topics_discipline_idx on public.library_topics (discipline_id, position);
create index if not exists library_topics_title_idx
  on public.library_topics (lower(public.f_unaccent(title)));

create table if not exists public.library_blocks (
  id          text primary key check (id ~ '^[a-z0-9][a-z0-9_.-]{0,159}$'),
  topic_id    text not null references public.library_topics (id) on delete cascade,
  position    integer not null default 0,
  kind        text not null check (kind in ('titulo', 'paragrafo', 'lista', 'tabela', 'comparativo',
                                              'destaque', 'citacao', 'formula', 'imagem')),
  data        jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000),
  anchor_text text not null default '',       -- texto exatamente como aparece na tela (base das marcações)
  search_text text not null default '',       -- texto com espaços entre partes, para a busca
  text_hash   text not null default '',
  sources     jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  search      tsvector generated always as (
                to_tsvector('portuguese', public.f_unaccent(search_text))) stored
);
create index if not exists library_blocks_topic_idx on public.library_blocks (topic_id, position);
create index if not exists library_blocks_search_idx on public.library_blocks using gin (search);

do $$
declare t text;
begin
  foreach t in array array['library_contests', 'library_disciplines', 'library_sources', 'library_chapters',
                           'library_topics', 'library_blocks'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I
                    for each row execute function public.set_updated_at()', t || '_updated_at', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.library_can_read())',
                   t || '_select', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Pessoal: marcações, anotações e favoritos
-- ---------------------------------------------------------------------
create table if not exists public.library_marks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('highlight', 'note', 'favorite')),
  topic_id    text not null references public.library_topics (id) on delete cascade,
  block_id    text references public.library_blocks (id) on delete cascade,
  start_offset integer check (start_offset >= 0),
  end_offset   integer,
  quote       text check (char_length(quote) <= 5000),
  color       text check (color in ('yellow', 'green', 'blue', 'pink')),
  body        text check (char_length(body) <= 20000),
  status      text not null default 'ok' check (status in ('ok', 'review')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- trecho: bloco + intervalo + texto, tudo junto; sem trecho: nada disso
  constraint library_marks_anchor check (
    (block_id is null and start_offset is null and end_offset is null and quote is null)
    or (block_id is not null and start_offset is not null and end_offset > start_offset
        and char_length(quote) between 1 and 5000)),
  constraint library_marks_shape check (
    (kind = 'highlight' and block_id is not null and color is not null)
    or (kind = 'note' and char_length(btrim(body)) between 1 and 20000)
    or (kind = 'favorite'))
);
create index if not exists library_marks_user_topic_idx on public.library_marks (user_id, topic_id);
create index if not exists library_marks_block_idx on public.library_marks (block_id);
create index if not exists library_marks_user_kind_idx on public.library_marks (user_id, kind, updated_at desc);
-- um favorito de tópico por pessoa
create unique index if not exists library_marks_topic_favorite_uq
  on public.library_marks (user_id, topic_id) where kind = 'favorite' and block_id is null;

-- O tópico do trecho vem do bloco (nunca do aparelho); trecho em bloco arquivado não é aceito.
create or replace function public.library_marks_defaults()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_topic text; v_arch timestamptz;
begin
  if new.block_id is not null and (tg_op = 'INSERT' or new.block_id is distinct from old.block_id) then
    select topic_id, archived_at into v_topic, v_arch from public.library_blocks where id = new.block_id;
    if not found or v_arch is not null then
      raise exception 'Trecho indisponível.' using errcode = '22023';
    end if;
    new.topic_id := v_topic;
  end if;
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;
drop trigger if exists library_marks_defaults on public.library_marks;
create trigger library_marks_defaults before insert or update on public.library_marks
  for each row execute function public.library_marks_defaults();
drop trigger if exists library_marks_updated_at on public.library_marks;
create trigger library_marks_updated_at before update on public.library_marks
  for each row execute function public.set_updated_at();

alter table public.library_marks enable row level security;
drop policy if exists library_marks_select on public.library_marks;
create policy library_marks_select on public.library_marks for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists library_marks_insert on public.library_marks;
create policy library_marks_insert on public.library_marks for insert to authenticated
  with check (user_id = (select auth.uid()) and public.library_can_read());
drop policy if exists library_marks_update on public.library_marks;
create policy library_marks_update on public.library_marks for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists library_marks_delete on public.library_marks;
create policy library_marks_delete on public.library_marks for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.library_marks from anon, authenticated;
grant select, insert, update, delete on public.library_marks to authenticated;

-- ---------------------------------------------------------------------
-- Pessoal: progresso de leitura
-- ---------------------------------------------------------------------
create table if not exists public.library_progress (
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  topic_id      text not null references public.library_topics (id) on delete cascade,
  status        text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'done')),
  percent       integer not null default 0 check (percent between 0 and 100),
  last_block_id text,
  last_read_at  timestamptz not null default now(),
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (user_id, topic_id)
);
create index if not exists library_progress_recent_idx on public.library_progress (user_id, last_read_at desc);
drop trigger if exists library_progress_updated_at on public.library_progress;
create trigger library_progress_updated_at before update on public.library_progress
  for each row execute function public.set_updated_at();

alter table public.library_progress enable row level security;
drop policy if exists library_progress_select on public.library_progress;
create policy library_progress_select on public.library_progress for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists library_progress_insert on public.library_progress;
create policy library_progress_insert on public.library_progress for insert to authenticated
  with check (user_id = (select auth.uid()) and public.library_can_read());
drop policy if exists library_progress_update on public.library_progress;
create policy library_progress_update on public.library_progress for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists library_progress_delete on public.library_progress;
create policy library_progress_delete on public.library_progress for delete to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.library_progress from anon, authenticated;
grant select, insert, update, delete on public.library_progress to authenticated;

/**
 * Registra a leitura. O % só sobe (rolar para cima não apaga o que já foi lido);
 * a situação só muda quando a pessoa escolhe (p_status), exceto "não iniciado" → "em andamento" ao ler.
 */
create or replace function public.library_touch(p_topic text, p_percent integer default null,
                                                 p_block text default null, p_status text default null)
returns public.library_progress language plpgsql security invoker set search_path = '' as $$
declare r public.library_progress;
begin
  if p_status is not null and p_status not in ('not_started', 'in_progress', 'done') then
    raise exception 'Situação inválida.' using errcode = '22023';
  end if;
  insert into public.library_progress as lp (user_id, topic_id, status, percent, last_block_id, completed_at)
  values ((select auth.uid()), p_topic, coalesce(p_status, 'in_progress'),
          least(100, greatest(0, coalesce(p_percent, 0))), p_block,
          case when p_status = 'done' then now() end)
  on conflict (user_id, topic_id) do update set
    percent = case when p_status = 'not_started' then 0
                   else greatest(lp.percent, least(100, greatest(0, coalesce(p_percent, lp.percent)))) end,
    last_block_id = coalesce(p_block, lp.last_block_id),
    last_read_at = now(),
    status = case when p_status is not null then p_status
                  when lp.status = 'not_started' and coalesce(p_percent, 0) > 0 then 'in_progress'
                  else lp.status end,
    completed_at = case when p_status = 'done' then coalesce(lp.completed_at, now())
                        when p_status is not null then null
                        else lp.completed_at end
  returning * into r;
  return r;
end $$;
revoke all on function public.library_touch(text, integer, text, text) from public, anon;
grant execute on function public.library_touch(text, integer, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Importação (só a conta administradora)
-- ---------------------------------------------------------------------
create or replace function public.library_require_admin()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.question_admins where user_id = (select auth.uid())) then
    raise exception 'Só a conta administradora pode importar materiais.' using errcode = '42501';
  end if;
end $$;
revoke all on function public.library_require_admin() from public, anon;

/**
 * Passo 1: concurso, disciplina, fontes, capítulos e a árvore de tópicos (sem os blocos).
 * p_mode = 'discipline' arquiva capítulos e tópicos que não vieram; 'chapters' só mexe nos enviados.
 */
create or replace function public.library_import_structure(p jsonb, p_mode text default 'discipline')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_contest jsonb := p->'concurso';
  v_disc jsonb := p->'disciplina';
  v_disc_id text := v_disc->>'id';
  ch jsonb; tp jsonb; src jsonb;
  v_pos int := 0; v_ch_pos int := 0;
  v_chapters text[] := '{}'; v_topics text[] := '{}';
  v_new_ch int := 0; v_new_tp int := 0; v_archived int := 0; n int;
  v_base int;

begin
  perform public.library_require_admin();
  if p_mode not in ('discipline', 'chapters') then
    raise exception 'Modo inválido.' using errcode = '22023';
  end if;

  insert into public.library_contests (id, name, position)
  values (v_contest->>'id', btrim(v_contest->>'nome'), coalesce((v_contest->>'ordem')::int, 0))
  on conflict (id) do update set name = excluded.name, archived_at = null,
    position = case when v_contest ? 'ordem' then excluded.position else public.library_contests.position end;

  insert into public.library_disciplines (id, contest_id, name, description, position, imported_by)
  values (v_disc_id, v_contest->>'id', btrim(v_disc->>'nome'), nullif(btrim(v_disc->>'descricao'), ''),
          coalesce((v_disc->>'ordem')::int, 0), (select auth.uid()))
  on conflict (id) do update set contest_id = excluded.contest_id, name = excluded.name,
    description = excluded.description, archived_at = null, imported_by = excluded.imported_by,
    position = case when v_disc ? 'ordem' then excluded.position else public.library_disciplines.position end;

  for src in select value from jsonb_array_elements(coalesce(p->'fontes', '[]'::jsonb)) loop
    insert into public.library_sources (id, discipline_id, file_name, title)
    values (src->>'id', v_disc_id, btrim(src->>'arquivo'), nullif(btrim(src->>'titulo'), ''))
    on conflict (id) do update set discipline_id = excluded.discipline_id, file_name = excluded.file_name,
      title = excluded.title;
  end loop;

  -- Sem "ordem": no modo disciplina vale a ordem do arquivo; no modo capítulos, um capítulo que já existe
  -- mantém o lugar e um novo entra depois dos existentes. A ordem linear dos tópicos é refeita no fim.
  select coalesce(max(position), 0) into v_base from public.library_chapters where discipline_id = v_disc_id;
  for ch in select value from jsonb_array_elements(p->'capitulos') loop
    v_ch_pos := v_ch_pos + 1;
    insert into public.library_chapters (id, discipline_id, number, title, position)
    values (ch->>'id', v_disc_id, nullif(btrim(ch->>'numero'), ''), btrim(ch->>'titulo'),
            coalesce((ch->>'ordem')::int, case when p_mode = 'discipline' then v_ch_pos else v_base + v_ch_pos end))
    on conflict (id) do update set discipline_id = excluded.discipline_id, number = excluded.number,
      title = excluded.title, archived_at = null,
      position = case when ch ? 'ordem' or p_mode = 'discipline' then excluded.position
                      else public.library_chapters.position end
    returning (xmax = 0)::int into n;
    v_new_ch := v_new_ch + n;
    v_chapters := v_chapters || (ch->>'id');

    -- tópicos e subtópicos (árvore achatada em ordem de leitura)
    for tp in
      with recursive t(node, parent, depth, path) as (
        select value, null::text, 0, array[ordinality::int]
        from jsonb_array_elements(ch->'topicos') with ordinality
        union all
        select s.value, t.node->>'id', t.depth + 1, t.path || s.ordinality::int
        from t, jsonb_array_elements(coalesce(t.node->'subtopicos', '[]'::jsonb)) with ordinality s
        where t.depth < 3)
      select jsonb_build_object('id', node->>'id', 'numero', node->>'numero', 'titulo', node->>'titulo',
                                'parent', parent)
      from t order by path
    loop
      v_pos := v_pos + 1;
      insert into public.library_topics (id, chapter_id, discipline_id, parent_id, number, title, position)
      values (tp->>'id', ch->>'id', v_disc_id, tp->>'parent', nullif(btrim(tp->>'numero'), ''),
              btrim(tp->>'titulo'), v_pos)
      on conflict (id) do update set chapter_id = excluded.chapter_id, discipline_id = excluded.discipline_id,
        parent_id = excluded.parent_id, number = excluded.number, title = excluded.title,
        position = excluded.position, archived_at = null
      returning (xmax = 0)::int into n;
      v_new_tp := v_new_tp + n;
      v_topics := v_topics || (tp->>'id');
    end loop;
  end loop;

  if p_mode = 'discipline' then
    update public.library_topics set archived_at = now()
    where discipline_id = v_disc_id and archived_at is null and not (id = any (v_topics));
    get diagnostics n = row_count; v_archived := v_archived + n;
  else
    -- capítulos reenviados vêm completos: tópicos que saíram deles são arquivados
    update public.library_topics set archived_at = now()
    where chapter_id = any (v_chapters) and archived_at is null and not (id = any (v_topics));
    get diagnostics n = row_count; v_archived := v_archived + n;
  end if;
  if p_mode = 'discipline' then
    update public.library_chapters set archived_at = now()
    where discipline_id = v_disc_id and archived_at is null and not (id = any (v_chapters));
  end if;

  -- refaz a ordem linear: capítulo, depois a ordem dentro do capítulo
  with o as (
    select t.id, row_number() over (order by c.position, c.id, t.position) as rn
    from public.library_topics t join public.library_chapters c on c.id = t.chapter_id
    where t.discipline_id = v_disc_id and t.archived_at is null)
  update public.library_topics t set position = o.rn from o where o.id = t.id and t.position <> o.rn;

  return jsonb_build_object('chapters', array_length(v_chapters, 1), 'topics', array_length(v_topics, 1),
                            'new_chapters', v_new_ch, 'new_topics', v_new_tp, 'archived_topics', v_archived);
end $$;

/**
 * Passo 2: todos os blocos de um tópico (a lista é completa: o que não vier é arquivado).
 * Cada bloco traz anchor_text/search_text calculados pelo app com o mesmo código que desenha a tela.
 * Se o texto de um bloco mudou, as marcações dele são reposicionadas só quando o trecho marcado
 * aparece uma única vez no novo texto; senão ficam "para revisar". Nunca vão para outro bloco.
 */
create or replace function public.library_import_blocks(p_topic text, p_blocks jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b jsonb; v_pos int := 0; v_ids text[] := '{}';
  v_old public.library_blocks; v_hash text; v_text text;
  v_new int := 0; v_changed int := 0; v_same int := 0; v_moved int := 0; v_review int := 0; n int;
  m record; v_cnt int; v_at int;
begin
  perform public.library_require_admin();
  if not exists (select 1 from public.library_topics where id = p_topic) then
    raise exception 'Tópico % não existe. Importe a estrutura antes.', p_topic using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_blocks) is distinct from 'array' then
    raise exception 'Blocos devem ser uma lista.' using errcode = '22023';
  end if;

  for b in select value from jsonb_array_elements(p_blocks) loop
    v_pos := v_pos + 1;
    v_text := coalesce(b->>'anchor_text', '');
    v_hash := md5(v_text);
    select * into v_old from public.library_blocks where id = b->>'id';
    if found and v_old.topic_id <> p_topic and v_old.archived_at is null then
      raise exception 'O bloco % já pertence a outro tópico (%).', b->>'id', v_old.topic_id using errcode = '23505';
    end if;

    insert into public.library_blocks as lb (id, topic_id, position, kind, data, anchor_text, search_text,
                                             text_hash, sources)
    values (b->>'id', p_topic, v_pos, b->>'tipo', b->'dados', v_text, coalesce(b->>'search_text', v_text),
            v_hash, coalesce(b->'fontes', '[]'::jsonb))
    on conflict (id) do update set topic_id = excluded.topic_id, position = excluded.position,
      kind = excluded.kind, data = excluded.data, anchor_text = excluded.anchor_text,
      search_text = excluded.search_text, text_hash = excluded.text_hash, sources = excluded.sources,
      archived_at = null
    where (lb.topic_id, lb.position, lb.kind, lb.data, lb.anchor_text, lb.search_text, lb.sources, lb.archived_at)
      is distinct from (excluded.topic_id, excluded.position, excluded.kind, excluded.data, excluded.anchor_text,
                        excluded.search_text, excluded.sources, null::timestamptz);
    v_ids := v_ids || (b->>'id');

    if v_old.id is null then
      v_new := v_new + 1;
    elsif v_old.text_hash = v_hash then
      v_same := v_same + 1;
      -- bloco que voltou do arquivo com o mesmo texto: marcações em revisão voltam a valer se batem
      update public.library_marks set status = 'ok'
      where block_id = v_old.id and status = 'review'
        and substr(v_text, start_offset + 1, end_offset - start_offset) = quote;
    else
      v_changed := v_changed + 1;
      for m in select id, quote from public.library_marks where block_id = v_old.id loop
        v_cnt := (char_length(v_text) - char_length(replace(v_text, m.quote, ''))) / char_length(m.quote);
        if v_cnt = 1 then
          v_at := strpos(v_text, m.quote) - 1;
          update public.library_marks set start_offset = v_at, end_offset = v_at + char_length(m.quote),
                 status = 'ok' where id = m.id;
          v_moved := v_moved + 1;
        else
          update public.library_marks set status = 'review' where id = m.id;
          v_review := v_review + 1;
        end if;
      end loop;
    end if;
  end loop;

  -- blocos que saíram do tópico: arquivados; marcações ficam "para revisar"
  with gone as (
    update public.library_blocks set archived_at = now()
    where topic_id = p_topic and archived_at is null and not (id = any (v_ids))
    returning id)
  update public.library_marks set status = 'review' where block_id in (select id from gone);
  get diagnostics n = row_count; v_review := v_review + n;

  update public.library_topics set block_count = v_pos where id = p_topic;
  return jsonb_build_object('blocks', v_pos, 'new', v_new, 'changed', v_changed, 'unchanged', v_same,
                            'marks_moved', v_moved, 'marks_review', v_review);
end $$;

/** Arquiva (exclui da biblioteca) uma disciplina, capítulo ou tópico. Dados pessoais ficam guardados. */
create or replace function public.library_archive(p_kind text, p_id text, p_restore boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_at timestamptz := case when p_restore then null else now() end;
begin
  perform public.library_require_admin();
  if p_kind = 'discipline' then
    update public.library_disciplines set archived_at = v_at where id = p_id;
  elsif p_kind = 'chapter' then
    update public.library_chapters set archived_at = v_at where id = p_id;
    update public.library_topics set archived_at = v_at where chapter_id = p_id;
  elsif p_kind = 'topic' then
    update public.library_topics set archived_at = v_at where id = p_id or parent_id = p_id;
  else
    raise exception 'Tipo inválido.' using errcode = '22023';
  end if;
  if not found then
    raise exception 'Item não encontrado.' using errcode = 'P0002';
  end if;
end $$;

revoke all on function public.library_import_structure(jsonb, text) from public, anon;
revoke all on function public.library_import_blocks(text, jsonb) from public, anon;
revoke all on function public.library_archive(text, text, boolean) from public, anon;
grant execute on function public.library_import_structure(jsonb, text) to authenticated;
grant execute on function public.library_import_blocks(text, jsonb) to authenticated;
grant execute on function public.library_archive(text, text, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Leitura: visão geral com contagens e progresso da pessoa
-- ---------------------------------------------------------------------
drop function if exists public.library_overview();
create or replace function public.library_overview()
returns table (contest_id text, contest_name text, discipline_id text, discipline_name text,
               description text, chapters integer, topics integer, done integer, read_percent integer,
               last_topic_id text, last_read_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.name, d.id, d.name, d.description,
    (select count(*) from public.library_chapters ch where ch.discipline_id = d.id and ch.archived_at is null)::int,
    (select count(*) from public.library_topics t where t.discipline_id = d.id and t.archived_at is null)::int,
    (select count(*) from public.library_progress p join public.library_topics t on t.id = p.topic_id
      where p.user_id = (select auth.uid()) and t.discipline_id = d.id and t.archived_at is null
        and p.status = 'done')::int,
    coalesce((select round(sum(p.percent)::numeric / nullif(count(t.id), 0))
      from public.library_topics t
      left join public.library_progress p on p.topic_id = t.id and p.user_id = (select auth.uid())
      where t.discipline_id = d.id and t.archived_at is null), 0)::int,
    lp.topic_id, lp.last_read_at
  from public.library_disciplines d
  join public.library_contests c on c.id = d.contest_id
  left join lateral (
    select p.topic_id, p.last_read_at from public.library_progress p
    join public.library_topics t on t.id = p.topic_id
    where p.user_id = (select auth.uid()) and t.discipline_id = d.id and t.archived_at is null
    order by p.last_read_at desc limit 1) lp on true
  where d.archived_at is null and c.archived_at is null
  order by c.position, c.name, d.position, d.name;
$$;
revoke all on function public.library_overview() from public, anon;
grant execute on function public.library_overview() to authenticated;

-- ---------------------------------------------------------------------
-- Busca (títulos e conteúdo; sem IA)
-- ---------------------------------------------------------------------
drop function if exists public.library_search(text, text, integer);
create or replace function public.library_search(p_query text, p_discipline text default null,
                                                  p_limit integer default 40)
returns table (kind text, discipline_id text, discipline_name text, chapter_title text, topic_id text,
               topic_title text, block_id text, block_text text, rank real)
language plpgsql stable security invoker set search_path = '' as $$
declare
  v_q text := btrim(coalesce(p_query, ''));
  v_ts tsquery;
  v_norm text;
  v_like text;
begin
  if char_length(v_q) < 2 or not public.library_can_read() then
    return;
  end if;
  v_ts := websearch_to_tsquery('portuguese', public.f_unaccent(v_q));
  v_norm := lower(public.f_unaccent(v_q));
  -- uma palavra só: compara pelo radical aproximado ("licitacao" acha "Licitações")
  if v_norm !~ '\s' and char_length(v_norm) > 5 then
    v_norm := left(v_norm, char_length(v_norm) - 2);
  end if;
  v_like := '%' || replace(replace(replace(v_norm, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return query
  with titles as (
    select 'topic'::text as kind, d.id as did, d.name as dname, c.title as ctitle, t.id as tid, t.title as ttitle,
           null::text as bid, null::text as snip,
           (case when lower(public.f_unaccent(t.title)) like v_like then 3
                 when lower(public.f_unaccent(c.title)) like v_like then 2
                 else 1 end)::real as rk
    from public.library_topics t
    join public.library_chapters c on c.id = t.chapter_id
    join public.library_disciplines d on d.id = t.discipline_id
    where t.archived_at is null and c.archived_at is null and d.archived_at is null
      and (p_discipline is null or d.id = p_discipline)
      and (lower(public.f_unaccent(t.title)) like v_like or lower(public.f_unaccent(c.title)) like v_like
           or lower(public.f_unaccent(d.name)) like v_like)
    order by rk desc, d.position, t.position
    limit 15),
  blocks as (
    select 'block'::text, d.id, d.name, c.title, t.id, t.title, b.id,
           left(b.search_text, 4000),  -- o trecho com o termo destacado é montado no app
           ts_rank(b.search, v_ts)
    from public.library_blocks b
    join public.library_topics t on t.id = b.topic_id
    join public.library_chapters c on c.id = t.chapter_id
    join public.library_disciplines d on d.id = t.discipline_id
    where b.archived_at is null and t.archived_at is null and c.archived_at is null and d.archived_at is null
      and (p_discipline is null or d.id = p_discipline)
      and b.search @@ v_ts
    order by ts_rank(b.search, v_ts) desc, t.position, b.position
    limit greatest(1, least(coalesce(p_limit, 40), 100)))
  select * from titles
  union all
  select * from blocks;
end $$;
revoke all on function public.library_search(text, text, integer) from public, anon;
grant execute on function public.library_search(text, text, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Imagens das apostilas (bucket privado; só quem lê a biblioteca vê; só o admin envia)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('library', 'library', false, 5242880,
        array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/gif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists library_files_read on storage.objects;
create policy library_files_read on storage.objects for select to authenticated
  using (bucket_id = 'library' and public.library_can_read());
drop policy if exists library_files_insert on storage.objects;
create policy library_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'library'
              and exists (select 1 from public.question_admins where user_id = (select auth.uid())));
drop policy if exists library_files_update on storage.objects;
create policy library_files_update on storage.objects for update to authenticated
  using (bucket_id = 'library' and exists (select 1 from public.question_admins where user_id = (select auth.uid())));
drop policy if exists library_files_delete on storage.objects;
create policy library_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'library' and exists (select 1 from public.question_admins where user_id = (select auth.uid())));

notify pgrst, 'reload schema';
