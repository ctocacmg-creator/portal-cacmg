create or replace view public.v_control_asignaciones as
select
  'SIN_PERSONA' as tipo_alerta,
  a.cedula,
  a.id_puesto,
  a.estado_asignacion,
  'La cédula no enlaza con personas' as detalle
from public.asignaciones a
where a.persona_id is null

union all

select
  'SIN_PUESTO' as tipo_alerta,
  a.cedula,
  a.id_puesto,
  a.estado_asignacion,
  'El puesto no enlaza con puestos_operativos' as detalle
from public.asignaciones a
where a.puesto_id is null

union all

select
  'CEDULA_DUPLICADA_ACTIVA' as tipo_alerta,
  a.cedula,
  null as id_puesto,
  'ACTIVO' as estado_asignacion,
  'La cédula tiene más de una asignación activa' as detalle
from public.asignaciones a
where a.estado_asignacion = 'ACTIVO'
group by a.cedula
having count(*) > 1

union all

select
  'PUESTO_CON_DEFICIT' as tipo_alerta,
  null as cedula,
  r.id_puesto,
  'ACTIVO' as estado_asignacion,
  'El puesto tiene déficit de ACM' as detalle
from public.resumen_puestos_asignacion r
where r.deficit > 0

union all

select
  'PUESTO_CON_SOBRECUPO' as tipo_alerta,
  null as cedula,
  r.id_puesto,
  'ACTIVO' as estado_asignacion,
  'El puesto tiene sobrecupo de ACM' as detalle
from public.resumen_puestos_asignacion r
where r.sobrecupo > 0;