alter table public.ciclos_trabajo
add column if not exists mes text,
add column if not exists grupo text,
add column if not exists dias_plan jsonb;