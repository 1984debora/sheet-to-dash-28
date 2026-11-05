ALTER TABLE public.setores
  ADD COLUMN IF NOT EXISTS usa_scanner boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes text;

ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS conexao text,
  ADD COLUMN IF NOT EXISTS endereco_ip text,
  ADD COLUMN IF NOT EXISTS segunda_tela boolean NOT NULL DEFAULT false;

CREATE TABLE public.setor_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  celular text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setor_usuarios TO authenticated;
GRANT ALL ON public.setor_usuarios TO service_role;
ALTER TABLE public.setor_usuarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe autenticada acessa" ON public.setor_usuarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.setor_aplicativos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  versao text,
  fornecedor text,
  ultima_atualizacao date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.setor_aplicativos TO authenticated;
GRANT ALL ON public.setor_aplicativos TO service_role;
ALTER TABLE public.setor_aplicativos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe autenticada acessa" ON public.setor_aplicativos FOR ALL TO authenticated USING (true) WITH CHECK (true);