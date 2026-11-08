-- Ejecuta esto en Supabase > SQL Editor (cambia TU_EMAIL). Permite sustituir los logos de las competiciones.
create policy "leer escudos" on storage.objects for select using (bucket_id = 'escudos');
create policy "admin actualiza escudos" on storage.objects for update to authenticated
  using (bucket_id = 'escudos' and (auth.jwt() ->> 'email') = 'TU_EMAIL')
  with check (bucket_id = 'escudos' and (auth.jwt() ->> 'email') = 'TU_EMAIL');
