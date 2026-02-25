-- Migration: Adicionar colunas de agentes ao fluxo
-- Data: 2026-02-25

-- Adicionar novos valores ao ENUM existente (não pode ser feito em transação)
-- Executar um por vez

-- Adicionar 'ideias'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ideias' 
    AND enumtypid = 'dev_task_status'::regtype
  ) THEN
    ALTER TYPE dev_task_status ADD VALUE 'ideias' BEFORE 'backlog';
  END IF;
END $$;

-- Adicionar 'anna'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'anna' 
    AND enumtypid = 'dev_task_status'::regtype
  ) THEN
    ALTER TYPE dev_task_status ADD VALUE 'anna' AFTER 'backlog';
  END IF;
END $$;

-- Adicionar 'frank'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'frank' 
    AND enumtypid = 'dev_task_status'::regtype
  ) THEN
    ALTER TYPE dev_task_status ADD VALUE 'frank' AFTER 'anna';
  END IF;
END $$;

-- Adicionar 'rask'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'rask' 
    AND enumtypid = 'dev_task_status'::regtype
  ) THEN
    ALTER TYPE dev_task_status ADD VALUE 'rask' AFTER 'frank';
  END IF;
END $$;

-- Adicionar 'bruce'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'bruce' 
    AND enumtypid = 'dev_task_status'::regtype
  ) THEN
    ALTER TYPE dev_task_status ADD VALUE 'bruce' AFTER 'rask';
  END IF;
END $$;

-- Adicionar 'ali'
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'ali' 
    AND enumtypid = 'dev_task_status'::regtype
  ) THEN
    ALTER TYPE dev_task_status ADD VALUE 'ali' AFTER 'bruce';
  END IF;
END $$;

-- Migrar dados existentes
UPDATE dev_tasks SET status = 'ideias' WHERE status = 'todo';
UPDATE dev_tasks SET status = 'done' WHERE status IN ('review', 'doing', 'blocked');

-- Comentário
COMMENT ON COLUMN dev_tasks.status IS 'Status da task: ideias (brainstorm) → backlog (aprovado) → [agente] (executando) → done';
