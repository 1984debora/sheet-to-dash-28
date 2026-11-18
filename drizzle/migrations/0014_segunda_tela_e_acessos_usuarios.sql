ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS segunda_tela_patrimonio text,
  ADD COLUMN IF NOT EXISTS segunda_tela_serie text;
ALTER TABLE public.setor_usuarios
  ADD COLUMN IF NOT EXISTS computador text,
  ADD COLUMN IF NOT EXISTS senha text,
  ADD COLUMN IF NOT EXISTS anydesk text,
  ADD COLUMN IF NOT EXISTS senha_anydesk text;