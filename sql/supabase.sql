-- Ejecuta esto en Supabase > SQL Editor. Cambia TU_EMAIL por el email de tu usuario administrador.
create table members (id text primary key, data jsonb not null);
create table events  (id text primary key, data jsonb not null);
alter table members enable row level security;
alter table events  enable row level security;

create policy "lectura publica" on members for select using (true);
create policy "lectura publica" on events  for select using (true);

create policy "admin escribe" on members for all to authenticated
  using ((auth.jwt() ->> 'email') = 'TU_EMAIL') with check ((auth.jwt() ->> 'email') = 'TU_EMAIL');
create policy "admin escribe" on events for all to authenticated
  using ((auth.jwt() ->> 'email') = 'TU_EMAIL') with check ((auth.jwt() ->> 'email') = 'TU_EMAIL');
