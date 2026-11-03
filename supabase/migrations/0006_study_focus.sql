-- =====================================================================
-- FOCO AÍ — Objetivo atual (ex.: "Preparação PRF")
-- Tabela própria, visível só para o dono: o perfil é lido pela pessoa vinculada
-- em Nossa Jornada, e o objetivo não faz parte do que é compartilhado.
-- Não altera dados existentes. Pode ser rodado mais de uma vez.
-- =====================================================================

create table if not exists public.study_focus (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 80 and title = btrim(title)),
  updated_at timestamptz not null default now()
);

alter table public.study_focus enable row level security;

drop policy if exists study_focus_select_own on public.study_focus;
drop policy if exists study_focus_insert_own on public.study_focus;
drop policy if exists study_focus_update_own on public.study_focus;
drop policy if exists study_focus_delete_own on public.study_focus;

create policy study_focus_select_own on public.study_focus for select to authenticated
  using (user_id = (select auth.uid()));
create policy study_focus_insert_own on public.study_focus for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy study_focus_update_own on public.study_focus for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy study_focus_delete_own on public.study_focus for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.study_focus from anon;
grant select, insert, update, delete on public.study_focus to authenticated;
