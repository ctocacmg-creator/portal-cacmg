create or replace function public.fn_puestos_con_deficit()
returns table (
  id_puesto text,
  distrito text,
  acm_requeridos integer,
  acm_asignados integer,
  deficit integer
)
language sql
stable
as $$
  select
    r.id_puesto,
    r.distrito,
    r.acm_requeridos,
    r.acm_asignados,
    r.deficit
  from public.resumen_puestos_asignacion r
  where coalesce(r.deficit, 0) > 0
  order by r.distrito, r.id_puesto;
$$;

grant execute on function public.fn_puestos_con_deficit() to authenticated;