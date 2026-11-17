ALTER TABLE public.termos ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'Responsabilidade';
ALTER TABLE public.suprimento_movimentos ADD COLUMN IF NOT EXISTS equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.termo_publico(_token uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('tipo', t.tipo, 'dados', t.dados, 'status', t.status, 'assinado_em', t.assinado_em,
    'equip', jsonb_build_object('patrimonio', e.patrimonio, 'tipo', e.tipo, 'marca', e.marca, 'modelo', e.modelo, 'numero_serie', e.numero_serie))
  FROM public.termos t JOIN public.equipamentos e ON e.id = t.equipamento_id WHERE t.token = _token
$function$;