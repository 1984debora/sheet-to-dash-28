CREATE TABLE public.setor_acessos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
 criado_por uuid NOT NULL DEFAULT auth.uid(),
 hostname text NOT NULL,
 usuario text,
 gerente_adm text,
 anydesk text,
 email text,
 segredos_cifrados text NOT NULL,
 ultima_alteracao timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setor_acessos TO authenticated;
GRANT ALL ON public.setor_acessos TO service_role;
ALTER TABLE public.setor_acessos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acessos privados do responsável" ON public.setor_acessos FOR ALL TO authenticated USING (criado_por = auth.uid()) WITH CHECK (criado_por = auth.uid());