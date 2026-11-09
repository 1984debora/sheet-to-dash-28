CREATE OR REPLACE FUNCTION public.rastrear_estoque()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'Em estoque' THEN
      INSERT INTO public.estoque_movimentos(equipamento_id, tipo, status_novo) VALUES (NEW.id, 'Entrada', NEW.status);
    ELSE
      INSERT INTO public.estoque_movimentos(equipamento_id, tipo, usuario, status_novo) VALUES (NEW.id, 'Cadastro no setor', NEW.usuario_responsavel, NEW.status);
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