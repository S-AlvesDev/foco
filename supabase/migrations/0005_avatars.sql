-- =====================================================================
-- FOCO AÍ — Foto de perfil
-- Bucket privado "avatars". Cada pessoa grava só na própria pasta (<user_id>/...).
-- Ler: a própria foto e a da pessoa vinculada em Nossa Jornada.
-- Pode ser rodado mais de uma vez.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists avatars_select on storage.objects;
drop policy if exists avatars_insert on storage.objects;
drop policy if exists avatars_update on storage.objects;
drop policy if exists avatars_delete on storage.objects;

create policy avatars_select on storage.objects for select to authenticated
  using (bucket_id = 'avatars'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or (storage.foldername(name))[1] = public.partner_id()::text));

create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- O perfil só pode apontar para um arquivo da própria pasta.
alter table public.profiles drop constraint if exists profiles_avatar_path_own;
alter table public.profiles add constraint profiles_avatar_path_own
  check (avatar_path is null or (avatar_path like id::text || '/%' and char_length(avatar_path) <= 200));
