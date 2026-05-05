create policy "Usuarios autenticados pueden crear auditoria"
on public.auditoria
for insert
to authenticated
with check (true);