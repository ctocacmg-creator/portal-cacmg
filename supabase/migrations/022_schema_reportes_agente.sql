create table if not exists public.reportes_agente (
  id uuid primary key default gen_random_uuid(),
  cedula text not null,
  nombres text,
  grupo text,
  area text,
  tipo_solicitud text not null,
  detalle text not null,
  prioridad text not null default 'MEDIA',
  estado text not null default 'PENDIENTE',
  fecha_reporte date default current_date,
  origen text not null default 'PORTAL_AGENTE',
  user_agent text,
  ip_origen text,
  revisado_por uuid,
  revisado_at timestamptz,
  respuesta_admin text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reportes_agente_cedula
on public.reportes_agente (cedula);

create index if not exists idx_reportes_agente_estado
on public.reportes_agente (estado);

create index if not exists idx_reportes_agente_fecha
on public.reportes_agente (fecha_reporte);

alter table public.reportes_agente enable row level security;

drop policy if exists "Usuarios autenticados pueden ver reportes agente"
on public.reportes_agente;

drop policy if exists "Usuarios autenticados pueden actualizar reportes agente"
on public.reportes_agente;

create policy "Usuarios autenticados pueden ver reportes agente"
on public.reportes_agente
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden actualizar reportes agente"
on public.reportes_agente
for update
to authenticated
using (true)
with check (true);