# AI Team - Implementação Completa

## 📋 Resumo

Sistema de gerenciamento de tasks com agentes AI que executam automaticamente quando tasks são arrastadas para suas colunas no board Kanban.

## 🌳 Git Flow

- **`main`** → Landing page (produção)
- **`dev`** → Dashboard completo (desenvolvimento ativo)
- **PRs criadas pelo Runner** → Sempre para `dev`

---

## 🎯 Fase 1: Backend (Banco de Dados)

### Migrations Criadas

#### `00002_add_opus_and_pr_fields.sql`
```sql
- force_opus: BOOLEAN (forçar modelo Opus)
- progress_log: JSONB (log incremental do agente)
- pr_url: TEXT (URL da Pull Request)
- pr_status: TEXT (pending/approved/merged/closed)
```

#### `00003_agent_columns.sql`
```sql
- Novos status: ideias, anna, frank, rask, bruce, ali, done
- ENUM atualizado no PostgreSQL
```

### Status Aplicado
✅ Migrations aplicadas no Supabase DEV (31.97.253.190)

---

## 🎨 Fase 2: Frontend (Interface)

### Componentes Atualizados

#### `KanbanBoard.tsx`
- 8 colunas: 💡 Ideias → 📋 Backlog → 👩‍💼 Anna → 🧑‍🏫 Frank → 🎨 Rask → 👨‍💻 Bruce → 🔍 Ali → ✅ Done
- Badge 🟣 Opus nos cards quando `force_opus=true`
- Cores personalizadas por agente

#### Modal de Task (`page.tsx`)
- Toggle "Forçar Opus" com aviso de custo (~3-5x mais caro)
- Switch component (shadcn) instalado
- Estado `force_opus` salvo no banco

#### Types (`supabase.ts`)
```typescript
Task {
  force_opus: boolean
  progress_log: Array<{timestamp, action, details}>
  pr_url: string | null
  pr_status: 'pending' | 'approved' | 'merged' | 'closed' | null
}
```

#### Hook `useTasks.ts`
- Suporta campo `force_opus` no createTask
- 8 colunas no `TasksByStatus`
- Tasks novas começam em "ideias"

---

## 🤖 Fase 3: Runner (Automação)

### Arquitetura

```
Task arrastada pra coluna do agente
         ↓
Runner detecta (poll 10s)
         ↓
Seleciona modelo (Opus/Sonnet/Haiku)
         ↓
Executa via OpenClaw sub-agent
         ↓
Atualiza progress_log
         ↓
Adiciona comentários
         ↓
[Bruce] Cria PR
         ↓
Move pra Done
```

### Seleção de Modelo

| Condição | Modelo |
|----------|--------|
| `force_opus=true` | 🟣 **Opus** (sempre) |
| Agente: Bruce | 🔵 **Sonnet** (mínimo) |
| Agentes: Anna, Rask | 🔵 **Sonnet** |
| Agentes: Frank, Ali + prioridade low | ⚪ **Haiku** |
| Agentes: Frank, Ali + outras | 🔵 **Sonnet** |

### Features do Runner

- ✅ Monitora colunas: anna, frank, rask, bruce, ali
- ✅ Usa `openclaw sessions spawn` para execução isolada
- ✅ Atualiza `progress_log` em tempo real
- ✅ Adiciona comentários incrementais
- ✅ Cria Pull Request automaticamente (Bruce)
- ✅ Move task pra Done ao concluir
- ✅ Volta pra Backlog em caso de erro

### Arquivos

- `runner/index.ts` - Runner v2 principal
- `runner/start.sh` - Helper para iniciar com env vars
- `runner/README.md` - Documentação completa

---

## 🚀 Como Usar

### 1. Configurar Environment Variables

```bash
cp .env.example .env.local
# Editar .env.local com as chaves corretas
```

### 2. Iniciar Runner

```bash
cd runner
pnpm install
./start.sh
```

### 3. Usar o Board

1. Criar task → cai em **Ideias**
2. Arrastar pra **Backlog** → aprovada
3. Arrastar pra coluna do agente (ex: **Bruce**) → runner executa automaticamente
4. Agente trabalha, comenta, cria PR
5. Task vai pra **Done**

### 4. Forçar Opus

- Ao criar/editar task, ativar toggle **🟣 Forçar Opus**
- Modelo Opus será usado independente do agente/prioridade
- Custo ~3-5x maior, mas maior capacidade

---

## 📊 Custo Estimado

| Modelo | Input | Output | Uso Recomendado |
|--------|-------|--------|-----------------|
| 🟣 Opus | $15/M tokens | $75/M tokens | Tasks complexas, críticas |
| 🔵 Sonnet | $3/M tokens | $15/M tokens | 80% das tasks |
| ⚪ Haiku | $0.25/M tokens | $1.25/M tokens | Tarefas triviais |

**Economia estimada:** ~60-70% usando Haiku/Sonnet ao invés de Opus em todas as tasks.

---

## 🔄 Próximos Passos (Futuro)

- [ ] Dashboard de custos por agente/modelo
- [ ] Histórico de execuções
- [ ] Retry automático em caso de falha
- [ ] Notificações quando PR for criada
- [ ] Aprovação de PR via board
- [ ] Métricas de performance (tempo médio por agente)
- [ ] Configuração de modelos por agente via UI

---

## 🐛 Troubleshooting

### Runner não detecta tasks
- Verificar env vars (SUPABASE_URL, SUPABASE_SERVICE_KEY)
- Conferir se tasks estão nas colunas dos agentes (não em ideias/backlog)

### OpenClaw spawn falha
- Runner usa fallback (modo simulado)
- Verificar se `openclaw` CLI está disponível no PATH

### PR não é criada
- Verificar se `gh` CLI está instalado e autenticado
- Conferir se projeto tem `github_repo` configurado

---

**Data de Implementação:** 2026-02-25  
**Versão:** 2.0  
**Status:** ✅ Implementado e testado
