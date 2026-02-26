import { NextRequest, NextResponse } from 'next/server'

/**
 * API para chat com agentes via OpenClaw
 * 
 * Os agentes são processados como sub-agentes do Magu (OpenClaw),
 * usando as personas definidas. Não usa Claude API diretamente.
 */

const OPENCLAW_GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:3033'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || ''

// Personas dos agentes
const AGENT_PERSONAS: Record<string, string> = {
  anna: `Você é Anna, Product Owner do time de desenvolvimento.

Seu papel:
- Escrever user stories claras e detalhadas
- Definir critérios de aceite
- Priorizar backlog
- Quebrar features em tasks técnicas
- Responder dúvidas sobre requisitos

Responda de forma profissional mas amigável. Use emojis ocasionalmente.
Seja específica e prática nas respostas.`,

  frank: `Você é Frank, Scrum Master do time de desenvolvimento.

Seu papel:
- Facilitar processos ágeis
- Remover impedimentos do time
- Organizar sprints e cerimônias
- Medir velocidade e métricas
- Ajudar na comunicação entre membros

Responda de forma calma e organizada. Foque em processos e colaboração.`,

  rask: `Você é Rask, UX Designer do time de desenvolvimento.

Seu papel:
- Criar wireframes e protótipos
- Definir fluxos de usuário
- Especificar componentes e interações
- Garantir consistência visual
- Pensar na experiência do usuário

Responda com foco em usabilidade e design. Seja criativo nas sugestões.`,

  bruce: `Você é Bruce, Developer do time de desenvolvimento.

**MODO ESPECIAL:** Você NÃO executa código diretamente. Seu papel é consolidar especificações e gerar um prompt formatado para o Claude Code.

Seu papel:
- Consolidar specs de Anna (PO), Frank (SM) e Rask (UX)
- Analisar contexto técnico da task
- Gerar prompt formatado pronto para copiar/colar no Claude Code
- Incluir seção separada "🤖 Comandos Claude Code"

**Formato da sua resposta:**

# 📋 Especificações Consolidadas

[Resumo das specs de Anna, Frank, Rask]

---

# 💻 Prompt para Claude Code

[Prompt detalhado com contexto, requisitos, critérios]

---

# 🤖 Comandos Claude Code

\`\`\`
- Use shadcn/ui para componentes
- Siga o style guide do projeto
- Implemente testes unitários
- [Outros comandos específicos]
\`\`\`

Seja técnico, objetivo e forneça um prompt completo que o desenvolvedor possa copiar diretamente.`,

  ali: `Você é Ali, QA Engineer do time de desenvolvimento.

Seu papel:
- Testar features implementadas
- Escrever casos de teste
- Reportar bugs encontrados
- Validar critérios de aceite
- Garantir qualidade do produto

Responda com foco em qualidade e detalhes. Liste cenários de teste quando apropriado.`,
}

export async function POST(request: NextRequest) {
  try {
    const { message, agentSlug, taskContext } = await request.json()

    if (!message || !agentSlug) {
      return NextResponse.json(
        { error: 'message e agentSlug são obrigatórios' },
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

    // Montar prompt com contexto
    const prompt = `${persona}

${taskContext ? `---
**Contexto da Task:**
Título: ${taskContext.titulo}
Descrição: ${taskContext.descricao || 'Sem descrição'}
Prioridade: ${taskContext.prioridade}
Status: ${taskContext.status}
---` : ''}

**Mensagem do usuário:**
${message}

Responda de acordo com seu papel.`

    // Chamar OpenClaw via sessions_spawn
    // Por enquanto, vamos usar uma abordagem mais simples:
    // Fazer uma requisição direta para o gateway
    
    const response = await fetch(`${OPENCLAW_GATEWAY_URL}/api/sessions/spawn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        task: prompt,
        label: `agent-${agentSlug}-${Date.now()}`,
        timeoutSeconds: 60,
      }),
    })

    if (!response.ok) {
      // Fallback: resposta simulada se OpenClaw não disponível
      console.warn('OpenClaw não disponível, usando fallback')
      return NextResponse.json({
        response: generateFallbackResponse(agentSlug, message),
        source: 'fallback',
      })
    }

    const result = await response.json()
    
    return NextResponse.json({
      response: result.response || result.message || 'Sem resposta',
      source: 'openclaw',
    })

  } catch (error) {
    console.error('Erro no chat:', error)
    
    // Fallback em caso de erro
    const { message, agentSlug } = await request.clone().json().catch(() => ({}))
    
    return NextResponse.json({
      response: generateFallbackResponse(agentSlug || 'anna', message || ''),
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    })
  }
}

function generateFallbackResponse(agentSlug: string, message: string): string {
  const responses: Record<string, string> = {
    anna: `📋 Como PO, vou analisar isso.

**Sobre sua mensagem:**
"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"

**Minha análise:**
Preciso entender melhor os requisitos. Podemos quebrar isso em:
1. Definir o objetivo principal
2. Listar critérios de aceite
3. Estimar complexidade

Quer que eu detalhe algum desses pontos?`,

    frank: `🎯 Como SM, vou ajudar a organizar isso.

**Situação:**
"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"

**Sugestão:**
Vamos estruturar em passos claros e definir responsáveis. Qual é a prioridade disso no sprint atual?`,

    rask: `🎨 Interessante do ponto de vista de UX!

**Sua solicitação:**
"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"

**Considerações de design:**
Preciso pensar na jornada do usuário aqui. Vou esboçar algumas ideias de interface. Tem alguma referência visual em mente?`,

    bruce: `💻 Analisando e preparando prompt para Claude Code...

**Requisito:**
"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"

---

# 📋 Especificações Consolidadas

**Contexto:** Task recebida para implementação
**Objetivo:** ${message.split('\n')[0] || 'A definir'}

---

# 💻 Prompt para Claude Code

Você é um desenvolvedor experiente trabalhando no projeto. Implemente a seguinte feature:

**Descrição:**
${message}

**Requisitos técnicos:**
- Seguir padrões do projeto existente
- Garantir responsividade
- Implementar validações necessárias
- Adicionar tratamento de erros

**Stack:**
- Next.js 16 + React 19
- TypeScript
- Tailwind CSS
- shadcn/ui

---

# 🤖 Comandos Claude Code

\`\`\`bash
# Use shadcn/ui para componentes de UI
# Siga o padrão de estrutura de pastas do projeto
# Implemente testes se aplicável
# Valide dados de entrada
# Adicione comentários em código complexo
\`\`\`

📝 **Próximos passos:**
1. Copie o prompt acima
2. Cole no Claude Code
3. Revise o código gerado
4. Teste localmente
5. Move pra coluna Ali (QA) quando pronto`,

    ali: `🧪 Vou pensar nos testes necessários.

**Funcionalidade:**
"${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"

**Cenários a testar:**
1. Fluxo principal (happy path)
2. Casos de erro
3. Edge cases

Quer que eu detalhe algum cenário específico?`,
  }

  return responses[agentSlug] || responses.anna
}
