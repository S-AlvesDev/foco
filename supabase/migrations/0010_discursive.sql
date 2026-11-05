-- =====================================================================
-- MISSÃO ALPHA-01 — Questões discursivas
--
-- * questions.tipo aceita 'discursiva': sem alternativas nem gabarito de letra,
--   com a resposta esperada em resposta_esperada.
-- * question_attempts.response guarda o que a pessoa escreveu. Na discursiva a
--   própria pessoa compara com a resposta esperada e marca C (acertei) ou E (errei).
--
-- Requer a 0009. Não apaga dados. Pode ser rodado mais de uma vez.
-- =====================================================================

alter table public.questions
  add column if not exists resposta_esperada text check (char_length(resposta_esperada) <= 20000);
alter table public.questions alter column gabarito drop not null;

alter table public.questions drop constraint if exists questions_tipo_check;
alter table public.questions drop constraint if exists questions_answer_shape;
alter table public.questions
  add constraint questions_tipo_check check (tipo in ('certo_errado', 'multipla_escolha', 'discursiva')),
  add constraint questions_answer_shape check (
    (tipo = 'certo_errado' and gabarito in ('C', 'E') and alternativas is null)
    or (tipo = 'multipla_escolha' and gabarito ~ '^[A-E]$'
        and jsonb_typeof(alternativas) = 'object' and alternativas ? gabarito)
    or (tipo = 'discursiva' and gabarito is null and alternativas is null
        and char_length(btrim(coalesce(resposta_esperada, ''))) > 0));

alter table public.question_attempts
  add column if not exists response text check (response is null or char_length(response) <= 10000);

-- ---------------------------------------------------------------------
-- Importação (agora com resposta_esperada)
-- ---------------------------------------------------------------------
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
        justificativa, explicacoes_incorretas, resposta_esperada, origem, fonte, referencias, licenca, lote_producao,
        versao_schema, data_producao, status_revisao, imported_by)
      values (
        btrim(v_id), lower(btrim(it->>'area')), btrim(it->>'concurso'), nullif(btrim(it->>'cargo'), ''),
        nullif(btrim(it->>'curso_referencia'), ''), nullif(btrim(it->>'especialidade_referencia'), ''),
        btrim(it->>'disciplina'), btrim(it->>'assunto'), nullif(btrim(it->>'subassunto'), ''),
        nullif(btrim(it->>'banca_referencia'), ''), it->>'tipo', it->>'dificuldade', it->>'enunciado',
        case when jsonb_typeof(it->'alternativas') = 'object' then it->'alternativas' end,
        nullif(upper(btrim(it->>'gabarito')), ''), it->>'comentario', it->>'justificativa',
        case when jsonb_typeof(it->'explicacoes_incorretas') = 'object' then it->'explicacoes_incorretas' end,
        nullif(btrim(it->>'resposta_esperada'), ''),
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
        explicacoes_incorretas = excluded.explicacoes_incorretas, resposta_esperada = excluded.resposta_esperada,
        origem = excluded.origem,
        fonte = excluded.fonte, referencias = excluded.referencias, licenca = excluded.licenca,
        lote_producao = excluded.lote_producao, versao_schema = excluded.versao_schema,
        data_producao = excluded.data_producao, status_revisao = excluded.status_revisao,
        imported_by = excluded.imported_by
      where (q.area, q.concurso, q.cargo, q.curso_referencia, q.especialidade_referencia, q.disciplina,
             q.assunto, q.subassunto, q.banca_referencia, q.tipo, q.dificuldade, q.enunciado, q.alternativas,
             q.gabarito, q.comentario, q.justificativa, q.explicacoes_incorretas, q.resposta_esperada, q.origem, q.fonte,
             q.referencias, q.licenca, q.lote_producao, q.versao_schema, q.data_producao, q.status_revisao)
        is distinct from
            (excluded.area, excluded.concurso, excluded.cargo, excluded.curso_referencia,
             excluded.especialidade_referencia, excluded.disciplina, excluded.assunto, excluded.subassunto,
             excluded.banca_referencia, excluded.tipo, excluded.dificuldade, excluded.enunciado,
             excluded.alternativas, excluded.gabarito, excluded.comentario, excluded.justificativa,
             excluded.explicacoes_incorretas, excluded.resposta_esperada, excluded.origem, excluded.fonte, excluded.referencias,
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
-- Respostas: na discursiva, C = acertei e E = errei (autoavaliação)
-- ---------------------------------------------------------------------
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
  if q.tipo in ('certo_errado', 'discursiva') and new.answer not in ('C', 'E') then
    raise exception 'Responda com Certo ou Errado.' using errcode = '22023';
  end if;
  if q.tipo = 'multipla_escolha' and not (q.alternativas ? new.answer) then
    raise exception 'Alternativa inexistente.' using errcode = '22023';
  end if;
  if q.tipo <> 'discursiva' then
    new.response := null;
  end if;
  new.is_correct := case when q.tipo = 'discursiva' then new.answer = 'C' else new.answer = q.gabarito end;
  select p.timezone into v_tz from public.profiles p where p.id = new.user_id;
  new.created_at := now();
  new.answered_on := (now() at time zone coalesce(v_tz, 'America/Sao_Paulo'))::date;
  return new;
end $$;

revoke all on function public.question_attempts_defaults() from public, anon, authenticated;
revoke all on function public.import_questions(jsonb) from public, anon;
grant execute on function public.import_questions(jsonb) to authenticated;

-- Avisa a API do Supabase para enxergar as colunas novas.
notify pgrst, 'reload schema';
