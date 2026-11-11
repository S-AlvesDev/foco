-- =====================================================================
-- 0013 — Plano de metas
--
-- O plano em si (as metas, a ordem e os tópicos de cada uma) fica no código.
-- O progresso de leitura vem de library_progress. Esta tabela guarda só o que
-- a pessoa marca à mão: revisões gerais e itens de questões ou de revisão.
--
-- Não altera tabelas existentes. Pode ser rodado mais de uma vez.
-- =====================================================================

create table if not exists public.study_plan_marks (
  user_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  plan_id  text not null check (plan_id ~ '^[a-z0-9][a-z0-9_-]{0,59}$'),
  meta     text not null check (meta ~ '^[A-Za-z0-9]{1,8}$'),
  item     smallint not null default 0 check (item between 0 and 20),
  done_at  timestamptz not null default now(),
  primary key (user_id, plan_id, meta, item)
);

alter table public.study_plan_marks enable row level security;

drop policy if exists study_plan_marks_own on public.study_plan_marks;
create policy study_plan_marks_own on public.study_plan_marks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.study_plan_marks to authenticated;
