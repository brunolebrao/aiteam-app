#!/bin/bash
# Script para iniciar o AI Team Runner com env vars

# Carrega .env.local se existir
if [ -f "../.env.local" ]; then
  set -a
  source ../.env.local
  set +a
fi

# Mapeia NEXT_PUBLIC vars para Runner
export SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-https://supabase-dev.lercom.com.br}}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-$NEXT_PUBLIC_SUPABASE_ANON_KEY}"
export WORKSPACE_ROOT="${WORKSPACE_ROOT:-/Users/papailebrao/.openclaw/workspace}"

# Verifica se tem chave configurada
if [ -z "$SUPABASE_SERVICE_KEY" ] && [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_KEY ou SUPABASE_ANON_KEY não configurado"
  echo "Configure em .env.local"
  echo ""
  echo "Adicione uma das linhas:"
  echo "  SUPABASE_SERVICE_KEY=your_key_here"
  echo "  ou usar NEXT_PUBLIC_SUPABASE_ANON_KEY (já existe)"
  exit 1
fi

echo "🚀 Iniciando AI Team Runner..."
echo "📍 Supabase: $SUPABASE_URL"
echo "📁 Workspace: $WORKSPACE_ROOT"
echo "🔑 Key: ${SUPABASE_SERVICE_KEY:+service_role}${SUPABASE_ANON_KEY:+anon}"
echo ""

pnpm start
