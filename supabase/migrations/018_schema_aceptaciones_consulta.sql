create table if not exists public.aceptaciones_consulta (
  id uuid primary key default gen_random_uuid(),
  cedula text not null,
  version_documento text not null,
  aceptado boolean not null default true,
  ip_origen text,
  user_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_aceptaciones_consulta_cedula
on public.aceptaciones_consulta (cedula);

create index if not exists idx_aceptaciones_consulta_version
on public.aceptaciones_consulta (version_documento);

alter table public.aceptaciones_consulta enable row level security;

drop policy if exists "Usuarios autenticados pueden ver aceptaciones consulta"
on public.aceptaciones_consulta;

drop policy if exists "Usuarios autenticados pueden crear aceptaciones consulta"
on public.aceptaciones_consulta;

create policy "Usuarios autenticados pueden ver aceptaciones consulta"
on public.aceptaciones_consulta
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden crear aceptaciones consulta"
on public.aceptaciones_consulta
for insert
to authenticated
with check (true);