# 🏢 Dev Team

Sistema de gerenciamento de projetos com time de agentes AI.

## Stack

- **Frontend:** Next.js 15 + TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (self-hosted)
- **Deploy:** Coolify

## Agentes

| Agente | Papel | Especialidade |
|--------|-------|---------------|
| 📋 Anna | PO | Specs e critérios de aceite |
| 📊 Frank | SM | Breakdown de tasks |
| 🎨 Rask | UX | Fluxos e componentes |
| 💻 Bruce | Dev | Implementação full-stack |
| 🧪 Ali | QA | Testes e validação |
| 🧙‍♂️ Magu | Orchestrator | Coordenação do time |

## Setup

```bash
# Instalar dependências
pnpm install

# Configurar variáveis de ambiente
cp .env.example .env.local

# Rodar localmente
pnpm dev

# Build
pnpm build
```

## Database

Aplicar migrations no Supabase:

```bash
# Via psql
psql -h supabase-dev.lercom.com.br -U postgres -d postgres -f supabase/migrations/00001_initial_schema.sql
```

## Deploy

O app roda no Coolify em `team.brunolebrao.com.br`.

## Estrutura

```
src/
├── app/
│   ├── page.tsx              # Dashboard (lista projetos)
│   ├── projects/
│   │   └── [slug]/
│   │       └── page.tsx      # Kanban do projeto
│   └── agents/
│       └── page.tsx          # Gerenciar agentes
├── components/
│   └── ui/                   # shadcn/ui
├── hooks/
└── lib/
```
