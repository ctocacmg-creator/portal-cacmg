create table if not exists public.cad_novedades (
  id uuid primary key default gen_random_uuid(),
  id_novedad text unique,
  fecha date not null,
  hora time,
  tipo_novedad text,
  prioridad text,
  distrito text,
  circuito text,
  subcircuito text,
  id_puesto text,
  cedula_reporta text,
  nombre_reporta text,
  descripcion text,
  accion_tomada text,
  estado_novedad text default 'ABIERTA',
  asignado_a text,
  fecha_cierre date,
  hora_cierre time,
  evidencia_url text,
  registrado_por uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cad_bitacora_novedades (
  id uuid primary key default gen_random_uuid(),
  novedad_id uuid references public.cad_novedades(id),
  accion text not null,
  estado_anterior text,
  estado_nuevo text,
  comentario text,
  registrado_por uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists public.cad_apoyos_novedades (
  id uuid primary key default gen_random_uuid(),
  novedad_id uuid references public.cad_novedades(id),
  cedula text,
  nombre text,
  distrito text,
  id_puesto_origen text,
  id_puesto_destino text,
  tipo_apoyo text,
  estado_apoyo text default 'ACTIVO',
  observacion text,
  asignado_por uuid references auth.users(id),
  fecha_cierre date,
  hora_cierre time,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cad_estado_tiempo_real (
  id uuid primary key default gen_random_uuid(),
  id_puesto text,
  distrito text,
  circuito text,
  subcircuito text,
  cedula text,
  nombre text,
  estado_operativo text default 'DISPONIBLE',
  ubicacion_referencial text,
  ultima_actualizacion timestamptz default now(),
  observacion text
);

alter table public.cad_novedades enable row level security;
alter table public.cad_bitacora_novedades enable row level security;
alter table public.cad_apoyos_novedades enable row level security;
alter table public.cad_estado_tiempo_real enable row level security;

create policy "Usuarios autenticados pueden ver novedades CAD"
on public.cad_novedades
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear novedades CAD"
on public.cad_novedades
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden actualizar novedades CAD"
on public.cad_novedades
for update
to authenticated
using (true)
with check (true);

create policy "Usuarios autenticados pueden ver bitacora CAD"
on public.cad_bitacora_novedades
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear bitacora CAD"
on public.cad_bitacora_novedades
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden ver apoyos CAD"
on public.cad_apoyos_novedades
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear apoyos CAD"
on public.cad_apoyos_novedades
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden actualizar apoyos CAD"
on public.cad_apoyos_novedades
for update
to authenticated
using (true)
with check (true);

create policy "Usuarios autenticados pueden ver estado tiempo real CAD"
on public.cad_estado_tiempo_real
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear estado tiempo real CAD"
on public.cad_estado_tiempo_real
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden actualizar estado tiempo real CAD"
on public.cad_estado_tiempo_real
for update
to authenticated
using (true)
with check (true);