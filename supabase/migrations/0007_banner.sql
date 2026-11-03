-- =====================================================================
-- FOCO AÍ — Banner do painel
-- Cada pessoa escolhe: arte padrão, imagem própria ou nenhuma imagem.
-- A imagem fica no bucket privado "banners", na pasta <user_id>/, e só o dono
-- lê, grava, troca ou apaga. Pode ser rodado mais de uma vez.
-- =====================================================================

alter table public.profiles
  add column if not exists banner_style   text     not null default 'default',
  add column if not exists banner_path    text,
  add column if not exists banner_focus_x real     not null default 50,
  add column if not exists banner_focus_y real     not null default 50,
  add column if not exists banner_zoom    real     not null default 1,
  add column if not exists banner_overlay smallint not null default 35;

alter table public.profiles drop constraint if exists profiles_banner_style;
alter table public.profiles drop constraint if exists profiles_banner_custom;
alter table public.profiles drop constraint if exists profiles_banner_path_own;
alter table public.profiles drop constraint if exists profiles_banner_frame;

alter table public.profiles
  add constraint profiles_banner_style check (banner_style in ('default', 'custom', 'none')),
  -- Imagem própria exige um arquivo; os outros estilos não guardam arquivo.
  add constraint profiles_banner_custom check ((banner_style = 'custom') = (banner_path is not null)),
  add constraint profiles_banner_path_own
    check (banner_path is null or (banner_path like id::text || '/%' and char_length(banner_path) <= 200)),
  add constraint profiles_banner_frame check (
    banner_focus_x between 0 and 100 and banner_focus_y between 0 and 100
    and banner_zoom between 1 and 3 and banner_overlay between 0 and 85);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('banners', 'banners', false, 2097152, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists banners_select on storage.objects;
drop policy if exists banners_insert on storage.objects;
drop policy if exists banners_update on storage.objects;
drop policy if exists banners_delete on storage.objects;

create policy banners_select on storage.objects for select to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy banners_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy banners_update on storage.objects for update to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy banners_delete on storage.objects for delete to authenticated
  using (bucket_id = 'banners' and (storage.foldername(name))[1] = (select auth.uid())::text);
