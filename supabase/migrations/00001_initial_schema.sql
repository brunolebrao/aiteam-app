-- Dev Team - Schema inicial
-- Tabelas com prefixo team_ para evitar conflito com outros projetos

-- Enum para status do projeto
CREATE TYPE team_project_status AS ENUM ('planning', 'active', 'paused', 'done', 'archived');

-- Enum para tipo de task
CREATE TYPE team_task_type AS ENUM ('spec', 'ux', 'dev', 'test', 'review', 'deploy', 'bug', 'other');

-- Enum para status da task
CREATE TYPE team_task_status AS ENUM ('backlog', 'todo', 'doing', 'review', 'done', 'blocked');

-- Projetos
CREATE TABLE team_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  
  -- GitHub integration
  github_repo TEXT,           -- brunolebrao/lercom-app
  github_branch TEXT DEFAULT 'dev',
  
  -- Contexto do projeto (substitui PROJECT.md)
  context_md TEXT,            -- Stack, padrões, arquivos-chave
  
  status team_project_status DEFAULT 'planning',
  cor TEXT DEFAULT '#3b82f6', -- Cor do projeto para UI
  
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Agentes (personas customizáveis)
CREATE TABLE team_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,  -- anna, bruce, etc
  nome TEXT NOT NULL,
  emoji TEXT DEFAULT '🤖',
  role TEXT NOT NULL,         -- PO, Dev, QA, etc
  
  -- Prompt/persona do agente
  prompt_md TEXT,
  
  -- Cor para UI
  cor TEXT DEFAULT '#6366f1',
  
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES team_projects(id) ON DELETE CASCADE,
  
  titulo TEXT NOT NULL,
  descricao TEXT,
  
  tipo team_task_type NOT NULL DEFAULT 'other',
  status team_task_status DEFAULT 'backlog',
  
  -- Agente responsável e atual
  agente_id UUID REFERENCES team_agents(id),
  agente_atual_id UUID REFERENCES team_agents(id),
  
  -- Artefatos gerados (specs, docs, código)
  artefatos JSONB DEFAULT '[]',  -- [{tipo, titulo, conteudo, url, criado_em}]
  
  -- Ordenação dentro do kanban
  ordem INT DEFAULT 0,
  
  -- Timestamps
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  iniciado_em TIMESTAMPTZ,
  concluido_em TIMESTAMPTZ
);

-- Log de atividades
CREATE TABLE team_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES team_projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES team_tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES team_agents(id),
  
  acao TEXT NOT NULL,  -- created, status_changed, artifact_added, comment
  detalhes JSONB DEFAULT '{}',
  
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_team_tasks_project ON team_tasks(project_id);
CREATE INDEX idx_team_tasks_status ON team_tasks(status);
CREATE INDEX idx_team_tasks_agente ON team_tasks(agente_atual_id);
CREATE INDEX idx_team_activity_project ON team_activity_log(project_id);
CREATE INDEX idx_team_activity_task ON team_activity_log(task_id);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION team_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_team_projects_updated
  BEFORE UPDATE ON team_projects
  FOR EACH ROW EXECUTE FUNCTION team_update_timestamp();

CREATE TRIGGER trigger_team_tasks_updated
  BEFORE UPDATE ON team_tasks
  FOR EACH ROW EXECUTE FUNCTION team_update_timestamp();

-- Inserir agentes padrão
INSERT INTO team_agents (slug, nome, emoji, role, prompt_md, cor) VALUES
  ('anna', 'Anna', '📋', 'Product Owner', 'Focada em valor para o usuário. Escreve specs claras com critérios de aceite testáveis.', '#ec4899'),
  ('frank', 'Frank', '📊', 'Scrum Master', 'Organizado e metódico. Quebra specs em tasks técnicas, identifica dependências e bloqueios.', '#f59e0b'),
  ('rask', 'Rask', '🎨', 'UX/UI Designer', 'Pensa primeiro no usuário. Define fluxos, componentes e copy. Usa componentes existentes.', '#8b5cf6'),
  ('bruce', 'Bruce', '💻', 'Dev Full-Stack', 'Pragmático. Implementa features end-to-end, testa enquanto desenvolve.', '#22c55e'),
  ('ali', 'Ali', '🧪', 'QA Engineer', 'Cético e metódico. Assume que vai quebrar. Cria test cases e reporta bugs claramente.', '#f97316'),
  ('magu', 'Magu', '🧙‍♂️', 'Orchestrator', 'Orquestra o time, delega tasks, mantém contexto entre agentes.', '#6366f1');

-- Comentários
COMMENT ON TABLE team_projects IS 'Projetos gerenciados pelo Dev Team';
COMMENT ON TABLE team_agents IS 'Agentes AI com personas customizáveis';
COMMENT ON TABLE team_tasks IS 'Tasks do kanban';
COMMENT ON TABLE team_activity_log IS 'Log de atividades dos agentes';
