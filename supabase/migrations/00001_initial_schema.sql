-- AI Team Dashboard - Schema Inicial
-- Usa o Supabase DEV compartilhado (supabase-dev.lercom.com.br)

-- ===========================================
-- PROJETOS
-- ===========================================
CREATE TABLE IF NOT EXISTS dev_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  github_repo TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'paused', 'done', 'archived')),
  cor TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- AGENTES
-- ===========================================
CREATE TABLE IF NOT EXISTS dev_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL, -- 'po', 'sm', 'ux', 'dev', 'qa'
  descricao TEXT,
  avatar_emoji TEXT DEFAULT '🤖',
  persona_md TEXT, -- conteúdo do arquivo .md do agente
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- TASKS
-- ===========================================
CREATE TABLE IF NOT EXISTS dev_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES dev_projects(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT DEFAULT 'backlog' CHECK (status IN ('backlog', 'todo', 'doing', 'review', 'done', 'blocked')),
  prioridade TEXT DEFAULT 'medium' CHECK (prioridade IN ('low', 'medium', 'high', 'urgent')),
  assigned_agent_id UUID REFERENCES dev_agents(id) ON DELETE SET NULL,
  parent_task_id UUID REFERENCES dev_tasks(id) ON DELETE SET NULL,
  ordem INT DEFAULT 0,
  estimativa_horas DECIMAL(5,2),
  due_date DATE,
  tags TEXT[], -- ['bug', 'feature', 'docs']
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- COMENTÁRIOS/LOG DE ATIVIDADE
-- ===========================================
CREATE TABLE IF NOT EXISTS dev_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES dev_tasks(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES dev_agents(id) ON DELETE SET NULL,
  tipo TEXT DEFAULT 'comment' CHECK (tipo IN ('comment', 'status_change', 'assignment', 'system')),
  conteudo TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- INDEXES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_dev_tasks_project ON dev_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_status ON dev_tasks(status);
CREATE INDEX IF NOT EXISTS idx_dev_tasks_assigned ON dev_tasks(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_dev_task_comments_task ON dev_task_comments(task_id);

-- ===========================================
-- TRIGGERS - updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS dev_projects_updated_at ON dev_projects;
CREATE TRIGGER dev_projects_updated_at
  BEFORE UPDATE ON dev_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS dev_agents_updated_at ON dev_agents;
CREATE TRIGGER dev_agents_updated_at
  BEFORE UPDATE ON dev_agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS dev_tasks_updated_at ON dev_tasks;
CREATE TRIGGER dev_tasks_updated_at
  BEFORE UPDATE ON dev_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===========================================
-- SEED: Agentes padrão
-- ===========================================
INSERT INTO dev_agents (slug, nome, papel, descricao, avatar_emoji) VALUES
  ('anna', 'Anna', 'po', 'Product Owner - Define requisitos e prioriza backlog', '👩‍💼'),
  ('frank', 'Frank', 'sm', 'Scrum Master - Facilita processos e remove impedimentos', '🧑‍🏫'),
  ('rask', 'Rask', 'ux', 'UX Designer - Cria interfaces e experiências', '🎨'),
  ('bruce', 'Bruce', 'dev', 'Developer - Implementa features e corrige bugs', '👨‍💻'),
  ('ali', 'Ali', 'qa', 'QA Engineer - Testa e garante qualidade', '🔍')
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- RLS (básico - sem auth por enquanto)
-- ===========================================
ALTER TABLE dev_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_task_comments ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (ajustar quando tiver auth)
CREATE POLICY "dev_projects_all" ON dev_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_agents_all" ON dev_agents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_tasks_all" ON dev_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_task_comments_all" ON dev_task_comments FOR ALL USING (true) WITH CHECK (true);
