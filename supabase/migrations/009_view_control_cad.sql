create or replace view public.v_control_cad as
select
  'NOVEDAD_ABIERTA' as tipo_alerta,
  n.id,
  n.id_novedad,
  n.estado_novedad,
  n.distrito,
  n.id_puesto,
  'Novedad permanece abierta' as detalle
from public.cad_novedades n
where coalesce(n.estado_novedad, '') <> 'CERRADA'

union all

select
  'CERRADA_SIN_ACCION' as tipo_alerta,
  n.id,
  n.id_novedad,
  n.estado_novedad,
  n.distrito,
  n.id_puesto,
  'Novedad cerrada sin acción tomada' as detalle
from public.cad_novedades n
where n.estado_novedad = 'CERRADA'
  and nullif(trim(coalesce(n.accion_tomada, '')), '') is null

union all

select
  'SIN_BITACORA' as tipo_alerta,
  n.id,
  n.id_novedad,
  n.estado_novedad,
  n.distrito,
  n.id_puesto,
  'Novedad sin registros de bitácora' as detalle
from public.cad_novedades n
where not exists (
  select 1
  from public.cad_bitacora_novedades b
  where b.novedad_id = n.id
)

union all

select
  'APOYO_ACTIVO' as tipo_alerta,
  n.id,
  n.id_novedad,
  n.estado_novedad,
  a.distrito,
  a.id_puesto_destino as id_puesto,
  'Apoyo CAD activo asociado a novedad' as detalle
from public.cad_apoyos_novedades a
left join public.cad_novedades n on n.id = a.novedad_id
where coalesce(a.estado_apoyo, '') = 'ACTIVO';