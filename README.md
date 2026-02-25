# AI Team

> Dashboard para gerenciar projetos de desenvolvimento com agentes de IA especializados

## 🌳 Branches

- **`main`** → Landing page (produção)
- **`dev`** → Dashboard completo (desenvolvimento)
- **PRs** → Sempre para `dev`

## 🤖 Agentes

- **👩‍💼 Anna** - Product Owner (escreve user stories, define critérios)
- **🧑‍🏫 Frank** - Scrum Master (organiza sprints, remove bloqueios)
- **🎨 Rask** - UX Designer (wireframes, specs de UI)
- **👨‍💻 Bruce** - Developer (implementa código, cria PRs)
- **🔍 Ali** - QA Engineer (testa, reporta bugs)

## 🚀 Tech Stack

- **Frontend:** Next.js 16 + React 19 + Tailwind 4 + shadcn
- **Backend:** Supabase (PostgreSQL + Realtime + Storage)
- **IA:** Claude (Opus/Sonnet/Haiku) via OpenClaw
- **Deploy:** Coolify

## 📦 Estrutura

```
main/               → Landing page simples
dev/                → Dashboard completo
├── src/
│   ├── app/        → Pages (Next.js App Router)
│   ├── components/ → UI components (Board, Tasks, etc)
│   ├── hooks/      → Custom hooks (useTasks, etc)
│   └── lib/        → Utils, Supabase client
├── runner/         → Automação (executa agentes)
└── supabase/       → Migrations, schema
```

## 🔄 Fluxo de Trabalho

### Desenvolvimento

```bash
# Clonar e instalar
git clone https://github.com/brunolebrao/aiteam-app
cd aiteam-app
git checkout dev
pnpm install

# Rodar localmente
pnpm dev

# Rodar runner
cd runner
./start.sh
```

### Criar Feature

1. Branch a partir de `dev`
2. Desenvolver
3. Push e criar PR pra `dev`
4. Merge após aprovação
5. `dev` → `main` quando estável

## 🧠 Seleção de Modelo

Runner seleciona automaticamente:

- **🟣 Opus** → `force_opus=true` (tasks complexas/críticas)
- **🔵 Sonnet** → Bruce (sempre), Anna/Rask, Frank/Ali (prioridade média/alta)
- **⚪ Haiku** → Frank/Ali (prioridade baixa)

**Economia estimada:** ~60-70% vs usar Opus em tudo

## 📊 Board Kanban

```
💡 Ideias → 📋 Backlog → 👩‍💼 Anna → 🧑‍🏫 Frank → 🎨 Rask → 👨‍💻 Bruce → 🔍 Ali → ✅ Done
```

Arrastar task pra coluna do agente = execução automática

## 🔑 Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://supabase-dev.lercom.com.br
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
WORKSPACE_ROOT=/path/to/workspace
```

## 📚 Documentação

- `IMPLEMENTATION.md` - Guia completo de implementação
- `runner/README.md` - Docs do runner

## 🌐 Deploy

- **DEV:** https://dev.aiteam.com.br (Coolify)
- **PROD:** https://aiteam.com.br (landing + futuro dashboard)

## 🤝 Contribuir

PRs são bem-vindos! Sempre para branch `dev`.

## 📄 Licença

MIT
