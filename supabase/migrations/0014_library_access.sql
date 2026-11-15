-- =====================================================================
-- 0014 — Solicitações de acesso à Biblioteca, por concurso
--
-- Antes: só a conta administradora e quem está no mesmo espaço da Nossa
-- Jornada liam a Biblioteca (acesso total — continua igual).
-- Agora: qualquer conta pode pedir acesso a um concurso (PRF, PC-RN, PMPE...).
-- A conta administradora vê os pedidos e permite ou nega. Quem foi permitido
-- lê só as apostilas daquele concurso (mais as disciplinas de outros concursos
-- que o plano de metas dele usa, gravadas na aprovação) e segue o plano.
--
-- Cria a tabela library_access e troca as regras de leitura do catálogo.
-- Não apaga dados. Pode ser rodado mais de uma vez.
-- =====================================================================

create table if not exists public.library_access (
  user_id           uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  contest_id        text not null references public.library_contests (id) on delete cascade,
  status            text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  message           text check (char_length(message) <= 300),
  extra_disciplines text[] not null default '{}',
  requested_at      timestamptz not null default now(),
  decided_at        timestamptz,
  decided_by        uuid references public.profiles (id) on delete set null,
  primary key (user_id, contest_id)
);
create index if not exists library_access_pending_idx on public.library_access (requested_at) where status = 'pending';

alter table public.library_access enable row level security;
drop policy if exists library_access_select on public.library_access;
create policy library_access_select on public.library_access for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.question_admins where user_id = (select auth.uid())));
revoke all on public.library_access from anon, authenticated;
grant select on public.library_access to authenticated;   -- escrita só pelas funções abaixo

-- ---------------------------------------------------------------------
-- Quem lê o quê
-- ---------------------------------------------------------------------
/** Acesso total: conta administradora ou quem está no mesmo espaço da Nossa Jornada que ela. */
create or replace function public.library_full_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.question_admins where user_id = (select auth.uid()))
      or exists (
        select 1
        from public.couple_members me
        join public.couple_members other on other.couple_id = me.couple_id
        join public.question_admins qa on qa.user_id = other.user_id
        where me.user_id = (select auth.uid()));
$$;
revoke all on function public.library_full_access() from public, anon;
grant execute on function public.library_full_access() to authenticated;

/** Pode ler alguma parte da Biblioteca (total ou ao menos um concurso permitido). */
create or replace function public.library_can_read()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.library_full_access()
      or exists (select 1 from public.library_access
                 where user_id = (select auth.uid()) and status = 'approved');
$$;
revoke all on function public.library_can_read() from public, anon;
grant execute on function public.library_can_read() to authenticated;

create or replace function public.library_my_contests()
returns setof text language sql stable security definer set search_path = '' as $$
  select c.id from public.library_contests c where public.library_full_access()
  union
  select a.contest_id from public.library_access a
  where a.user_id = (select auth.uid()) and a.status = 'approved';
$$;
revoke all on function public.library_my_contests() from public, anon;
grant execute on function public.library_my_contests() to authenticated;

create or replace function public.library_my_disciplines()
returns setof text language sql stable security definer set search_path = '' as $$
  select d.id from public.library_disciplines d where d.contest_id in (select public.library_my_contests())
  union
  select unnest(a.extra_disciplines) from public.library_access a
  where a.user_id = (select auth.uid()) and a.status = 'approved';
$$;
revoke all on function public.library_my_disciplines() from public, anon;
grant execute on function public.library_my_disciplines() to authenticated;

create or replace function public.library_my_topics()
returns setof text language sql stable security definer set search_path = '' as $$
  select t.id from public.library_topics t where t.discipline_id in (select public.library_my_disciplines());
$$;
revoke all on function public.library_my_topics() from public, anon;
grant execute on function public.library_my_topics() to authenticated;

-- Catálogo: o nome dos concursos é visível para todos (para poderem pedir acesso);
-- o resto, só do que a pessoa pode ler.
drop policy if exists library_contests_select on public.library_contests;
create policy library_contests_select on public.library_contests for select to authenticated using (true);

drop policy if exists library_disciplines_select on public.library_disciplines;
create policy library_disciplines_select on public.library_disciplines for select to authenticated
  using ((select public.library_full_access()) or contest_id in (select public.library_my_contests())
         or id in (select public.library_my_disciplines()));

do $$
declare t text;
begin
  foreach t in array array['library_sources', 'library_chapters', 'library_topics'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated
                      using ((select public.library_full_access())
                             or discipline_id in (select public.library_my_disciplines()))', t || '_select', t);
  end loop;
end $$;

drop policy if exists library_blocks_select on public.library_blocks;
create policy library_blocks_select on public.library_blocks for select to authenticated
  using ((select public.library_full_access()) or topic_id in (select public.library_my_topics()));

do $$
declare t text;
begin
  foreach t in array array['library_topic_meta', 'library_topic_links'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_read', t);
      execute format('create policy %I on public.%I for select to authenticated
                        using ((select public.library_full_access())
                               or topic_id in (select public.library_my_topics()))', t || '_read', t);
    end if;
  end loop;
end $$;

-- Marcações e progresso: só em tópicos que a pessoa pode ler.
drop policy if exists library_marks_insert on public.library_marks;
create policy library_marks_insert on public.library_marks for insert to authenticated
  with check (user_id = (select auth.uid())
              and ((select public.library_full_access()) or topic_id in (select public.library_my_topics())));
drop policy if exists library_progress_insert on public.library_progress;
create policy library_progress_insert on public.library_progress for insert to authenticated
  with check (user_id = (select auth.uid())
              and ((select public.library_full_access()) or topic_id in (select public.library_my_topics())));

-- Imagens das apostilas (pasta = id da disciplina)
drop policy if exists library_files_read on storage.objects;
create policy library_files_read on storage.objects for select to authenticated
  using (bucket_id = 'library'
         and ((select public.library_full_access())
              or split_part(name, '/', 1) in (select public.library_my_disciplines())));

-- ---------------------------------------------------------------------
-- Pedir, cancelar, decidir
-- ---------------------------------------------------------------------
create or replace function public.library_request_access(p_contest text, p_message text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_name text;
  v_who text;
  v_status text;
  v_msg text := nullif(btrim(coalesce(p_message, '')), '');
  r record;
begin
  if v_me is null then
    raise exception 'Entre na sua conta para pedir acesso.' using errcode = '42501';
  end if;
  if public.library_full_access() then
    raise exception 'Você já tem acesso a toda a Biblioteca.' using errcode = '22023';
  end if;
  select name into v_name from public.library_contests where id = p_contest and archived_at is null;
  if v_name is null then
    raise exception 'Concurso não encontrado.' using errcode = '22023';
  end if;
  if char_length(coalesce(v_msg, '')) > 300 then
    raise exception 'A mensagem pode ter até 300 caracteres.' using errcode = '22023';
  end if;

  select status into v_status from public.library_access where user_id = v_me and contest_id = p_contest for update;
  if v_status = 'approved' then
    return 'approved';
  elsif v_status = 'pending' then
    update public.library_access set message = v_msg where user_id = v_me and contest_id = p_contest;
    return 'pending';
  elsif v_status = 'denied' then
    update public.library_access
       set status = 'pending', message = v_msg, requested_at = now(), decided_at = null, decided_by = null,
           extra_disciplines = '{}'
     where user_id = v_me and contest_id = p_contest;
  else
    insert into public.library_access (user_id, contest_id, message) values (v_me, p_contest, v_msg);
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), 'Alguém') into v_who from public.profiles p where p.id = v_me;
  for r in select user_id from public.question_admins loop
    perform public.notify(r.user_id, 'system', 'Nova solicitação de acesso',
                          left(coalesce(v_who, 'Alguém') || ' pediu acesso à Biblioteca de ' || v_name || '.', 500),
                          '/biblioteca/solicitacoes',
                          'access:' || v_me || ':' || p_contest || ':' || floor(extract(epoch from now())));
  end loop;
  return 'pending';
end $$;
revoke all on function public.library_request_access(text, text) from public, anon;
grant execute on function public.library_request_access(text, text) to authenticated;

/** Cancela um pedido que ainda está aguardando. */
create or replace function public.library_cancel_request(p_contest text)
returns void language sql security definer set search_path = '' as $$
  delete from public.library_access
  where user_id = (select auth.uid()) and contest_id = p_contest and status = 'pending';
$$;
revoke all on function public.library_cancel_request(text) from public, anon;
grant execute on function public.library_cancel_request(text) to authenticated;

/**
 * A conta administradora permite (approved) ou nega (denied) um pedido. Negar um acesso já
 * permitido remove o acesso. p_extra: disciplinas de outros concursos que o plano daquele concurso usa.
 */
create or replace function public.library_decide_access(p_user uuid, p_contest text, p_status text,
                                                        p_extra text[] default '{}')
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := (select auth.uid());
  v_old text;
  v_name text;
  v_extra text[];
begin
  if not exists (select 1 from public.question_admins where user_id = v_me) then
    raise exception 'Só a conta administradora decide os pedidos de acesso.' using errcode = '42501';
  end if;
  if p_status not in ('approved', 'denied') then
    raise exception 'Decisão inválida.' using errcode = '22023';
  end if;
  select status into v_old from public.library_access where user_id = p_user and contest_id = p_contest for update;
  if v_old is null then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;
  select coalesce(array_agg(d.id order by d.id), '{}') into v_extra
    from public.library_disciplines d
   where d.id = any (coalesce(p_extra, '{}')) and d.contest_id <> p_contest;

  update public.library_access
     set status = p_status, decided_at = now(), decided_by = v_me,
         extra_disciplines = case when p_status = 'approved' then v_extra else '{}' end
   where user_id = p_user and contest_id = p_contest;

  if v_old is distinct from p_status then
    select name into v_name from public.library_contests where id = p_contest;
    if p_status = 'approved' then
      perform public.notify(p_user, 'system', 'Acesso liberado',
                            'Você já pode estudar as apostilas e o plano de metas de ' || v_name || '.',
                            '/biblioteca?c=' || p_contest,
                            'access-ok:' || p_contest || ':' || floor(extract(epoch from now())));
    elsif v_old = 'approved' then
      perform public.notify(p_user, 'system', 'Acesso encerrado',
                            'Seu acesso à Biblioteca de ' || v_name || ' foi encerrado.',
                            '/biblioteca',
                            'access-off:' || p_contest || ':' || floor(extract(epoch from now())));
    else
      perform public.notify(p_user, 'system', 'Pedido de acesso não aprovado',
                            'Seu pedido de acesso à Biblioteca de ' || v_name || ' não foi aprovado.',
                            '/biblioteca',
                            'access-no:' || p_contest || ':' || floor(extract(epoch from now())));
    end if;
  end if;
  return p_status;
end $$;
revoke all on function public.library_decide_access(uuid, text, text, text[]) from public, anon;
grant execute on function public.library_decide_access(uuid, text, text, text[]) to authenticated;

/** Lista de pedidos para a conta administradora (com nome e e-mail de quem pediu). */
create or replace function public.library_access_requests()
returns table (user_id uuid, display_name text, email text, avatar_path text, contest_id text,
               contest_name text, status text, message text, requested_at timestamptz, decided_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.question_admins qa where qa.user_id = (select auth.uid())) then
    raise exception 'Só a conta administradora vê os pedidos de acesso.' using errcode = '42501';
  end if;
  return query
    select a.user_id, p.display_name, u.email::text, p.avatar_path, a.contest_id, c.name, a.status, a.message,
           a.requested_at, a.decided_at
    from public.library_access a
    join public.profiles p on p.id = a.user_id
    join auth.users u on u.id = a.user_id
    join public.library_contests c on c.id = a.contest_id
    order by (a.status = 'pending') desc, a.requested_at desc;
end $$;
revoke all on function public.library_access_requests() from public, anon;
grant execute on function public.library_access_requests() to authenticated;

notify pgrst, 'reload schema';
