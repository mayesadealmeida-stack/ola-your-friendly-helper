drop policy if exists "Enviar o proprio comprovativo" on storage.objects;
create policy "Enviar o proprio comprovativo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprovativos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Ver o proprio comprovativo" on storage.objects;
create policy "Ver o proprio comprovativo" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovativos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Admins veem todos os comprovativos" on storage.objects;
create policy "Admins veem todos os comprovativos" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprovativos' and public.has_role(auth.uid(), 'admin'));