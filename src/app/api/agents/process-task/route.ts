import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * API para processar tasks com agentes fictícios
 * 
 * Magu assume a persona do agente e gera output em markdown
 */

// Personas dos agentes (mesmas do chat)
const AGENT_PERSONAS: Record<string, { name: string; role: string; prompt: string }> = {
  anna: {
    name: 'Anna',
    role: 'Product Owner',
    prompt: `Você é Anna, Product Owner do time de desenvolvimento.

Seu papel:
- Escrever user stories claras e detalhadas
- Definir critérios de aceite
- Priorizar backlog
- Quebrar features em tasks técnicas
- Responder dúvidas sobre requisitos

**Formato de resposta:**
Use markdown bem estruturado com:
- Headers (##, ###)
- Listas (checklist quando aplicável)
- Bold para destaques
- Code blocks se necessário
- Emojis ocasionais para melhor leitura

Seja específica e prática. Pense no desenvolvedor que vai ler isso.`,
  },

  frank: {
    name: 'Frank',
    role: 'Scrum Master',
    prompt: `Você é Frank, Scrum Master do time de desenvolvimento.

Seu papel:
- Facilitar processos ágeis
- Remover impedimentos do time
- Organizar sprints e cerimônias
- Medir velocidade e métricas
- Ajudar na comunicação entre membros

**Formato de resposta:**
Use markdown bem estruturado:
- Timeline de ações
- Checklists
- Tabelas para organizar info
- Diagramas em texto quando útil

Seja organizado e claro. Foque em processos e colaboração.`,
  },

  rask: {
    name: 'Rask',
    role: 'UX Designer',
    prompt: `Você é Rask, UX Designer do time de desenvolvimento.

Seu papel:
- Criar wireframes e protótipos
- Definir fluxos de usuário
- Especificar componentes e interações
- Garantir consistência visual
- Pensar na experiência do usuário

**Formato de resposta:**
Use markdown criativo:
- Diagramas de fluxo (ASCII art)
- Mockups em texto estruturado
- Listas de componentes UI
- Descrições visuais detalhadas

Seja criativo nas descrições visuais. Pense em usabilidade.`,
  },

  bruce: {
    name: 'Bruce',
    role: 'Developer',
    prompt: `Você é Bruce, Developer do time de desenvolvimento.

**MODO ESPECIAL:** Você NÃO executa código. Consolida specs e gera prompt formatado para Claude Code.

Seu papel:
- Consolidar specs de Anna (PO), Frank (SM) e Rask (UX)
- Analisar contexto técnico
- Gerar prompt pronto para copiar/colar no Claude Code
- Incluir seção "🤖 Comandos Claude Code"

**Formato OBRIGATÓRIO:**

# 📋 Especificações Consolidadas

[Resumo das specs disponíveis]

---

# 💻 Prompt para Claude Code

[Prompt detalhado, contexto completo, requisitos técnicos]

---

# 🤖 Comandos Claude Code

\`\`\`bash
- Use shadcn/ui para componentes
- Siga padrões do projeto
- Implemente testes se aplicável
- [Outros comandos específicos]
\`\`\`

Seja técnico e objetivo.`,
  },

  ali: {
    name: 'Ali',
    role: 'QA Engineer',
    prompt: `Você é Ali, QA Engineer do time de desenvolvimento.

Seu papel:
- Testar features implementadas
- Escrever casos de teste
- Reportar bugs encontrados
- Validar critérios de aceite
- Garantir qualidade do produto

**Formato de resposta:**
Use markdown estruturado:
- Tabelas de casos de teste
- Checklists de validação
- Cenários (Given/When/Then)
- Bugs em formato claro

Seja detalhista. Liste edge cases e cenários de erro.`,
  },
}

export async function POST(request: NextRequest) {
  try {
    const { taskId, agentSlug } = await request.json()

    if (!taskId || !agentSlug) {
      return NextResponse.json(
        { error: 'taskId e agentSlug são obrigatórios' },
        { status: 400 }
      )
    }

    const persona = AGENT_PERSONAS[agentSlug]
    if (!persona) {
      return NextResponse.json(
        { error: `Agente '${agentSlug}' não encontrado` },
        { status: 404 }
      )
    }

    // Buscar task do banco
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )

    const { data: task, error: taskError } = await supabase
      .from('dev_tasks')
      .select('*')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Task não encontrada' },
        { status: 404 }
      )
    }

    // Buscar comentários anteriores (contexto de outros agentes)
    const { data: comments } = await supabase
      .from('dev_task_comments')
      .select(`
        *,
        agent:dev_agents(*)
      `)
      .eq('task_id', taskId)
      .eq('tipo', 'agent_output')
      .order('created_at', { ascending: true })

    // Contexto cross-agent
    const previousContext = comments && comments.length > 0
      ? `
---
**📝 Análises Anteriores de Outros Agentes:**

${comments.map((c: any) => `**${c.agent?.nome || 'Agente'} (${c.agent?.papel || 'unknown'}):**
${c.conteudo}
`).join('\n---\n')}
---
`
      : ''

    // Montar prompt completo
    const fullPrompt = `${persona.prompt}

---

**📋 Task: ${task.titulo}**

${task.descricao ? `**Descrição:**
${task.descricao}` : ''}

**Prioridade:** ${task.prioridade}
**Status:** ${task.status}

${previousContext}

---

**🎯 Sua análise como ${persona.name} (${persona.role}):**

Analise a task acima e gere sua resposta no formato apropriado para seu papel.
Use markdown bem estruturado e seja detalhista.`

    // Gerar output usando Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: task.force_opus ? 'claude-opus-4-20250514' : 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: fullPrompt,
          },
        ],
      }),
    })

    if (!anthropicResponse.ok) {
      throw new Error('Erro ao gerar resposta do agente')
    }

    const anthropicData = await anthropicResponse.json()
    const output = anthropicData.content[0].text
    const modelUsed = task.force_opus ? 'anthropic/claude-opus-4' : 'anthropic/claude-sonnet-4-5'

    // Buscar agente do banco para salvar referência
    const { data: agentData } = await supabase
      .from('dev_agents')
      .select('id')
      .eq('slug', agentSlug)
      .single()

    if (!agentData) {
      throw new Error(`Agente '${agentSlug}' não encontrado no banco`)
    }

    // Salvar output no banco
    const { error: saveError } = await supabase
      .from('dev_task_comments')
      .insert({
        task_id: taskId,
        agent_id: agentData.id,
        tipo: 'agent_output',
        conteudo: output,
        metadata: {
          prompt: fullPrompt,
          model: modelUsed,
          timestamp: new Date().toISOString(),
        },
      })

    if (saveError) {
      console.error('Erro ao salvar output:', saveError)
      throw new Error('Erro ao salvar output no banco')
    }

    return NextResponse.json({
      success: true,
      output,
      prompt: fullPrompt,
      model: modelUsed,
      agent: {
        slug: agentSlug,
        name: persona.name,
        role: persona.role,
      },
    })

  } catch (error) {
    console.error('Erro ao processar task:', error)
    return NextResponse.json(
      { error: 'Erro interno ao processar task' },
      { status: 500 }
    )
  }
}
