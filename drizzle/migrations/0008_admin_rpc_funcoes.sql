create or replace function public.admin_listar_equipe()
returns table(id uuid, email text, ultimo_acesso timestamptz, admin boolean)
language plpgsql stable security definer set search_path = public, auth
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso restrito a administradores'; end if;
  return query select u.id, u.email::text, u.last_sign_in_at, public.has_role(u.id, 'admin') from auth.users u order by u.email;
end $$;

create or replace function public.admin_redefinir_senha(_user_id uuid, _senha text)
returns void language plpgsql security definer set search_path = public, auth, extensions
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso restrito a administradores'; end if;
  if length(_senha) < 8 or length(_senha) > 72 then raise exception 'A senha deve ter entre 8 e 72 caracteres'; end if;
  update auth.users set encrypted_password = extensions.crypt(_senha, extensions.gen_salt('bf')), updated_at = now() where id = _user_id;
  if not found then raise exception 'Usuário não encontrado'; end if;
end $$;

create or replace function public.admin_definir_admin(_user_id uuid, _admin boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Acesso restrito a administradores'; end if;
  if _user_id = auth.uid() and not _admin then raise exception 'Você não pode remover seu próprio acesso de administrador'; end if;
  if _admin then insert into public.user_roles(user_id, role) values (_user_id, 'admin') on conflict do nothing;
  else delete from public.user_roles where user_id = _user_id and role = 'admin'; end if;
end $$;

revoke all on function public.admin_listar_equipe() from public, anon;
revoke all on function public.admin_redefinir_senha(uuid, text) from public, anon;
revoke all on function public.admin_definir_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_listar_equipe() to authenticated;
grant execute on function public.admin_redefinir_senha(uuid, text) to authenticated;
grant execute on function public.admin_definir_admin(uuid, boolean) to authenticated;