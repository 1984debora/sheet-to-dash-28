CREATE TABLE public.suprimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL,
  nome text NOT NULL,
  especificacao text,
  condicao text NOT NULL DEFAULT 'Novo',
  quantidade integer NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  minimo integer NOT NULL DEFAULT 0 CHECK (minimo >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suprimentos TO authenticated;
GRANT ALL ON public.suprimentos TO service_role;
ALTER TABLE public.suprimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe autenticada acessa" ON public.suprimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.suprimento_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  suprimento_id uuid NOT NULL REFERENCES public.suprimentos(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('Entrada','Saída')),
  quantidade integer NOT NULL CHECK (quantidade > 0),
  destino text,
  registrado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suprimento_movimentos TO authenticated;
GRANT ALL ON public.suprimento_movimentos TO service_role;
ALTER TABLE public.suprimento_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe autenticada acessa" ON public.suprimento_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.aplicar_movimento_suprimento() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.suprimentos SET quantidade = quantidade + CASE WHEN NEW.tipo = 'Entrada' THEN NEW.quantidade ELSE -NEW.quantidade END
  WHERE id = NEW.suprimento_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_movimento_suprimento AFTER INSERT ON public.suprimento_movimentos FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimento_suprimento();