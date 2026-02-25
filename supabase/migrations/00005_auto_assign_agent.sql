-- Migration: Auto-atribuir agente quando mover para coluna do agente
-- Data: 2026-02-25

-- Function para auto-atribuir agente baseado no status
CREATE OR REPLACE FUNCTION auto_assign_agent()
RETURNS TRIGGER AS $$
DECLARE
  agent_slug TEXT;
  agent_uuid UUID;
BEGIN
  -- Se status é de um agente
  IF NEW.status IN ('anna', 'frank', 'rask', 'bruce', 'ali') THEN
    agent_slug := NEW.status;
    
    -- Busca o ID do agente pelo slug
    SELECT id INTO agent_uuid
    FROM dev_agents
    WHERE slug = agent_slug
    LIMIT 1;
    
    -- Se encontrou o agente, atribui
    IF agent_uuid IS NOT NULL THEN
      NEW.assigned_agent_id = agent_uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que roda ANTES de atualizar status
DROP TRIGGER IF EXISTS auto_assign_agent_trigger ON dev_tasks;
CREATE TRIGGER auto_assign_agent_trigger
  BEFORE UPDATE OF status ON dev_tasks
  FOR EACH ROW
  WHEN (NEW.status IN ('anna', 'frank', 'rask', 'bruce', 'ali'))
  EXECUTE FUNCTION auto_assign_agent();

-- Comentário
COMMENT ON FUNCTION auto_assign_agent() IS 'Auto-atribui agente quando task é movida para coluna do agente';
