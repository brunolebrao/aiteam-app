# 🤖 AI Agents - Setup & Configuração

## 📋 Visão Geral

O AI Team usa **agentes fictícios** - o Magu assume as personas dos agentes (Anna, Frank, Rask, Bruce, Ali) e gera outputs estruturados em markdown.

## 🔑 Variáveis de Ambiente

Adicione no `.env.local`:

```bash
# Supabase (já configurado)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

⚠️ **IMPORTANTE:** 
- Não precisa de ANTHROPIC_API_KEY externa!
- Não precisa de OPENCLAW_GATEWAY_URL!
- Usa OpenClaw CLI diretamente (`openclaw sessions spawn`)
- O Magu (via OpenClaw) assume os papéis dos agentes

## 🎯 Fluxo de Processamento

### 1. **Drag & Drop**
Arrastar task para coluna de agente → trigger automático

### 2. **API Processing** (`/api/agents/process-task`)
- Busca task + contexto anterior
- Monta prompt com persona do agente
- **Chama OpenClaw CLI** (`openclaw sessions spawn`)
- **Magu assume a persona** e responde
- Remove metadata do output
- Salva output limpo no banco

### 3. **Realtime Update**
- Output aparece automaticamente no chat
- Renderizado com `AgentOutputCard`
- Botões: Copiar | Download .md

## 👥 Personas dos Agentes

### 📋 Anna (Product Owner)
**Gera:** User stories, critérios de aceite, breakdown de features

**Formato:**
```markdown
## User Story: [Título]

**Como** [usuário]
**Quero** [ação]
**Para que** [benefício]

### Critérios de Aceite
- [ ] ...
```

### 🎯 Frank (Scrum Master)
**Gera:** Planejamento de sprints, timelines, métricas

**Formato:**
- Checklists organizadas
- Timelines
- Tabelas de métricas

### 🎨 Rask (UX Designer)
**Gera:** Wireframes em texto, fluxos de usuário, specs visuais

**Formato:**
- Diagramas ASCII
- Mockups estruturados
- Listas de componentes UI

### 💻 Bruce (Developer)
**Gera:** Prompts prontos para Claude Code (NÃO executa código)

**Formato OBRIGATÓRIO:**
```markdown
# 📋 Especificações Consolidadas
[Resumo de Anna/Frank/Rask]

---

# 💻 Prompt para Claude Code
[Prompt completo, pronto para copiar]

---

# 🤖 Comandos Claude Code
- Use shadcn/ui...
- Siga padrões...
```

### 🧪 Ali (QA Engineer)
**Gera:** Casos de teste, cenários, bugs

**Formato:**
- Tabelas de casos de teste
- Given/When/Then
- Edge cases

## 🔵 Model Badges

**SEMPRE visíveis** em:
- Chat messages
- Agent output cards
- Logs de execução

**Badges:**
- 🔵 **Sonnet** (padrão, custo-benefício)
- 🟣 **Opus** (força bruta, flag `force_opus`)
- ⚪ **Haiku** (futuro, low priority)

## 🗄️ Estrutura do Banco

### `dev_task_comments` com tipo `agent_output`

```typescript
{
  id: UUID
  task_id: UUID
  agent_id: UUID
  tipo: 'agent_output'  // novo tipo
  conteudo: string      // markdown da resposta
  metadata: {
    prompt: string      // prompt completo usado
    model: string       // modelo usado (anthropic/claude-sonnet-4-5)
    timestamp: string   // ISO timestamp
  }
  created_at: timestamp
}
```

## 📦 Componentes

### `AgentOutputCard`
- **Props:** agent, output, prompt, model, createdAt, taskTitle
- **Features:**
  - Gradiente por agente
  - Badge de modelo
  - Markdown renderizado
  - Copiar / Download .md
  - Prompt collapsible

### `TaskChat`
- Detecta `tipo === 'agent_output'`
- Renderiza `AgentOutputCard`
- Comentários normais continuam como bolhinhas

## 🚀 Deploy Checklist

- [ ] `OPENCLAW_GATEWAY_URL` configurada (http://localhost:3033)
- [ ] OpenClaw Gateway rodando e acessível
- [ ] Migration `00010` rodada no Supabase
- [ ] Build passou sem erros
- [ ] Testar drag-and-drop em dev
- [ ] Verificar toasts aparecem
- [ ] Confirmar outputs salvam no banco
- [ ] Confirmar Magu responde como agentes

## 🐛 Troubleshooting

### Output não aparece no chat
1. Verificar console do navegador
2. Confirmar Realtime subscription ativa
3. Ver logs da API `/api/agents/process-task`
4. Checar se agente existe no banco (`dev_agents`)

### Erro 500 na API
1. Verificar `OPENCLAW_GATEWAY_URL` acessível
2. Confirmar OpenClaw rodando (localhost:3033)
3. Ver logs do servidor Next.js
4. Checar logs do OpenClaw

### Toast não aparece
1. Verificar `<Toaster />` no layout
2. Confirmar import `import { toast } from 'sonner'`

---

**Última atualização:** 2026-02-26
**Autor:** Magu 🔵
