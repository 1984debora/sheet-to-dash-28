CREATE TABLE public.contas_moveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  senha text,
  email_recuperacao text,
  telefone_2fa text,
  pin text,
  observacoes text,
  equipamento_id uuid UNIQUE REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  vinculado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contas_moveis TO authenticated;
GRANT ALL ON public.contas_moveis TO service_role;
ALTER TABLE public.contas_moveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin e técnico veem contas" ON public.contas_moveis FOR SELECT TO authenticated USING (public.pode_editar());
CREATE POLICY "Admin e técnico incluem contas" ON public.contas_moveis FOR INSERT TO authenticated WITH CHECK (public.pode_editar());
CREATE POLICY "Admin e técnico alteram contas" ON public.contas_moveis FOR UPDATE TO authenticated USING (public.pode_editar()) WITH CHECK (public.pode_editar());
CREATE POLICY "Somente admin exclui contas" ON public.contas_moveis FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));