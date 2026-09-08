-- Publicações oficiais: só administradores podem criar notícias.

grant insert, update, delete on public.posts to authenticated;

drop policy if exists "Admins podem publicar notícias" on public.posts;
create policy "Admins podem publicar notícias"
on public.posts
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins podem editar notícias" on public.posts;
create policy "Admins podem editar notícias"
on public.posts
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins podem apagar notícias" on public.posts;
create policy "Admins podem apagar notícias"
on public.posts
for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

insert into storage.buckets (id, name, public)
values ('posts', 'posts', true)
on conflict (id) do update set public = true;

drop policy if exists "Qualquer pessoa vê imagens de notícias" on storage.objects;
create policy "Qualquer pessoa vê imagens de notícias"
on storage.objects
for select
to public
using (bucket_id = 'posts');

drop policy if exists "Admins enviam imagens de notícias" on storage.objects;
create policy "Admins enviam imagens de notícias"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'posts' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins atualizam imagens de notícias" on storage.objects;
create policy "Admins atualizam imagens de notícias"
on storage.objects
for update
to authenticated
using (bucket_id = 'posts' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'posts' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins removem imagens de notícias" on storage.objects;
create policy "Admins removem imagens de notícias"
on storage.objects
for delete
to authenticated
using (bucket_id = 'posts' and public.has_role(auth.uid(), 'admin'));