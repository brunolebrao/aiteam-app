# AI Team Runner v2

Runner local que executa agentes AI automaticamente quando tasks são arrastadas para suas colunas.

## Funcionamento

1. **Monitora** colunas de agentes: Anna, Frank, Rask, Bruce, Ali
2. **Detecta** quando uma task entra na coluna de um agente
3. **Seleciona modelo** baseado em `force_opus` e complexidade
4. **Executa** o agente via OpenClaw sub-agent
5. **Comenta** incrementalmente o progresso
6. **Cria PR** (Bruce apenas) com mudanças
7. **Move pra Done** quando concluído

## Seleção de Modelo

```javascript
force_opus = true  →  🟣 Opus (sempre)

Agente Bruce       →  🔵 Sonnet (mínimo)
Agentes Anna/Rask  →  🔵 Sonnet
Agentes Frank/Ali  →  ⚪ Haiku (prioridade low) / 🔵 Sonnet (outras)
```

## Env Vars

```bash
SUPABASE_URL=https://supabase-dev.lercom.com.br
SUPABASE_SERVICE_KEY=your_service_key
WORKSPACE_ROOT=/Users/papailebrao/.openclaw/workspace
```

## Uso

```bash
cd runner
pnpm install
pnpm start
```

## Logs

- `📋` Task detectada
- `🤖` Agente executando
- `🧠` Modelo selecionado
- `📤` PR criada
- `✅` Task concluída
- `❌` Erro (task volta pro backlog)

## Fluxo

```
Arrastar task pra coluna do agente
         ↓
  Runner detecta (poll 10s)
         ↓
  Executa agente com modelo apropriado
         ↓
  Comenta progresso + result
         ↓
  [Bruce] Cria PR no GitHub
         ↓
  Move task pra Done
```

## Integração com OpenClaw

Usa `openclaw sessions spawn` para criar sub-agentes isolados com modelo específico.
Vantagens:
- Controle de custo por modelo
- Sessions isoladas (não poluem main)
- Auto-cleanup após execução
