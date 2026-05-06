create or replace function public.fn_personal_disponible_en_fecha(
  p_fecha date
)
returns table (
  persona_id uuid,
  cedula text,
  nombres text,
  grupo text,
  area text,
  tiene_asignacion_activa boolean,
  asignacion_activa_puesto text,
  tiene_ausentismo boolean,
  tipo_ausentismo text,
  tiene_condicion_especial boolean,
  tipo_condicion text,
  puede_operativo text,
  restriccion_operativa text,
  estado_ciclo text,
  disponible boolean,
  motivo_no_disponible text
)
language sql
stable
as $$
  select
    p.id as persona_id,
    p.cedula,
    p.nombres,
    p.grupo,
    p.area,

    case when a.id is not null then true else false end as tiene_asignacion_activa,
    a.id_puesto as asignacion_activa_puesto,

    case when au.id is not null then true else false end as tiene_ausentismo,
    au.tipo_ausentismo,

    case when ce.id is not null then true else false end as tiene_condicion_especial,
    ce.tipo_condicion,
    ce.puede_operativo,
    ce.restriccion_operativa,

    case
      when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) = 'X'
        then 'TRABAJO'
      when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) = 'T'
        then 'TRABAJO'
      when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) like '%TRABAJO%'
        then 'TRABAJO'
      when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) = 'D'
        then 'DESCANSO'
      when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) like '%DESCANSO%'
        then 'DESCANSO'
      else 'SIN_PLANIFICACION'
    end as estado_ciclo,

    case
      when a.id is not null then false
      when au.id is not null then false
      when ce.puede_operativo = 'NO' then false
      when (
        case
          when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) = 'D'
            then 'DESCANSO'
          when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) like '%DESCANSO%'
            then 'DESCANSO'
          else 'TRABAJO'
        end
      ) = 'DESCANSO' then false
      else true
    end as disponible,

    case
      when a.id is not null then 'YA_TIENE_ASIGNACION_ACTIVA'
      when au.id is not null then 'AUSENTISMO_ACTIVO'
      when ce.puede_operativo = 'NO' then 'CONDICION_ESPECIAL_BLOQUEANTE'
      when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) = 'D'
        then 'CICLO_DESCANSO'
      when upper(coalesce(c.dias_plan ->> ('dia_' || extract(day from p_fecha)::integer), '')) like '%DESCANSO%'
        then 'CICLO_DESCANSO'
      when c.id is null then 'SIN_CICLO'
      else null
    end as motivo_no_disponible

  from public.personas p

  left join public.asignaciones a
    on a.cedula = p.cedula
    and a.estado_asignacion = 'ACTIVO'

  left join public.ausentismos au
    on au.cedula = p.cedula
    and au.estado = 'ACTIVO'
    and au.fecha_inicio <= p_fecha
    and au.fecha_fin >= p_fecha

  left join public.condiciones_especiales ce
    on ce.cedula = p.cedula
    and ce.estado = 'ACTIVO'
    and ce.fecha_inicio <= p_fecha
    and (ce.fecha_fin is null or ce.fecha_fin >= p_fecha)

  left join public.ciclos_trabajo c
    on upper(trim(c.grupo)) = upper(trim(p.grupo))
    and c.anio = extract(year from p_fecha)::integer
    and c.mes_numero = extract(month from p_fecha)::integer
    and coalesce(c.estado, 'ACTIVO') = 'ACTIVO';
$$;

grant execute on function public.fn_personal_disponible_en_fecha(date) to authenticated;