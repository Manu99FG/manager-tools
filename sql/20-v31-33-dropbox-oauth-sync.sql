-- v31.33 · Dropbox OAuth + carpetas BASE / ACTUALIZADAS
-- Ejecutar una sola vez en Supabase.

create table if not exists public.dropbox_integrations (
  id text primary key,
  account_id text,
  email text,
  display_name text,
  refresh_token_enc text,
  base_folder_path text,
  base_files jsonb not null default '[]'::jsonb,
  live_folder_path text,
  connected_at timestamptz,
  updated_at timestamptz not null default now(),
  last_sync_at timestamptz,
  last_event_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  live_file_count integer
);

comment on table public.dropbox_integrations is
  'Configuración privada de Dropbox de esta instalación. Acceso únicamente mediante la service role del servidor.';

alter table public.dropbox_integrations enable row level security;

-- No se crean políticas públicas: el navegador no debe poder leer el refresh token.
-- Todas las operaciones pasan por rutas servidor con SUPABASE_SECRET_KEY.

create index if not exists dropbox_integrations_account_id_idx
  on public.dropbox_integrations(account_id);
