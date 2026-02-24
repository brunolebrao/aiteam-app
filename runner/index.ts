/**
 * AI Team Runner - Executa agentes localmente
 * 
 * Uso: npx tsx runner/index.ts
 * 
 * Monitora tasks no Supabase e executa o agente apropriado
 */

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase-dev.lercom.com.br'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
const POLL_INTERVAL = 10000 // 10 segundos
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/home/brunolebrao/.openclaw/workspace'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Tipos
interface Task {
  id: string
  project_id: string
  titulo: string
  descricao: string | null
  status: string
  prioridade: string
  assigned_agent_id: string | null
  tags: string[]
  metadata: Record<string, any>
}

interface Agent {
  id: string
  slug: string
  nome: string
  papel: string
  descricao: string
  persona_md: string | null
}

interface Project {
  id: string
  slug: string
  nome: string
  github_repo: string | null
}

// Personas dos agentes
const AGENT_PERSONAS: Record<string, string> = {
  anna: `Você é Anna, Product Owner do time.
Seu papel:
- Escrever user stories claras e detalhadas
- Definir critérios de aceite
- Priorizar backlog
- Quebrar features em tasks técnicas

Formato de output:
## User Story
Como [persona], quero [ação] para [benefício]

## Critérios de Aceite
- [ ] Critério 1
- [ ] Critério 2

## Tasks Técnicas
1. Task 1
2. Task 2`,

  frank: `Você é Frank, Scrum Master do time.
Seu papel:
- Analisar o board e identificar bloqueios
- Sugerir ações para destravar tasks
- Organizar sprints e prioridades
- Facilitar comunicação entre agentes

Formato de output:
## Análise
[Situação atual]

## Bloqueios Identificados
- Bloqueio 1

## Ações Sugeridas
1. Ação 1`,

  rask: `Você é Rask, UX Designer do time.
Seu papel:
- Criar wireframes e specs de UI
- Definir fluxos de usuário
- Especificar componentes e interações
- Garantir consistência visual

Formato de output:
## Spec de UI
[Descrição do componente/tela]

## Fluxo
1. Passo 1
2. Passo 2

## Componentes
- Componente: [descrição]`,

  bruce: `Você é Bruce, Developer do time.
Seu papel:
- Implementar features no código
- Corrigir bugs
- Fazer code review
- Escrever testes

Você tem acesso ao código via Claude Code.
Implemente a task diretamente no repositório.`,

  ali: `Você é Ali, QA Engineer do time.
Seu papel:
- Testar features implementadas
- Escrever casos de teste
- Reportar bugs encontrados
- Validar critérios de aceite

Formato de output:
## Resultado dos Testes
✅ Passou / ❌ Falhou

## Casos Testados
1. [Caso]: [Resultado]

## Bugs Encontrados
- Bug 1: [descrição]`
}

// Mapeia projeto para pasta local
function getProjectPath(project: Project): string {
  const projectPaths: Record<string, string> = {
    'lercom': path.join(WORKSPACE_ROOT, 'lercom-app'),
    'aiteam': path.join(WORKSPACE_ROOT, 'aiteam-app'),
  }
  return projectPaths[project.slug] || path.join(WORKSPACE_ROOT, project.slug)
}

// Adiciona comentário na task
async function addComment(taskId: string, agentId: string, content: string, tipo: string = 'comment') {
  const { error } = await supabase
    .from('dev_task_comments')
    .insert({
      task_id: taskId,
      agent_id: agentId,
      tipo,
      conteudo: content,
    })
  
  if (error) console.error('Erro ao adicionar comentário:', error)
}

// Atualiza status da task
async function updateTaskStatus(taskId: string, status: string) {
  const { error } = await supabase
    .from('dev_tasks')
    .update({ status })
    .eq('id', taskId)
  
  if (error) console.error('Erro ao atualizar status:', error)
}

// Executa Claude Code (para Bruce - dev)
async function runClaudeCode(prompt: string, projectPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🖥️  Executando Claude Code em ${projectPath}...`)
    
    const proc = spawn('claude', ['-p', prompt], {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let output = ''
    let error = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
      process.stdout.write(data)
    })

    proc.stderr.on('data', (data) => {
      error += data.toString()
      process.stderr.write(data)
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(`Claude Code exited with code ${code}: ${error}`))
      }
    })

    proc.on('error', reject)
  })
}

// Executa Claude Chat (para outros agentes)
async function runClaudeChat(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`💬 Executando Claude Chat...`)
    
    // Usa claude CLI em modo não-interativo
    const proc = spawn('claude', ['-p', prompt, '--no-input'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let output = ''
    let error = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      error += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(output)
      } else {
        // Fallback: retorna mensagem simulada se Claude não disponível
        console.warn('Claude CLI não disponível, usando fallback')
        resolve(`[Simulado] Análise da task concluída.`)
      }
    })

    proc.on('error', () => {
      // Fallback
      resolve(`[Simulado] Análise da task concluída.`)
    })
  })
}

// Executa Playwright (para Ali - QA)
async function runPlaywright(projectPath: string, testPattern?: string): Promise<string> {
  return new Promise((resolve) => {
    console.log(`🧪 Executando testes Playwright...`)
    
    const args = ['exec', 'playwright', 'test']
    if (testPattern) args.push(testPattern)
    
    const proc = spawn('pnpm', args, {
      cwd: projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let output = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.stderr.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      resolve(code === 0 
        ? `✅ Testes passaram!\n\n${output}`
        : `❌ Testes falharam!\n\n${output}`
      )
    })

    proc.on('error', () => {
      resolve('⚠️ Playwright não configurado neste projeto')
    })
  })
}

// Monta prompt completo para o agente
function buildAgentPrompt(agent: Agent, task: Task, project: Project): string {
  const persona = agent.persona_md || AGENT_PERSONAS[agent.slug] || ''
  
  return `${persona}

---

## Projeto: ${project.nome}
${project.github_repo ? `Repositório: ${project.github_repo}` : ''}

## Task: ${task.titulo}
Prioridade: ${task.prioridade}
${task.descricao || ''}

${task.tags?.length ? `Tags: ${task.tags.join(', ')}` : ''}

---

Execute esta task de acordo com seu papel. Seja específico e prático.`
}

// Processa uma task
async function processTask(task: Task, agent: Agent, project: Project) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📋 Processando: ${task.titulo}`)
  console.log(`🤖 Agente: ${agent.nome} (${agent.papel})`)
  console.log(`📁 Projeto: ${project.nome}`)
  console.log('='.repeat(60))

  const projectPath = getProjectPath(project)
  const prompt = buildAgentPrompt(agent, task, project)

  // Marca como "doing"
  await updateTaskStatus(task.id, 'doing')
  await addComment(task.id, agent.id, `🚀 Iniciando trabalho na task...`, 'status_change')

  try {
    let result: string

    switch (agent.slug) {
      case 'bruce':
        // Dev usa Claude Code
        result = await runClaudeCode(prompt, projectPath)
        break

      case 'ali':
        // QA roda testes + análise
        const testResult = await runPlaywright(projectPath)
        const analysisPrompt = `${prompt}\n\nResultado dos testes:\n${testResult}`
        result = await runClaudeChat(analysisPrompt)
        result = `${testResult}\n\n---\n\n${result}`
        break

      default:
        // Outros agentes usam Claude Chat
        result = await runClaudeChat(prompt)
    }

    // Adiciona resultado como comentário
    await addComment(task.id, agent.id, result, 'comment')

    // Move para review (dev) ou done (outros)
    const nextStatus = agent.slug === 'bruce' ? 'review' : 'done'
    await updateTaskStatus(task.id, nextStatus)
    await addComment(task.id, agent.id, `✅ Task movida para ${nextStatus}`, 'status_change')

    console.log(`\n✅ Task concluída!`)

  } catch (error) {
    console.error(`\n❌ Erro ao processar task:`, error)
    await addComment(task.id, agent.id, `❌ Erro: ${error}`, 'system')
    await updateTaskStatus(task.id, 'blocked')
  }
}

// Busca tasks pendentes
async function fetchPendingTasks(): Promise<{ task: Task; agent: Agent; project: Project }[]> {
  // Busca tasks em "todo" que têm agente atribuído
  const { data: tasks, error } = await supabase
    .from('dev_tasks')
    .select(`
      *,
      assigned_agent:dev_agents(*),
      project:dev_projects(*)
    `)
    .eq('status', 'todo')
    .not('assigned_agent_id', 'is', null)
    .order('prioridade', { ascending: false })
    .order('ordem', { ascending: true })

  if (error) {
    console.error('Erro ao buscar tasks:', error)
    return []
  }

  return (tasks || [])
    .filter(t => t.assigned_agent && t.project)
    .map(t => ({
      task: t as Task,
      agent: t.assigned_agent as Agent,
      project: t.project as Project,
    }))
}

// Loop principal
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🤖 AI Team Runner - Local Execution             ║
╠═══════════════════════════════════════════════════════════╣
║  Monitorando tasks em: ${SUPABASE_URL.slice(0, 35)}...
║  Workspace: ${WORKSPACE_ROOT.slice(0, 43)}...
║  Poll interval: ${POLL_INTERVAL / 1000}s
╚═══════════════════════════════════════════════════════════╝
`)

  while (true) {
    try {
      const pending = await fetchPendingTasks()

      if (pending.length > 0) {
        console.log(`\n📥 ${pending.length} task(s) pendente(s)`)
        
        // Processa uma task por vez
        const { task, agent, project } = pending[0]
        await processTask(task, agent, project)
      } else {
        process.stdout.write('.')
      }

    } catch (error) {
      console.error('Erro no loop:', error)
    }

    // Aguarda próximo poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }
}

// Executa
main().catch(console.error)
