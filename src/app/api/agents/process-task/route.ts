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
    console.log('🎯 [process-task] Iniciando processamento...')
    const { taskId, agentSlug } = await request.json()
    console.log('📦 [process-task] Payload:', { taskId, agentSlug })

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
    console.log('✅ [process-task] Persona encontrada:', persona.name)

    // Buscar task do banco
    console.log('🔍 [process-task] Buscando task no banco...')
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
      console.error('❌ [process-task] Task não encontrada:', taskError)
      return NextResponse.json(
        { error: 'Task não encontrada' },
        { status: 404 }
      )
    }
    console.log('✅ [process-task] Task encontrada:', task.titulo)

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

    // Gerar output usando OpenClaw (Magu assume a persona)
    const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3033'
    const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''
    
    console.log('🌐 [process-task] Chamando OpenClaw Gateway:', OPENCLAW_GATEWAY_URL)
    console.log('🔑 [process-task] Token configurado:', OPENCLAW_TOKEN ? 'SIM' : 'NÃO')

    const openclawResponse = await fetch(`${OPENCLAW_GATEWAY_URL}/api/v1/sessions/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        task: fullPrompt,
        label: `agent-${agentSlug}-${Date.now()}`,
        cleanup: 'delete',
        timeoutSeconds: 60,
        model: task.force_opus ? 'opus' : 'sonnet', // usa alias
      }),
    })

    if (!openclawResponse.ok) {
      const errorText = await openclawResponse.text()
      console.error('❌ [process-task] OpenClaw error (status ' + openclawResponse.status + '):', errorText)
      throw new Error(`OpenClaw retornou ${openclawResponse.status}: ${errorText}`)
    }

    const openclawData = await openclawResponse.json()
    console.log('📨 [process-task] OpenClaw response:', openclawData)
    
    // Aguarda resultado do spawn
    if (openclawData.status !== 'accepted') {
      console.error('❌ [process-task] Spawn não foi aceito:', openclawData)
      throw new Error(`OpenClaw spawn não foi aceito: ${openclawData.status}`)
    }

    // Busca resultado da sessão
    const sessionKey = openclawData.childSessionKey
    console.log('🔑 [process-task] Session key:', sessionKey)
    
    // Aguarda um pouco pra sessão processar
    console.log('⏳ [process-task] Aguardando processamento (2s)...')
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    console.log('📜 [process-task] Buscando histórico da sessão...')
    const historyResponse = await fetch(`${OPENCLAW_GATEWAY_URL}/api/v1/sessions/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        sessionKey,
        limit: 5,
      }),
    })

    if (!historyResponse.ok) {
      const errorText = await historyResponse.text()
      console.error('❌ [process-task] Erro ao buscar histórico:', errorText)
      throw new Error(`Erro ao buscar histórico: ${historyResponse.status}`)
    }

    const historyData = await historyResponse.json()
    console.log('📨 [process-task] Histórico recebido:', historyData)
    
    // Pega última mensagem do assistente
    const assistantMessages = historyData.messages?.filter((m: any) => m.role === 'assistant') || []
    console.log(`💬 [process-task] Mensagens do assistente: ${assistantMessages.length}`)
    
    const output = assistantMessages[assistantMessages.length - 1]?.content || 'Erro ao gerar resposta'
    console.log('✅ [process-task] Output gerado (preview):', output.substring(0, 100) + '...')
    
    const modelUsed = task.force_opus ? 'anthropic/claude-opus-4' : 'anthropic/claude-sonnet-4-5'

    // Buscar agente do banco para salvar referência
    console.log('🔍 [process-task] Buscando agente no banco...')
    const { data: agentData, error: agentError } = await supabase
      .from('dev_agents')
      .select('id')
      .eq('slug', agentSlug)
      .single()

    if (agentError || !agentData) {
      console.error('❌ [process-task] Agente não encontrado:', agentError)
      throw new Error(`Agente '${agentSlug}' não encontrado no banco`)
    }
    console.log('✅ [process-task] Agente encontrado:', agentData.id)

    // Salvar output no banco
    console.log('💾 [process-task] Salvando output no banco...')
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
      console.error('❌ [process-task] Erro ao salvar output:', saveError)
      throw new Error(`Erro ao salvar output no banco: ${saveError.message}`)
    }
    console.log('✅ [process-task] Output salvo com sucesso!')

    console.log('🎉 [process-task] Processamento concluído com sucesso!')
    
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
    console.error('❌ Erro ao processar task:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar task',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
