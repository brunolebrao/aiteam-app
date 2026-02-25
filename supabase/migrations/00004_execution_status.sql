-- Migration: Adicionar status de execução nos cards
-- Data: 2026-02-25

-- Adicionar campo execution_status
ALTER TABLE dev_tasks 
ADD COLUMN IF NOT EXISTS execution_status TEXT 
CHECK (execution_status IN ('pending', 'running', 'completed'));

-- Comentário
COMMENT ON COLUMN dev_tasks.execution_status IS 'Status de execução: pending (aguardando runner), running (executando), completed (concluído)';

-- Trigger para resetar execution_status quando mudar de coluna
CREATE OR REPLACE FUNCTION reset_execution_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se mudou de status/coluna, reseta execution_status
  IF NEW.status != OLD.status THEN
    -- Se moveu para coluna de agente, marca como pending
    IF NEW.status IN ('anna', 'frank', 'rask', 'bruce', 'ali') THEN
      NEW.execution_status = 'pending';
    -- Se moveu para outras colunas, limpa o status
    ELSE
      NEW.execution_status = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reset_execution_status_trigger ON dev_tasks;
CREATE TRIGGER reset_execution_status_trigger
  BEFORE UPDATE OF status ON dev_tasks
  FOR EACH ROW
  EXECUTE FUNCTION reset_execution_status();
