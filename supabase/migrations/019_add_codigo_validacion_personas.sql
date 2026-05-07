alter table public.personas
add column if not exists codigo_validacion text;

create index if not exists idx_personas_codigo_validacion
on public.personas (codigo_validacion);