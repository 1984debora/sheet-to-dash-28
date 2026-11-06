CREATE TABLE public.estoque_movimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  usuario text,
  status_anterior text,
  status_novo text,
  registrado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estoque_movimentos TO authenticated;
GRANT ALL ON public.estoque_movimentos TO service_role;
ALTER TABLE public.estoque_movimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe autenticada acessa" ON public.estoque_movimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.rastrear_estoque()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'Em estoque' THEN
      INSERT INTO public.estoque_movimentos(equipamento_id, tipo, status_novo) VALUES (NEW.id, 'Entrada', NEW.status);
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'Em estoque' THEN
      INSERT INTO public.estoque_movimentos(equipamento_id, tipo, usuario, status_anterior, status_novo)
      VALUES (NEW.id, 'Entrada', OLD.usuario_responsavel, OLD.status, NEW.status);
    ELSIF OLD.status = 'Em estoque' THEN
      INSERT INTO public.estoque_movimentos(equipamento_id, tipo, usuario, status_anterior, status_novo)
      VALUES (NEW.id, 'Saída', NEW.usuario_responsavel, OLD.status, NEW.status);
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_rastrear_estoque AFTER INSERT OR UPDATE OF status ON public.equipamentos
FOR EACH ROW EXECUTE FUNCTION public.rastrear_estoque();