-- =====================================================================
-- FOCO AÍ — Etapa 6: busca de anotações sem diferenciar acentos
-- "duvida" encontra "dúvida"; "concurso" encontra "concursos".
-- =====================================================================

create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

-- Wrapper imutável (exigido por colunas geradas e índices). Security definer: quem
-- salva a anotação não precisa de acesso ao schema extensions.
create or replace function public.f_unaccent(text)
returns text language sql immutable parallel safe strict security definer set search_path = '' as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1);
$$;

-- Recria a coluna de busca com o texto sem acentos (os dados são recalculados sozinhos).
alter table public.study_notes drop column if exists search;
alter table public.study_notes add column search tsvector generated always as (
  setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(title, ''))), 'A') ||
  setweight(to_tsvector('portuguese', public.f_unaccent(coalesce(topic, ''))), 'B') ||
  setweight(to_tsvector('portuguese', public.f_unaccent(content_text)), 'C')
) stored;
create index if not exists study_notes_search_idx on public.study_notes using gin (search);

revoke execute on function public.f_unaccent(text) from public, anon;
grant execute on function public.f_unaccent(text) to authenticated;
