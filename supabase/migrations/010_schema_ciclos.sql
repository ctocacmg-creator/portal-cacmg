create table if not exists public.ciclos_trabajo (
  id uuid primary key default gen_random_uuid(),
  nombre_ciclo text not null,
  tipo_ciclo text,
  dias_trabajo integer,
  dias_descanso integer,
  descripcion text,
  estado text default 'ACTIVO',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.grupos_trabajo (
  id uuid primary key default gen_random_uuid(),
  nombre_grupo text not null unique,
  ciclo_id uuid references public.ciclos_trabajo(id),
  tipo_ciclo text,
  descripcion text,
  estado text default 'ACTIVO',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.cronograma_trabajo (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  nombre_grupo text not null,
  tipo_ciclo text,
  estado_turno text,
  hora_inicio time,
  hora_fin time,
  observacion text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (fecha, nombre_grupo, tipo_ciclo)
);

alter table public.ciclos_trabajo enable row level security;
alter table public.grupos_trabajo enable row level security;
alter table public.cronograma_trabajo enable row level security;

create policy "Usuarios autenticados pueden ver ciclos"
on public.ciclos_trabajo
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden ver grupos de trabajo"
on public.grupos_trabajo
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden ver cronograma de trabajo"
on public.cronograma_trabajo
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear ciclos"
on public.ciclos_trabajo
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden crear grupos de trabajo"
on public.grupos_trabajo
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden crear cronograma de trabajo"
on public.cronograma_trabajo
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden actualizar ciclos"
on public.ciclos_trabajo
for update
to authenticated
using (true)
with check (true);

create policy "Usuarios autenticados pueden actualizar grupos de trabajo"
on public.grupos_trabajo
for update
to authenticated
using (true)
with check (true);

create policy "Usuarios autenticados pueden actualizar cronograma de trabajo"
on public.cronograma_trabajo
for update
to authenticated
using (true)
with check (true);