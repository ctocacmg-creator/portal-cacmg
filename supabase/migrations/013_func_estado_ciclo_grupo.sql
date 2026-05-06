create or replace function public.fn_estado_grupo_en_fecha(
  p_grupo text,
  p_fecha date
)
returns table (
  grupo text,
  fecha date,
  anio integer,
  mes_numero integer,
  dia integer,
  nombre_ciclo text,
  estado_dia text
)
language sql
stable
as $$
  select
    c.grupo,
    p_fecha as fecha,
    c.anio,
    c.mes_numero,
    extract(day from p_fecha)::integer as dia,
    c.nombre_ciclo,
    c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer) as estado_dia
  from public.ciclos_trabajo c
  where upper(trim(c.grupo)) = upper(trim(p_grupo))
    and c.anio = extract(year from p_fecha)::integer
    and c.mes_numero = extract(month from p_fecha)::integer
    and coalesce(c.estado, 'ACTIVO') = 'ACTIVO'
  order by c.nombre_ciclo
  limit 1;
$$;

grant execute on function public.fn_estado_grupo_en_fecha(text, date) to authenticated;