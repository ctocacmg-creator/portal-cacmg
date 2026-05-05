create policy "Usuarios autenticados pueden crear asignaciones"
on public.asignaciones
for insert
to authenticated
with check (true);

create policy "Usuarios autenticados pueden actualizar asignaciones"
on public.asignaciones
for update
to authenticated
using (true)
with check (true);