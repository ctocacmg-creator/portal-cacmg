create or replace view public.v_asignaciones_activas as
select
  a.id,
  a.cedula,
  p.nombres,
  p.grado,
  a.id_puesto,
  po.distrito,
  po.circuito,
  po.subcircuito,
  a.grupo,
  a.area,
  a.funcion,
  a.horario,
  a.fecha_inicio,
  a.estado_asignacion,
  a.created_at
from public.asignaciones a
left join public.personas p on p.id = a.persona_id
left join public.puestos_operativos po on po.id = a.puesto_id
where a.estado_asignacion = 'ACTIVO';