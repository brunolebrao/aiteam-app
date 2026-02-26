import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

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

    return NextResponse.json({
      success: true,
      enabled,
      message: enabled 
        ? `✅ Ideias automáticas ativadas para ${project.nome}! O projeto receberá ideias às 07:00 e 22:00.`
        : `⏸️ Ideias automáticas desativadas para ${project.nome}.`,
    })

  } catch (error) {
    console.error('Erro ao gerenciar auto-ideas:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}
