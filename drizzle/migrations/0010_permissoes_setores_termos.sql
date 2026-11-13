
CREATE OR REPLACE FUNCTION public.meu_papel() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(auth.uid(),'admin') THEN 'admin'
              WHEN public.has_role(auth.uid(),'tecnico') THEN 'tecnico'
              ELSE 'usuario' END
$$;
CREATE OR REPLACE FUNCTION public.pode_editar() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'tecnico')
$$;
REVOKE EXECUTE ON FUNCTION public.meu_papel() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.pode_editar() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.meu_papel() TO authenticated;
GRANT EXECUTE ON FUNCTION public.pode_editar() TO authenticated;

-- Existing team members without a role keep working as técnicos.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'tecnico' FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['equipamentos','estoque_movimentos','historico_usuarios','localizacoes','manutencoes','movimentacoes','setor_aplicativos','setor_usuarios','setores','suprimento_movimentos','suprimentos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Equipe autenticada acessa" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Equipe visualiza" ON public.%I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "Admin e técnico incluem" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.pode_editar())', t);
    EXECUTE format('CREATE POLICY "Admin e técnico alteram" ON public.%I FOR UPDATE TO authenticated USING (public.pode_editar()) WITH CHECK (public.pode_editar())', t);
    EXECUTE format('CREATE POLICY "Somente admin exclui" ON public.%I FOR DELETE TO authenticated USING (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.admin_listar_equipe();
CREATE FUNCTION public.admin_listar_equipe() RETURNS TABLE(id uuid, email text, ultimo_acesso timestamptz, papel text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores'; END IF;
  RETURN QUERY SELECT u.id, u.email::text, u.last_sign_in_at,
    CASE WHEN EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='admin') THEN 'admin'
         WHEN EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='tecnico') THEN 'tecnico'
         ELSE 'usuario' END
  FROM auth.users u ORDER BY u.email;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_listar_equipe() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_equipe() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_definir_papel(_user_id uuid, _papel text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso restrito a administradores'; END IF;
  IF _papel NOT IN ('admin','tecnico','usuario') THEN RAISE EXCEPTION 'Permissão inválida'; END IF;
  IF _user_id = auth.uid() AND _papel <> 'admin' THEN RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador'; END IF;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  IF _papel <> 'usuario' THEN INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _papel::public.app_role); END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_definir_papel(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_papel(uuid,text) TO authenticated;

ALTER TABLE public.setores ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'Lojas';
UPDATE public.setores SET categoria = 'Administrativo' WHERE nome IN ('Administrativo','Aquitetura/Expansão','Auditoria Financeira','Auditoria Interna','Call Center Osasco','Comercial','Compras','Controladoria','Controle de Perdas','Controle de Produtos','CRC','Diretoria','Estoque Armações','Financeiro','Fiscal','Franquias','Júridico','RH','Suprimentos','TI','Universidade');

CREATE TABLE public.termos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  dados jsonb NOT NULL,
  status text NOT NULL DEFAULT 'Pendente',
  assinatura text,
  assinado_em timestamptz,
  criado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.termos TO authenticated;
GRANT ALL ON public.termos TO service_role;
ALTER TABLE public.termos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe visualiza" ON public.termos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin e técnico incluem" ON public.termos FOR INSERT TO authenticated WITH CHECK (public.pode_editar());
CREATE POLICY "Admin e técnico alteram" ON public.termos FOR UPDATE TO authenticated USING (public.pode_editar()) WITH CHECK (public.pode_editar());
CREATE POLICY "Somente admin exclui" ON public.termos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.termo_publico(_token uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('dados', t.dados, 'status', t.status, 'assinado_em', t.assinado_em,
    'equip', jsonb_build_object('patrimonio', e.patrimonio, 'tipo', e.tipo, 'marca', e.marca, 'modelo', e.modelo, 'numero_serie', e.numero_serie))
  FROM public.termos t JOIN public.equipamentos e ON e.id = t.equipamento_id WHERE t.token = _token
$$;
CREATE OR REPLACE FUNCTION public.assinar_termo_publico(_token uuid, _assinatura text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _assinatura IS NULL OR left(_assinatura, 22) <> 'data:image/png;base64,' OR length(_assinatura) > 500000 THEN RAISE EXCEPTION 'Assinatura inválida'; END IF;
  UPDATE public.termos SET assinatura = _assinatura, status = 'Assinado', assinado_em = now() WHERE token = _token AND status = 'Pendente';
  RETURN FOUND;
END $$;
REVOKE EXECUTE ON FUNCTION public.termo_publico(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.assinar_termo_publico(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.termo_publico(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assinar_termo_publico(uuid,text) TO anon, authenticated;
