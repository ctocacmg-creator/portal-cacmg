create extension if not exists "pgcrypto";

create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  cedula text unique not null,
  nombres text not null,
  grado text,
  grupo text,
  area text,
  distrito text,
  estado text default 'ACTIVO',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.puestos_operativos (
  id uuid primary key default gen_random_uuid(),
  id_puesto text unique not null,
  distrito text not null,
  circuito text,
  subcircuito text,
  sector text,
  numero_acm integer default 0,
  estado text default 'ACTIVO',
  created_at timestamptz default now()
);

create table if not exists public.asignaciones (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references public.personas(id),
  puesto_id uuid references public.puestos_operativos(id),
  cedula text not null,
  id_puesto text not null,
  grupo text,
  area text,
  funcion text,
  horario text,
  lugar_formacion text,
  base_legal text,
  observacion text,
  encargado text,
  fecha_inicio date not null,
  fecha_fin date,
  estado_asignacion text default 'ACTIVO',
  creado_por uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ausentismos (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references public.personas(id),
  cedula text not null,
  nombre text,
  tipo_ausentismo text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  dias integer,
  estado text default 'ACTIVO',
  documento_respaldo text,
  observacion text,
  registrado_por uuid references auth.users(id),
  fecha_registro timestamptz default now()
);

create table if not exists public.condiciones_especiales (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references public.personas(id),
  cedula text not null,
  nombre text,
  tipo_condicion text not null,
  fecha_inicio date not null,
  fecha_fin date,
  restriccion_operativa text,
  plan_trabajo text,
  puede_operativo text,
  estado text default 'ACTIVO',
  documento_respaldo text,
  observacion text,
  registrado_por uuid references auth.users(id),
  fecha_registro timestamptz default now()
);

create table if not exists public.auditoria (
  id bigserial primary key,
  modulo text not null,
  accion text not null,
  usuario_id uuid references auth.users(id),
  cedula text,
  detalle jsonb,
  ip text,
  user_agent text,
  created_at timestamptz default now()
);

create table if not exists public.perfiles (
  id uuid primary key references auth.users(id),
  email text unique not null,
  rol text not null,
  estado text default 'ACTIVO',
  created_at timestamptz default now()
);

create or replace view public.resumen_puestos_asignacion as
select
  p.id_puesto,
  p.distrito,
  p.numero_acm as acm_requeridos,
  count(a.id) filter (where a.estado_asignacion = 'ACTIVO') as acm_asignados,
  greatest(
    p.numero_acm - count(a.id) filter (where a.estado_asignacion = 'ACTIVO'),
    0
  ) as deficit,
  greatest(
    count(a.id) filter (where a.estado_asignacion = 'ACTIVO') - p.numero_acm,
    0
  ) as sobrecupo
from public.puestos_operativos p
left join public.asignaciones a
  on a.id_puesto = p.id_puesto
group by p.id_puesto, p.distrito, p.numero_acm;

alter table public.personas enable row level security;
alter table public.puestos_operativos enable row level security;
alter table public.asignaciones enable row level security;
alter table public.ausentismos enable row level security;
alter table public.condiciones_especiales enable row level security;
alter table public.auditoria enable row level security;
alter table public.perfiles enable row level security;