CREATE OR REPLACE FUNCTION public.membro_equipe()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public','auth' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL AND u.deleted_at IS NULL
    AND (u.banned_until IS NULL OR u.banned_until < now()))
$$;
REVOKE ALL ON FUNCTION public.membro_equipe() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.membro_equipe() TO authenticated;
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['equipamentos','estoque_movimentos','historico_usuarios','localizacoes','manutencoes','movimentacoes','setor_aplicativos','setor_usuarios','setores','suprimento_movimentos','suprimentos','termos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Equipe visualiza" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Equipe visualiza" ON public.%I FOR SELECT TO authenticated USING (public.membro_equipe())', t);
  END LOOP;
END $$;