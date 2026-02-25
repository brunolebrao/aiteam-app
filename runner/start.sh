#!/bin/bash
# Script para iniciar o AI Team Runner com env vars

# Carrega .env se existir
if [ -f "../.env.local" ]; then
  export $(cat ../.env.local | grep -v '^#' | xargs)
fi

# Env vars obrigatórias
export SUPABASE_URL="${SUPABASE_URL:-https://supabase-dev.lercom.com.br}"
export WORKSPACE_ROOT="${WORKSPACE_ROOT:-/Users/papailebrao/.openclaw/workspace}"

# Verifica se tem SUPABASE_SERVICE_KEY
if [ -z "$SUPABASE_SERVICE_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_KEY ou SUPABASE_ANON_KEY não configurado"
  echo "Configure em .env.local ou exporte antes de rodar"
  exit 1
fi

echo "🚀 Iniciando AI Team Runner..."
echo "📍 Supabase: $SUPABASE_URL"
echo "📁 Workspace: $WORKSPACE_ROOT"
echo ""

pnpm start
