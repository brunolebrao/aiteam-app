-- Migration: Adiciona campo auto_ideas nos projetos
-- Data: 2026-02-26
-- Descrição: Campo para controlar geração automática de ideias (crons 07:00 e 22:00)

ALTER TABLE dev_projects
ADD COLUMN IF NOT EXISTS auto_ideas BOOLEAN DEFAULT false;

COMMENT ON COLUMN dev_projects.auto_ideas IS 'Ativa/desativa geração automática de ideias às 07:00 e 22:00';
