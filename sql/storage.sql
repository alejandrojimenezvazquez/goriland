-- Ejecuta esto en Supabase > SQL Editor. Cambia TU_EMAIL por tu email de administrador.
insert into storage.buckets (id, name, public) values ('escudos', 'escudos', true) on conflict (id) do nothing;
create policy "admin sube escudos" on storage.objects for insert to authenticated
  with check (bucket_id = 'escudos' and (auth.jwt() ->> 'email') = 'TU_EMAIL');
