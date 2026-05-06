alter table public.ciclos_trabajo
add column if not exists anio integer,
add column if not exists mes_numero integer;