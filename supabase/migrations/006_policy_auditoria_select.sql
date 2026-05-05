create policy "Usuarios autenticados pueden ver auditoria"
on public.auditoria
for select
to authenticated
using (true);