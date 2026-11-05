ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS processador text,
  ADD COLUMN IF NOT EXISTS ram_capacidade text,
  ADD COLUMN IF NOT EXISTS ram_tipo text,
  ADD COLUMN IF NOT EXISTS armazenamento_tipo text,
  ADD COLUMN IF NOT EXISTS armazenamento_capacidade text,
  ADD COLUMN IF NOT EXISTS sistema_operacional text;