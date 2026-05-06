create or replace view public.v_control_asignacion_ciclos as
select
  a.id as asignacion_id,
  a.cedula,
  p.nombres,
  a.grupo,
  a.id_puesto,
  po.distrito,
  a.fecha_inicio,
  c.nombre_ciclo,
  c.anio,
  c.mes_numero,
  extract(day from a.fecha_inicio)::integer as dia,
  c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer) as estado_dia,
  case
    when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer), '')) = 'X'
      then 'TRABAJO'
    when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer), '')) = 'T'
      then 'TRABAJO'
    when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer), '')) like '%TRABAJO%'
      then 'TRABAJO'
    when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer), '')) = 'D'
      then 'DESCANSO'
    when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer), '')) like '%DESCANSO%'
      then 'DESCANSO'
    else 'SIN_PLANIFICACION'
  end as estado_ciclo_normalizado,
  case
    when c.id is null then 'SIN_CICLO'
    when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer), '')) in ('D')
      then 'ASIGNADO_EN_DESCANSO'
    when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from a.fecha_inicio)::integer), '')) like '%DESCANSO%'
      then 'ASIGNADO_EN_DESCANSO'
    when nullif(trim(coalesce(a.grupo, '')), '') is null
      then 'SIN_GRUPO'
    else 'OK'
  end as alerta
from public.asignaciones a
left join public.personas p on p.id = a.persona_id
left join public.puestos_operativos po on po.id = a.puesto_id
left join public.ciclos_trabajo c
  on upper(trim(c.grupo)) = upper(trim(a.grupo))
  and c.anio = extract(year from a.fecha_inicio)::integer
  and c.mes_numero = extract(month from a.fecha_inicio)::integer
  and coalesce(c.estado, 'ACTIVO') = 'ACTIVO'
where a.estado_asignacion = 'ACTIVO';