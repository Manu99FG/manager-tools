-- Ejecutar en Supabase SQL Editor antes de desplegar.
create table if not exists public.manager_media (
 entity_type text not null check(entity_type in ('club','competition')),
 entity_id text not null,
 storage_path text not null,
 updated_at timestamptz not null default now(),
 primary key(entity_type,entity_id)
);
alter table public.manager_media enable row level security;
-- La aplicación accede a esta tabla desde rutas autenticadas usando service_role.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('manager-media','manager-media',true,5242880,array['image/png','image/jpeg','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/png','image/jpeg','image/webp'];
