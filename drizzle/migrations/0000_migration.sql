CREATE TABLE public.setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.localizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patrimonio text NOT NULL UNIQUE,
  numero_serie text,
  tipo text NOT NULL,
  marca text,
  modelo text,
  usuario_responsavel text,
  data_compra date,
  garantia_ate date,
  status text NOT NULL DEFAULT 'Em uso',
  localizacao_id uuid REFERENCES public.localizacoes(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.movimentacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  origem_localizacao_id uuid REFERENCES public.localizacoes(id) ON DELETE SET NULL,
  destino_localizacao_id uuid REFERENCES public.localizacoes(id) ON DELETE SET NULL,
  usuario_anterior text,
  usuario_novo text,
  data date NOT NULL DEFAULT current_date,
  motivo text,
  registrado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT current_date,
  tipo text NOT NULL DEFAULT 'Corretiva',
  descricao text NOT NULL,
  tecnico text,
  custo numeric(12,2),
  status text NOT NULL DEFAULT 'Aberta',
  registrado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.historico_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  usuario text NOT NULL,
  inicio timestamptz NOT NULL DEFAULT now(),
  fim timestamptz
);

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['setores','localizacoes','equipamentos','movimentacoes','manutencoes','historico_usuarios'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Equipe autenticada acessa" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.rastrear_usuario_equipamento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
    IF NEW.usuario_responsavel IS NOT DISTINCT FROM OLD.usuario_responsavel THEN
      RETURN NEW;
    END IF;
    UPDATE public.historico_usuarios SET fim = now()
      WHERE equipamento_id = NEW.id AND fim IS NULL;
  END IF;
  IF NULLIF(trim(NEW.usuario_responsavel), '') IS NOT NULL THEN
    INSERT INTO public.historico_usuarios (equipamento_id, usuario) VALUES (NEW.id, NEW.usuario_responsavel);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.rastrear_usuario_equipamento_after()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NULLIF(trim(NEW.usuario_responsavel), '') IS NOT NULL THEN
    INSERT INTO public.historico_usuarios (equipamento_id, usuario) VALUES (NEW.id, NEW.usuario_responsavel);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.rastrear_usuario_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.usuario_responsavel IS DISTINCT FROM OLD.usuario_responsavel THEN
    UPDATE public.historico_usuarios SET fim = now() WHERE equipamento_id = NEW.id AND fim IS NULL;
    IF NULLIF(trim(NEW.usuario_responsavel), '') IS NOT NULL THEN
      INSERT INTO public.historico_usuarios (equipamento_id, usuario) VALUES (NEW.id, NEW.usuario_responsavel);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP FUNCTION public.rastrear_usuario_equipamento();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE TRIGGER equip_touch BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER equip_hist_ins AFTER INSERT ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.rastrear_usuario_equipamento_after();
CREATE TRIGGER equip_hist_upd AFTER UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.rastrear_usuario_update();

INSERT INTO public.setores (nome) VALUES ('TI'),('Financeiro'),('RH'),('Administrativo');
INSERT INTO public.localizacoes (setor_id, nome)
SELECT id, 'Sala principal' FROM public.setores;