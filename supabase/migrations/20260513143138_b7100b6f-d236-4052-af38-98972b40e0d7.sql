-- Adiciona a coluna row_version
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS row_version INTEGER DEFAULT 1 NOT NULL;

-- Função para gerenciar o row_version
CREATE OR REPLACE FUNCTION public.handle_row_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o row_version não foi explicitamente alterado (o que o cliente deve fazer para validar),
  -- ou se foi, nós incrementamos para a próxima versão.
  -- No optimistic locking, o cliente envia o row_version que ele leu. 
  -- Se o valor no banco for diferente, o UPDATE falha (isso será feito via cláusula WHERE no app).
  -- Aqui apenas garantimos que ele suba.
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para quotes
DROP TRIGGER IF EXISTS trg_quotes_row_version ON public.quotes;
CREATE TRIGGER trg_quotes_row_version
BEFORE UPDATE ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.handle_row_version();
