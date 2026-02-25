import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export type Project = {
  id: string
  slug: string
  nome: string
  descricao: string | null
  github_repo: string | null
  status: 'planning' | 'active' | 'paused' | 'done' | 'archived'
  cor: string
  created_at: string
  updated_at: string
}

export type Agent = {
  id: string
  slug: string
  nome: string
  papel: 'po' | 'sm' | 'ux' | 'dev' | 'qa'
  descricao: string | null
  avatar_emoji: string
  persona_md: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  project_id: string
  numero: number | null
  titulo: string
  descricao: string | null
  status: 'backlog' | 'todo' | 'doing' | 'review' | 'done' | 'blocked'
  prioridade: 'low' | 'medium' | 'high' | 'urgent'
  assigned_agent_id: string | null
  parent_task_id: string | null
  ordem: number
  estimativa_horas: number | null
  due_date: string | null
  tags: string[]
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  // Joins
  assigned_agent?: Agent
}

export type TaskComment = {
  id: string
  task_id: string
  agent_id: string | null
  tipo: 'comment' | 'status_change' | 'assignment' | 'system'
  conteudo: string
  metadata: Record<string, unknown>
  created_at: string
  // Joins
  agent?: Agent
}

// Helper para contagem de tasks por status
export type TaskCounts = {
  backlog: number
  todo: number
  doing: number
  review: number
  done: number
  blocked: number
}
