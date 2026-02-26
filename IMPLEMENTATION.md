# AI Team - Implementação Completa

## 📋 Resumo

Sistema de gerenciamento de tasks com agentes AI que funcionam de forma **interativa** — você conversa com cada agente ao arrastar a task para sua coluna no board Kanban.

## 🌳 Git Flow

- **`main`** → Landing page (produção)
- **`dev`** → Dashboard completo (desenvolvimento ativo)
- **PRs** → Sempre para `dev`

---

## 🎯 Fluxo Interativo (Novo - 2026-02-26)

### Como Funciona

```
1. Você arrasta task pra coluna de agente (Anna/Frank/Rask/Bruce/Ali)
         ↓
2. Chat abre automaticamente
         ↓
3. Agente executa primeiro turno sozinho (analisa task)
         ↓
4. Você vê a resposta e pode conversar/iterar (opcional)
         ↓
5. Fecha chat → comentário salvo na task
         ↓
6. Arrasta pra próxima coluna (ou Done)
         ↓
7. [Se Done] Oferece criar PR automaticamente
```

### 🤖 Comportamento por Coluna

#### 💡 Ideias
- Tasks soltas, brainstorm
- **Automático:** Crons criam 2-3 ideias às 07:00 e 22:00

#### 📋 Backlog
- Tasks aprovadas, esperando pra começar
- Você arrasta pra cá quando aprovar a ideia

#### 👩‍💼 Anna (PO) / 🧑‍🏫 Frank (SM) / 🎨 Rask (UX) / 🔍 Ali (QA)
**Quando você arrasta task:**
1. Chat abre automaticamente
2. Agente executa primeiro turno (analisa a task)
3. Você vê a resposta
4. Pode conversar/iterar (opcional)
5. Fecha chat → comentário salvo na task
6. Arrasta pra próxima coluna (ou Done)

**Onde roda:** OpenClaw sub-session (isolado)  
**Custo:** 1 agente por vez (econômico)

#### 👨‍💻 Bruce (Dev) - **ESPECIAL**
**Quando você arrasta task pra Bruce:**
1. Chat abre automaticamente
2. Bruce consolida tudo:
   - Specs de Anna
   - Organização de Frank
   - Design de Rask
   - Contexto da task
3. **Bruce gera PROMPT FORMATADO** pronto pra copiar:
   ```
   📋 Especificações Consolidadas
   💻 Prompt para Claude Code
   🤖 Comandos Claude Code
   ```
4. **Você copia → cola no Claude Code**
5. **Você executa manualmente** no Claude Code
6. Quando der certo → arrasta pra Ali ou Done

**Onde roda:** Você no Claude Code (manual)  
**Custo:** 1 turno pra montar prompt

#### ✅ Done
- Task concluída
- **Automático:** Oferece criar Pull Request
- Você confirma se quer PR ou não

---

## 📱 Interface

### Board Kanban (8 Colunas)

```
┌─────────┬─────────┬──────┬───────┬──────┬───────┬─────┬──────┐
│ Ideias  │ Backlog │ Anna │ Frank │ Rask │ Bruce │ Ali │ Done │
└─────────┴─────────┴──────┴───────┴──────┴───────┴─────┴──────┘
```

### Task Card

Cada card mostra:
- **Agente atribuído:** 👩‍💼 Anna
- **Status de execução:**
  - ⏳ Aguardando
  - 🔄 Executando (com animação)
  - ✅ Concluído
- **Badge Opus:** 🟣 (se forçado)
- **Prioridade/Tags**

### Chat Interativo

- Abre automaticamente ao arrastar pra coluna de agente
- Primeiro turno é automático (agente analisa)
- Pode conversar quantas vezes quiser
- Histórico completo salvo na task
- Fecha quando quiser → move pra próxima coluna

---

## 💰 Economia de Custo

✅ **Pula agentes** que não precisa  
✅ **Conversa direta** com agente (não passa por você)  
✅ **Bruce não executa** (só formata prompt)  
✅ **Modelos inteligentes:**
- 🟣 Opus: tasks marcadas "force_opus"
- 🔵 Sonnet: maioria das tasks
- ⚪ Haiku: tasks simples (Frank/Ali low priority)

### Seleção de Modelo

| Condição | Modelo |
|----------|--------|
| `force_opus=true` | 🟣 **Opus** (sempre) |
| Agente: Bruce | 🔵 **Sonnet** (mínimo) |
| Agentes: Anna, Rask | 🔵 **Sonnet** |
| Agentes: Frank, Ali + prioridade low | ⚪ **Haiku** |
| Agentes: Frank, Ali + outras | 🔵 **Sonnet** |

---

## ⏰ Automação (Crons)

### Toggle Visual

Cada projeto tem um **toggle de Ideias Automáticas** no card da home:

```
┌─────────────────────────────┐
│ 🤖 AITeam                   │
│ Grupo de Agentes...         │
│                             │
│ 🕐 Ideias Automáticas       │
│    [ ON ] 07:00 e 22:00    │
└─────────────────────────────┘
```

**Como funciona:**
- **Toggle ON:** Cria 2 crons (07:00 e 22:00) para aquele projeto
- **Toggle OFF:** Remove os crons daquele projeto
- **Configuração por projeto:** AITeam pode ter ON, LerCom OFF
- **Persistido no banco:** campo `auto_ideas` em `dev_projects`

### Ideias Matinais (07:00)
- Cron automático quando toggle ativo
- Cria 2-3 ideias de tasks
- Analisa contexto do projeto
- Insere direto na coluna "Ideias"

### Ideias Noturnas (22:00)
- Cron automático quando toggle ativo
- Revisa progresso do dia
- Cria 2-3 ideias baseadas no que falta
- Prioriza tarefas pendentes

### API Endpoint
```bash
# Ativar/desativar via API
POST /api/projects/:id/auto-ideas
{ "enabled": true }
```

### Script Manual (Legado)
```bash
# Ainda funciona para gerar ideias manualmente
bun run scripts/generate-ideas.ts
```

---

## 🗂️ Banco de Dados

### Tabelas Principais

#### `dev_projects`
```sql
- nome, slug, descricao
- github_repo (para criar PRs)
- status: active, paused, done, archived
- cor (hex)
- auto_ideas: BOOLEAN (ativa/desativa crons de ideias)
```

#### `dev_tasks`
```sql
- project_id (FK)
- titulo, descricao, prioridade
- status: ideias, backlog, anna, frank, rask, bruce, ali, done
- assigned_agent_id (FK)
- force_opus: BOOLEAN
- progress_log: JSONB
- pr_number, pr_url
- tags: TEXT[]
- ordem: INTEGER
```

#### `dev_agents`
```sql
- nome, slug, papel
- avatar_emoji
- descricao
- ativo: BOOLEAN
```

#### `dev_task_comments`
```sql
- task_id (FK)
- agent_id (FK nullable)
- conteudo: TEXT
- tipo: user, agent, system
```

---

## 🎯 Exemplos de Uso

### Cenário 1: Feature Simples (só design)
```
Backlog → Rask → Done
```
**Custo:** 1 agente (Sonnet)

### Cenário 2: Bug Crítico
```
Backlog → Bruce → Ali → Done → PR
```
**Custo:** 2 agentes (Sonnet + Haiku)

### Cenário 3: Feature Completa
```
Backlog → Anna → Frank → Rask → Bruce → Ali → Done → PR
```
**Custo:** 5 agentes (mix de Opus/Sonnet/Haiku)

### Cenário 4: Ajuste no Design
```
Bruce → (volta) Rask → Bruce → Done
```
**Flexível:** Pode voltar/pular conforme necessário

---

## 🔧 Setup

### 1. Instalar Dependências
```bash
cd aiteam-app
bun install
```

### 2. Configurar Env Vars
```bash
cp .env.example .env.local

# Preencher:
NEXT_PUBLIC_SUPABASE_URL=https://supabase-dev.lercom.com.br
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENCLAW_GATEWAY_URL=http://localhost:3033
OPENCLAW_TOKEN=...
```

### 3. Rodar Dev Server
```bash
bun dev
```

### 4. Configurar Crons (Opcional)
```bash
cd ..
./setup-crons.sh
```

---

## 📚 Stack Tecnológica

### Frontend
- **Next.js 16** + React 19
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn/ui** (componentes)
- **@hello-pangea/dnd** (drag-and-drop)
- **date-fns** (datas)

### Backend
- **Supabase** (PostgreSQL + Realtime + Auth)
- **OpenClaw** (orquestração de agentes AI)
- **Bun** (runtime + package manager)

### Integrações
- **GitHub API** (issues, PRs)
- **Anthropic Claude** (via OpenClaw)

---

## 🚀 Deploy

### DEV
```bash
git checkout dev
git push origin dev
# Coolify detecta push → deploy automático em dev.lercom.com.br
```

### PROD
```bash
# 1. Testar em dev primeiro
# 2. Merge dev → main
git checkout main
git merge dev
git push origin main
# 3. Deploy manual via SSH ou GitHub Actions
```

---

## 🐛 Troubleshooting

### Chat não abre automaticamente
- Verificar se agente está configurado corretamente no banco
- Checar console do navegador por erros
- Confirmar que coluna é de agente (anna/frank/rask/bruce/ali)

### Primeiro turno não executa
- Verificar se OpenClaw está rodando (http://localhost:3033)
- Checar env var `OPENCLAW_TOKEN`
- Ver logs do OpenClaw (`openclaw logs`)

### Crons não executam
- Listar crons: `curl http://localhost:3033/api/cron/list`
- Verificar timezone: `America/Sao_Paulo`
- Checar logs do OpenClaw

### PR não cria
- Verificar se `github_repo` está configurado no projeto
- Conferir permissões do token do GitHub
- Verificar branch `dev` existe no repo

---

## 📝 Próximos Passos (Futuro)

- [ ] Dashboard de custos por agente/modelo
- [ ] Configuração de agentes customizados
- [ ] Templates de tasks
- [ ] Exportar/importar projetos
- [ ] Integração com Linear, Jira, etc.
- [ ] Mobile app (React Native)
- [ ] Modo SaaS multi-tenant

---

## 📄 Licença

Propriedade privada - Bruno Lebrão © 2026
