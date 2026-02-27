-- Adiciona tipo 'agent_output' aos comentários de tasks
-- Permite salvar outputs estruturados dos agentes fictícios

ALTER TABLE dev_task_comments 
DROP CONSTRAINT IF EXISTS dev_task_comments_tipo_check;

ALTER TABLE dev_task_comments 
ADD CONSTRAINT dev_task_comments_tipo_check 
CHECK (tipo IN ('comment', 'status_change', 'assignment', 'system', 'agent_output'));
