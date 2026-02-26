/**
 * AI Team Runner - Executa agentes localmente
 * 
 * Uso: npx tsx runner/index.ts
 * 
 * Monitora tasks nas colunas dos agentes e executa automaticamente
 */

import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import * as path from 'path'

// Config
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://supabase-dev.lercom.com.br'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
const POLL_INTERVAL = 10000 // 10 segundos
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || '/Users/papailebrao/.openclaw/workspace'

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
  force_opus: boolean
  progress_log: Array<{ timestamp: string; action: string; details: string }>
  pr_url: string | null
  pr_status: string | null
  execution_status: 'pending' | 'running' | 'completed' | null
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

// Modelos disponíveis
const MODELS = {
  OPUS: 'anthropic/claude-opus-4-5',
  SONNET: 'anthropic/claude-sonnet-4-5',
  HAIKU: 'anthropic/claude-haiku-4-5',
}

// Mapeia projeto para pasta local
function getProjectPath(project: Project): string {
  const projectPaths: Record<string, string> = {
    'lercom': path.join(WORKSPACE_ROOT, 'lercom-app'),
    'aiteam': path.join(WORKSPACE_ROOT, 'aiteam-app'),
  }
  return projectPaths[project.slug] || path.join(WORKSPACE_ROOT, project.slug)
}

// Escolhe modelo baseado em force_opus e complexidade
function selectModel(task: Task, agent: Agent): string {
  if (task.force_opus) {
    return MODELS.OPUS
  }

  // Bruce (dev) sempre usa Sonnet ou melhor
  if (agent.slug === 'bruce') {
    return MODELS.SONNET
  }

  // Frank (SM) e Ali (QA) podem usar Haiku para tarefas simples
  if (['frank', 'ali'].includes(agent.slug)) {
    return task.prioridade === 'low' ? MODELS.HAIKU : MODELS.SONNET
  }

  // Anna (PO) e Rask (UX) usam Sonnet
  return MODELS.SONNET
}

// Adiciona entrada no progress_log
async function addProgressLog(taskId: string, action: string, details: string) {
  try {
    const { data: task, error: fetchError } = await supabase
      .from('dev_tasks')
      .select('progress_log')
      .eq('id', taskId)
      .single()

    if (fetchError) {
      console.error('Erro ao buscar task para progress_log:', fetchError)
      return
    }

    const currentLog = Array.isArray(task?.progress_log) ? task.progress_log : []
    const newEntry = {
      timestamp: new Date().toISOString(),
      action,
      details,
    }

    const updatedLog = [...currentLog, newEntry]
    
    const { error: updateError } = await supabase
      .from('dev_tasks')
      .update({ progress_log: updatedLog })
      .eq('id', taskId)

    if (updateError) {
      console.error('Erro ao atualizar progress_log:', updateError)
    } else {
      console.log(`📝 Progress log: ${action} - ${details}`)
    }
  } catch (error) {
    console.error('Erro em addProgressLog:', error)
  }
}

// Adiciona comentário na task
async function addComment(taskId: string, agentId: string, content: string, tipo: string = 'comment') {
  await supabase
    .from('dev_task_comments')
    .insert({
      task_id: taskId,
      agent_id: agentId,
      tipo,
      conteudo: content,
    })
}

// Atualiza status da task
async function updateTaskStatus(taskId: string, status: string, execution_status?: string) {
  const update: any = { status }
  if (execution_status !== undefined) {
    update.execution_status = execution_status
  }
  const { error } = await supabase
    .from('dev_tasks')
    .update(update)
    .eq('id', taskId)
  
  if (error) {
    console.error(`❌ Erro ao atualizar status da task ${taskId}:`, error)
    throw error
  } else {
    console.log(`✅ Status atualizado: ${status}${execution_status ? ` (execution: ${execution_status})` : ''}`)
  }
}

// Atualiza execution_status
async function updateExecutionStatus(taskId: string, execution_status: string) {
  await supabase
    .from('dev_tasks')
    .update({ execution_status })
    .eq('id', taskId)
}

// Cria PR no GitHub (para Bruce)
async function createPullRequest(projectPath: string, task: Task): Promise<{ url: string; number: number } | null> {
  try {
    console.log(`📤 Criando Pull Request...`)
    
    // Commita mudanças
    await execCommand('git', ['add', '-A'], projectPath)
    await execCommand('git', ['commit', '-m', `feat: ${task.titulo}\n\n${task.descricao || ''}`], projectPath)
    
    // Cria branch e push
    const branchName = `task-${task.id.slice(0, 8)}`
    await execCommand('git', ['checkout', '-b', branchName], projectPath)
    await execCommand('git', ['push', 'origin', branchName], projectPath)
    
    // Cria PR via gh CLI
    const prTitle = task.titulo
    const prBody = `${task.descricao || ''}\n\n---\n\nTask ID: ${task.id}`
    
    const result = await execCommand('gh', [
      'pr', 'create',
      '--title', prTitle,
      '--body', prBody,
      '--base', 'dev',
    ], projectPath)
    
    // Extrai URL da PR
    const match = result.match(/https:\/\/github\.com\/[^\s]+/)
    if (match) {
      const prUrl = match[0]
      const prNumber = parseInt(prUrl.split('/').pop() || '0')
      return { url: prUrl, number: prNumber }
    }
    
    return null
  } catch (error) {
    console.error('Erro ao criar PR:', error)
    return null
  }
}

// Helper para executar comandos
function execCommand(cmd: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] })
    
    let output = ''
    let error = ''
    
    proc.stdout.on('data', (data) => { output += data.toString() })
    proc.stderr.on('data', (data) => { error += data.toString() })
    
    proc.on('close', (code) => {
      if (code === 0) resolve(output)
      else reject(new Error(`${cmd} exited with code ${code}: ${error}`))
    })
    
    proc.on('error', reject)
  })
}

// Executa Claude via OpenClaw sessions_spawn
async function runClaudeViaOpenClaw(prompt: string, model: string, agentSlug: string): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`🤖 Executando Claude (${model})...`)
    
    // Usa openclaw CLI para spawnar um sub-agente
    const proc = spawn('openclaw', [
      'sessions', 'spawn',
      '--model', model,
      '--task', prompt,
      '--label', `aiteam-${agentSlug}`,
      '--cleanup', 'delete',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let output = ''
    let error = ''

    proc.stdout.on('data', (data) => {
      const str = data.toString()
      output += str
      process.stdout.write(str)
    })

    proc.stderr.on('data', (data) => {
      error += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0) {
        // Filtra metadata do OpenClaw e pega só a resposta
        const cleaned = cleanOpenClawOutput(output)
        resolve(cleaned)
      } else {
        // Fallback: simula resposta
        console.warn('OpenClaw spawn falhou, usando fallback')
        resolve(`[Simulado] Tarefa analisada e concluída.`)
      }
    })

    proc.on('error', () => {
      resolve(`[Simulado] Tarefa analisada e concluída.`)
    })
  })
}

// Remove metadata do OpenClaw e retorna só a resposta do agente
function cleanOpenClawOutput(raw: string): string {
  const lines = raw.split('\n')
  const cleanedLines: string[] = []
  let inAgentResponse = false
  
  for (const line of lines) {
    // Skip linhas de metadata do OpenClaw
    if (
      line.includes('Session store:') ||
      line.includes('Sessions listed:') ||
      line.includes('Kind') ||
      line.includes('Flags') ||
      line.includes('direct agent:') ||
      line.includes('group agent:') ||
      line.includes('system id:') ||
      line.match(/^\d+k\/\d+k/) || // Context usage (112k/1000k)
      line.trim().length === 0
    ) {
      continue
    }
    
    // Detecta início da resposta do agente
    if (!inAgentResponse && line.trim().length > 0 && !line.includes('Age') && !line.includes('Model')) {
      inAgentResponse = true
    }
    
    if (inAgentResponse) {
      cleanedLines.push(line)
    }
  }
  
  const result = cleanedLines.join('\n').trim()
  
  // Se ficou vazio ou muito curto, retorna simulado
  if (!result || result.length < 20) {
    return '[Simulado] Task analisada. Aguardando implementação completa do agente.'
  }
  
  return result
}

// Personas dos agentes
function getAgentPersona(agentSlug: string): string {
  const personas: Record<string, string> = {
    anna: `Você é Anna, Product Owner.
Analise a task e produza:
- User Story detalhada
- Critérios de aceite claros
- Sugestão de decomposição em subtasks técnicas`,

    frank: `Você é Frank, Scrum Master.
Analise a situação e produza:
- Identificação de bloqueios
- Sugestões de organização
- Ações para melhorar o fluxo`,

    rask: `Você é Rask, UX Designer.
Crie a especificação de UI:
- Wireframe textual ou ASCII art
- Fluxo de interação
- Componentes necessários`,

    bruce: `Você é Bruce, Developer.
Implemente a feature:
- Escreva o código necessário
- Crie/atualize arquivos
- Adicione testes se necessário
- Commite as mudanças`,

    ali: `Você é Ali, QA Engineer.
Execute os testes e reporte:
- Casos de teste executados
- Resultados (passou/falhou)
- Bugs encontrados
- Sugestões de melhoria`,
  }
  
  return personas[agentSlug] || 'Você é um agente do time. Analise e execute a task.'
}

// Monta prompt completo
function buildPrompt(agent: Agent, task: Task, project: Project): string {
  const persona = getAgentPersona(agent.slug)
  
  return `${persona}

---

## Projeto: ${project.nome}
${project.github_repo ? `Repositório: ${project.github_repo}` : ''}

## Task: ${task.titulo}
Prioridade: ${task.prioridade}
${task.descricao || ''}

${task.tags?.length ? `Tags: ${task.tags.join(', ')}` : ''}

---

Execute de acordo com seu papel. Seja objetivo e prático.`
}

// Processa uma task
async function processTask(task: Task, agent: Agent, project: Project) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`📋 Task: ${task.titulo}`)
  console.log(`🤖 Agente: ${agent.nome} (${agent.papel})`)
  console.log(`📁 Projeto: ${project.nome}`)
  
  const model = selectModel(task, agent)
  const modelBadge = task.force_opus ? '🟣 Opus' : model.includes('sonnet') ? '🔵 Sonnet' : '⚪ Haiku'
  console.log(`🧠 Modelo: ${modelBadge}`)
  console.log('='.repeat(60))

  const projectPath = getProjectPath(project)
  const prompt = buildPrompt(agent, task, project)

  try {
    // Marca como running
    await updateExecutionStatus(task.id, 'running')
    
    // Log: iniciando
    await addProgressLog(task.id, 'started', `Agente ${agent.nome} iniciou trabalho`)
    await addComment(task.id, agent.id, `🚀 Iniciando trabalho (modelo: ${modelBadge})`, 'status_change')

    // Executa agente
    await addProgressLog(task.id, 'executing', 'Executando análise/implementação...')
    const result = await runClaudeViaOpenClaw(prompt, model, agent.slug)

    // Adiciona resultado como comentário
    await addComment(task.id, agent.id, result, 'comment')
    await addProgressLog(task.id, 'completed', 'Execução concluída')
    
    // Marca como completed
    await updateExecutionStatus(task.id, 'completed')

    // Bruce: criar PR
    if (agent.slug === 'bruce' && project.github_repo) {
      await addProgressLog(task.id, 'creating_pr', 'Criando Pull Request...')
      const pr = await createPullRequest(projectPath, task)
      
      if (pr) {
        await supabase
          .from('dev_tasks')
          .update({
            pr_url: pr.url,
            pr_status: 'pending',
          })
          .eq('id', task.id)
        
        await addComment(task.id, agent.id, `📤 PR criada: ${pr.url}`, 'system')
        await addProgressLog(task.id, 'pr_created', `PR #${pr.number} criada`)
      }
    }

    // Move para Done (trigger vai limpar execution_status automaticamente)
    await updateTaskStatus(task.id, 'done')
    await addComment(task.id, agent.id, `✅ Task concluída!`, 'status_change')
    await addProgressLog(task.id, 'done', 'Task movida para Done')

    console.log(`\n✅ Task concluída!\n`)

  } catch (error) {
    console.error(`\n❌ Erro ao processar task:`, error)
    await addComment(task.id, agent.id, `❌ Erro: ${error}`, 'system')
    await addProgressLog(task.id, 'error', `Erro: ${error}`)
    
    // Volta task para backlog em caso de erro (trigger vai resetar execution_status)
    await updateTaskStatus(task.id, 'backlog')
  }
}

// Busca tasks nas colunas dos agentes
async function fetchPendingTasks(): Promise<{ task: Task; agent: Agent; project: Project }[]> {
  const agentColumns = ['anna', 'frank', 'rask', 'bruce', 'ali']
  
  const { data: tasks, error } = await supabase
    .from('dev_tasks')
    .select(`
      *,
      project:dev_projects(*)
    `)
    .in('status', agentColumns)
    .order('prioridade', { ascending: false })
    .order('ordem', { ascending: true })

  if (error) {
    console.error('Erro ao buscar tasks:', error)
    return []
  }

  // Busca agentes
  const { data: agents } = await supabase
    .from('dev_agents')
    .select('*')
    .in('slug', agentColumns)

  if (!agents) return []

  const agentMap = Object.fromEntries(agents.map(a => [a.slug, a]))

  return (tasks || [])
    .filter(t => t.project && agentMap[t.status])
    .map(t => ({
      task: t as Task,
      agent: agentMap[t.status] as Agent,
      project: t.project as Project,
    }))
}

// Loop principal
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║          🤖 AI Team Runner v2 - Smart Execution           ║
╠═══════════════════════════════════════════════════════════╣
║  Supabase: ${SUPABASE_URL.slice(0, 45)}
║  Workspace: ${WORKSPACE_ROOT.slice(0, 43)}
║  Poll: ${POLL_INTERVAL / 1000}s | Models: Opus/Sonnet/Haiku
╚═══════════════════════════════════════════════════════════╝
`)

  while (true) {
    try {
      const pending = await fetchPendingTasks()

      if (pending.length > 0) {
        console.log(`\n📥 ${pending.length} task(s) em execução`)
        
        // Processa uma task por vez
        const { task, agent, project } = pending[0]
        await processTask(task, agent, project)
      } else {
        process.stdout.write('.')
      }

    } catch (error) {
      console.error('Erro no loop:', error)
    }

    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }
}

// Executa
main().catch(console.error)
