-- ============================================================
-- Billiards & Snooker Association of Fiji — Supabase Storage setup
-- Run this in the SQL editor AFTER schema.sql, which defines
-- the public.is_admin() function these policies depend on.
--
-- Kept separate from schema.sql so that file stays exactly as
-- written. Running this twice is safe.
-- ============================================================

-- ------------------------------------------------------------
-- 1. THE BUCKET
--
-- Public, so an <img src> works without signing every URL —
-- these are tournament photos, not private records.
--
-- file_size_limit and allowed_mime_types are the server-side
-- half of the upload validation. The admin form checks the same
-- things before uploading, but that check is only a courtesy:
-- anyone holding the anon key can call the Storage API directly,
-- so the bucket has to enforce it too.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ------------------------------------------------------------
-- 2. POLICIES
--
-- Same shape as every table in schema.sql: the public may read,
-- only admins may write. RLS is already enabled on
-- storage.objects by Supabase, so these just add the rules.
--
-- Dropped first so re-running this file updates them rather than
-- failing on the duplicate name.
-- ------------------------------------------------------------
drop policy if exists "Public can view media files"   on storage.objects;
drop policy if exists "Admins can upload media files" on storage.objects;
drop policy if exists "Admins can update media files" on storage.objects;
drop policy if exists "Admins can delete media files" on storage.objects;

create policy "Public can view media files"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Admins can upload media files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy "Admins can update media files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy "Admins can delete media files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ------------------------------------------------------------
-- 3. CHECK IT WORKED
--
-- Expect one bucket row and four policies.
-- ------------------------------------------------------------
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'media';
--
-- select policyname from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--   order by policyname;
