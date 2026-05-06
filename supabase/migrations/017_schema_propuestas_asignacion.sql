create table if not exists public.propuestas_asignacion (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  estado text not null default 'BORRADOR',
  total_registros integer default 0,
  creado_por uuid,
  aplicado_por uuid,
  aplicado_at timestamptz,
  observacion text,
  detalle jsonb not null default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.propuestas_asignacion enable row level security;

create policy "Usuarios autenticados pueden ver propuestas de asignacion"
on public.propuestas_asignacion
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear propuestas de asignacion"
on public.propuestas_asignacion
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden actualizar propuestas de asignacion"
on public.propuestas_asignacion
for update
to authenticated
using (true)
with check (true);