insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'recordings',
  'recordings',
  false,
  10485760,
  array[
    'audio/webm',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;


drop policy if exists
  "recordings_insert_own_player"
on storage.objects;

create policy "recordings_insert_own_player"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'recordings'
  and exists (
    select 1
    from public.players p
    where p.id::text = (storage.foldername(name))[3]
      and p.user_id = auth.uid()
      and p.left_at is null
      and p.lobby_id::text =
        (storage.foldername(name))[1]
  )
);


drop policy if exists
  "recordings_select_lobby_members"
on storage.objects;

create policy "recordings_select_lobby_members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'recordings'
  and exists (
    select 1
    from public.players member
    where member.lobby_id::text =
      (storage.foldername(name))[1]
      and member.user_id = auth.uid()
      and member.left_at is null
  )
);


drop policy if exists
  "recordings_update_own_player"
on storage.objects;

create policy "recordings_update_own_player"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'recordings'
  and exists (
    select 1
    from public.players p
    where p.id::text = (storage.foldername(name))[3]
      and p.user_id = auth.uid()
      and p.left_at is null
  )
)
with check (
  bucket_id = 'recordings'
  and exists (
    select 1
    from public.players p
    where p.id::text = (storage.foldername(name))[3]
      and p.user_id = auth.uid()
      and p.left_at is null
      and p.lobby_id::text =
        (storage.foldername(name))[1]
  )
);


drop policy if exists
  "recordings_delete_own_or_host"
on storage.objects;

create policy "recordings_delete_own_or_host"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'recordings'
  and (
    exists (
      select 1
      from public.players p
      where p.id::text =
        (storage.foldername(name))[3]
        and p.user_id = auth.uid()
    )
    or public.is_lobby_host(
      ((storage.foldername(name))[1])::uuid
    )
  )
);
