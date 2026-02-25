-- Migration: Adicionar campos para controle de modelo Opus e PRs
-- Data: 2026-02-25

-- ===========================================
-- ADICIONAR COLUNAS EM dev_tasks
-- ===========================================

-- Campo para forçar uso do modelo Opus (mais caro mas mais potente)
ALTER TABLE dev_tasks 
ADD COLUMN IF NOT EXISTS force_opus BOOLEAN DEFAULT false;

-- Log de progresso em tempo real (comentários incrementais do agente)
-- Formato: [{ "timestamp": "...", "action": "...", "details": "..." }, ...]
ALTER TABLE dev_tasks 
ADD COLUMN IF NOT EXISTS progress_log JSONB DEFAULT '[]';

-- URL da Pull Request criada pelo agente
ALTER TABLE dev_tasks 
ADD COLUMN IF NOT EXISTS pr_url TEXT;

-- Status da PR: 'pending', 'approved', 'merged', 'closed'
ALTER TABLE dev_tasks 
ADD COLUMN IF NOT EXISTS pr_status TEXT CHECK (pr_status IN ('pending', 'approved', 'merged', 'closed'));

-- ===========================================
-- COMENTÁRIOS
-- ===========================================

COMMENT ON COLUMN dev_tasks.force_opus IS 'Quando true, runner usa modelo Opus (~3-5x mais caro) em vez de Sonnet/Haiku';
COMMENT ON COLUMN dev_tasks.progress_log IS 'Array JSON com logs incrementais do agente durante execução da task';
COMMENT ON COLUMN dev_tasks.pr_url IS 'URL da Pull Request criada pelo agente (GitHub/GitLab/etc)';
COMMENT ON COLUMN dev_tasks.pr_status IS 'Status atual da PR: pending, approved, merged, closed';
