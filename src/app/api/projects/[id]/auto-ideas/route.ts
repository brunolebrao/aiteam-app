import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3033'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST - Ativa/desativa ideias automáticas para um projeto
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: projectId } = await context.params
    const { enabled } = await request.json()

    // Buscar projeto
    const { data: project, error: projectError } = await supabase
      .from('dev_projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Projeto não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar campo auto_ideas
    const { error: updateError } = await supabase
      .from('dev_projects')
      .update({ auto_ideas: enabled })
      .eq('id', projectId)

    if (updateError) throw updateError

    // Gerenciar crons no OpenClaw
    if (enabled) {
      // Criar crons
      await createProjectCrons(projectId, project.nome, project.slug)
    } else {
      // Remover crons
      await removeProjectCrons(projectId)
    }

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled 
        ? 'Ideias automáticas ativadas! Crons criados para 07:00 e 22:00.'
        : 'Ideias automáticas desativadas. Crons removidos.',
    })

  } catch (error) {
    console.error('Erro ao gerenciar auto-ideas:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

/**
 * Cria crons de ideias para um projeto
 */
async function createProjectCrons(projectId: string, projectName: string, projectSlug: string) {
  // Cron 07:00 - Ideias matinais
  await fetch(`${OPENCLAW_GATEWAY_URL}/api/cron/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    },
    body: JSON.stringify({
      name: `AI Team - Ideias Matinais (07:00) - ${projectName}`,
      schedule: {
        kind: 'cron',
        expr: '0 7 * * *',
        tz: 'America/Sao_Paulo',
      },
      payload: {
        kind: 'agentTurn',
        message: `Crie 2-3 ideias de tasks para o projeto "${projectName}" (${projectSlug}). Analise o contexto do projeto e sugira melhorias, novas features ou correções necessárias. Use a API do Supabase para criar as tasks diretamente na coluna "ideias" (status='ideias') do projeto ID: ${projectId}.`,
        model: 'anthropic/claude-sonnet-4-5',
        timeoutSeconds: 180,
      },
      sessionTarget: 'isolated',
      enabled: true,
    }),
  })

  // Cron 22:00 - Ideias noturnas
  await fetch(`${OPENCLAW_GATEWAY_URL}/api/cron/add`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
    },
    body: JSON.stringify({
      name: `AI Team - Ideias Noturnas (22:00) - ${projectName}`,
      schedule: {
        kind: 'cron',
        expr: '0 22 * * *',
        tz: 'America/Sao_Paulo',
      },
      payload: {
        kind: 'agentTurn',
        message: `Revise o progresso do dia no projeto "${projectName}" (${projectSlug}). Crie 2-3 ideias de tasks com base no que foi feito hoje e no que falta fazer. Priorize tarefas pendentes ou melhorias identificadas. Use a API do Supabase para criar as tasks diretamente na coluna "ideias" (status='ideias') do projeto ID: ${projectId}.`,
        model: 'anthropic/claude-sonnet-4-5',
        timeoutSeconds: 180,
      },
      sessionTarget: 'isolated',
      enabled: true,
    }),
  })
}

/**
 * Remove crons de ideias de um projeto
 */
async function removeProjectCrons(projectId: string) {
  try {
    // Listar crons
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/cron/list`, {
      headers: {
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
    })

    if (!response.ok) return

    const { jobs } = await response.json()

    // Filtrar crons deste projeto
    const projectCrons = jobs.filter((job: any) => 
      job.name?.includes(`- ${projectId}`) || 
      job.payload?.message?.includes(`projeto ID: ${projectId}`)
    )

    // Remover cada cron
    for (const cron of projectCrons) {
      await fetch(`${OPENCLAW_GATEWAY_URL}/api/cron/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        },
        body: JSON.stringify({ jobId: cron.jobId || cron.id }),
      })
    }
  } catch (error) {
    console.error('Erro ao remover crons:', error)
  }
}
