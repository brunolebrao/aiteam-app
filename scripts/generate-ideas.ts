/**
 * Script para gerar ideias de tasks automaticamente
 * Usado pelos crons 07:00 e 22:00
 * 
 * Execução: bun run scripts/generate-ideas.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://supabase-dev.lercom.com.br'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface Project {
  id: string
  nome: string
  slug: string
  descricao: string
  github_repo?: string
  status: string
}

interface IdeaSuggestion {
  titulo: string
  descricao: string
  prioridade: 'low' | 'medium' | 'high' | 'urgent'
  tags?: string[]
}

async function getActiveProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('dev_projects')
    .select('*')
    .eq('status', 'active')
  
  if (error) throw error
  return data || []
}

async function getProjectContext(projectId: string) {
  // Buscar tasks recentes
  const { data: tasks } = await supabase
    .from('dev_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(10)
  
  return { tasks: tasks || [] }
}

async function createIdea(projectId: string, idea: IdeaSuggestion) {
  // Buscar maior ordem na coluna ideias
  const { data: existingTasks } = await supabase
    .from('dev_tasks')
    .select('ordem')
    .eq('project_id', projectId)
    .eq('status', 'ideias')
    .order('ordem', { ascending: false })
    .limit(1)
  
  const maxOrdem = existingTasks?.[0]?.ordem || 0
  
  const { data, error } = await supabase
    .from('dev_tasks')
    .insert({
      project_id: projectId,
      titulo: idea.titulo,
      descricao: idea.descricao,
      prioridade: idea.prioridade,
      tags: idea.tags || [],
      status: 'ideias',
      ordem: maxOrdem + 1,
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

async function generateIdeasForProject(project: Project): Promise<IdeaSuggestion[]> {
  const context = await getProjectContext(project.id)
  
  // Ideias contextuais baseadas no projeto
  const ideas: IdeaSuggestion[] = []
  
  if (project.slug === 'aiteam') {
    ideas.push(
      {
        titulo: 'Adicionar filtros no board de tasks',
        descricao: 'Implementar filtros por agente, prioridade, tags e status de execução no board Kanban',
        prioridade: 'medium',
        tags: ['frontend', 'ux'],
      },
      {
        titulo: 'Dashboard de custos por modelo AI',
        descricao: 'Criar página para visualizar custos de uso de Opus/Sonnet/Haiku por projeto e agente',
        prioridade: 'high',
        tags: ['analytics', 'billing'],
      },
      {
        titulo: 'Notificações em tempo real de mudanças no board',
        descricao: 'Usar Supabase Realtime para notificar quando tasks mudam de coluna ou agente responde',
        prioridade: 'medium',
        tags: ['realtime', 'ux'],
      }
    )
  } else if (project.slug === 'lercom') {
    ideas.push(
      {
        titulo: 'Sistema de recomendações de livros',
        descricao: 'Implementar algoritmo para sugerir livros baseado em histórico de leitura e preferências',
        prioridade: 'high',
        tags: ['feature', 'ml'],
      },
      {
        titulo: 'Modo offline para leitura',
        descricao: 'Permitir download de capítulos para leitura offline no app móvel',
        prioridade: 'medium',
        tags: ['mobile', 'pwa'],
      },
      {
        titulo: 'Grupos de leitura com chat integrado',
        descricao: 'Adicionar funcionalidade de chat em tempo real dentro dos grupos de leitura',
        prioridade: 'medium',
        tags: ['feature', 'social'],
      }
    )
  }
  
  // Retorna até 3 ideias
  return ideas.slice(0, 3)
}

async function main() {
  try {
    console.log('🤖 Gerando ideias de tasks...\n')
    
    const projects = await getActiveProjects()
    console.log(`📂 Projetos ativos: ${projects.length}\n`)
    
    for (const project of projects) {
      console.log(`📋 ${project.nome} (${project.slug})`)
      
      const ideas = await generateIdeasForProject(project)
      
      for (const idea of ideas) {
        const created = await createIdea(project.id, idea)
        console.log(`  ✅ ${created.titulo}`)
      }
      
      console.log('')
    }
    
    console.log('🎉 Ideias geradas com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao gerar ideias:', error)
    process.exit(1)
  }
}

main()
