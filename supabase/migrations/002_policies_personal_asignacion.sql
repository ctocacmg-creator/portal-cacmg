create policy "Usuarios autenticados pueden ver personas"
on public.personas
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden ver puestos"
on public.puestos_operativos
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden ver asignaciones"
on public.asignaciones
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden ver ausentismos"
on public.ausentismos
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden ver condiciones especiales"
on public.condiciones_especiales
for select
to authenticated
using (true);

create policy "Usuarios autenticados pueden ver perfiles"
on public.perfiles
for select
to authenticated
using (true);