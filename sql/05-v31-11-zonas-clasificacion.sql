-- ============================================================
-- V31.11 · ZONAS CONFIGURABLES DE CLASIFICACIÓN
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.competition_standing_zones (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  label text not null,
  start_position integer not null check (start_position >= 1),
  end_position integer not null check (end_position >= start_position),
  color varchar(7) not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_competition_standing_zones_competition
  on public.competition_standing_zones (competition_id, sort_order, start_position);

create or replace function public.replace_competition_standing_zones(
  p_competition_id uuid,
  p_zones jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  zone jsonb;
  v_label text;
  v_start integer;
  v_end integer;
  v_color text;
  v_sort integer;
  previous_end integer := 0;
begin
  if p_competition_id is null then
    raise exception 'Falta competition_id';
  end if;

  if p_zones is null or jsonb_typeof(p_zones) <> 'array' then
    raise exception 'p_zones debe ser un array JSON';
  end if;

  -- Validación antes de borrar: rangos, colores y solapamientos.
  for zone in
    select value
    from jsonb_array_elements(p_zones)
    order by (value->>'start_position')::integer
  loop
    v_label := btrim(coalesce(zone->>'label', ''));
    v_start := (zone->>'start_position')::integer;
    v_end := (zone->>'end_position')::integer;
    v_color := upper(btrim(coalesce(zone->>'color', '')));

    if v_label = '' then
      raise exception 'Una zona no tiene nombre';
    end if;

    if v_start < 1 or v_end < v_start then
      raise exception 'Rango inválido en %', v_label;
    end if;

    if v_color !~ '^#[0-9A-F]{6}$' then
      raise exception 'Color inválido en %', v_label;
    end if;

    if previous_end > 0 and v_start <= previous_end then
      raise exception 'Las zonas de clasificación no pueden solaparse';
    end if;

    previous_end := v_end;
  end loop;

  delete from public.competition_standing_zones
  where competition_id = p_competition_id;

  for zone in
    select value
    from jsonb_array_elements(p_zones)
  loop
    v_label := btrim(zone->>'label');
    v_start := (zone->>'start_position')::integer;
    v_end := (zone->>'end_position')::integer;
    v_color := upper(btrim(zone->>'color'));
    v_sort := coalesce((zone->>'sort_order')::integer, 0);

    insert into public.competition_standing_zones (
      competition_id,
      label,
      start_position,
      end_position,
      color,
      sort_order
    )
    values (
      p_competition_id,
      v_label,
      v_start,
      v_end,
      v_color,
      v_sort
    );
  end loop;
end;
$$;

revoke all on function public.replace_competition_standing_zones(uuid, jsonb)
from public;

grant execute
on function public.replace_competition_standing_zones(uuid, jsonb)
to service_role;
