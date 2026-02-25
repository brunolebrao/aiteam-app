'use client'

import { useEffect, useState, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IoArrowBackOutline, IoSettingsOutline, IoAdd, IoLogoGithub } from 'react-icons/io5'
import Link from 'next/link'
import { supabase, Project, Agent } from '@/lib/supabase'
import { useTasks, TaskWithAgent } from '@/hooks/useTasks'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { TaskChat } from '@/components/chat/TaskChat'

interface PageProps {
  params: Promise<{ slug: string }>
}

const statusLabels: Record<string, string> = {
  planning: '📝 Planejando',
  active: '🚀 Ativo',
  paused: '⏸️ Pausado',
  done: '✅ Concluído',
  archived: '📦 Arquivado',
}

export default function ProjectPage({ params }: PageProps) {
  const { slug } = use(params)
  const [project, setProject] = useState<Project | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithAgent | null>(null)
  const [chatTask, setChatTask] = useState<TaskWithAgent | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  // Form state
  const [taskTitulo, setTaskTitulo] = useState('')
  const [taskDescricao, setTaskDescricao] = useState('')
  const [taskPrioridade, setTaskPrioridade] = useState('medium')
  const [taskAgentId, setTaskAgentId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const { 
    tasksByStatus, 
    loading: tasksLoading, 
    createTask, 
    updateTask,
    moveTask, 
    deleteTask, 
    assignAgent 
  } = useTasks(project?.id || '')

  useEffect(() => {
    async function fetchData() {
      try {
        // Buscar projeto
        const { data: projectData, error: projectError } = await supabase
          .from('dev_projects')
          .select('*')
          .eq('slug', slug)
          .single()

        if (projectError) throw projectError
        setProject(projectData)

        // Buscar agentes
        const { data: agentsData } = await supabase
          .from('dev_agents')
          .select('*')
          .eq('ativo', true)
          .order('papel')

        setAgents(agentsData || [])

      } catch (err) {
        console.error('Erro ao buscar dados:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  const handleNewTask = () => {
    setEditingTask(null)
    setTaskTitulo('')
    setTaskDescricao('')
    setTaskPrioridade('medium')
    setTaskAgentId('')
    setTaskDialogOpen(true)
  }

  const handleEditTask = (task: TaskWithAgent) => {
    setEditingTask(task)
    setTaskTitulo(task.titulo)
    setTaskDescricao(task.descricao || '')
    setTaskPrioridade(task.prioridade)
    setTaskAgentId(task.assigned_agent_id || '')
    setTaskDialogOpen(true)
  }

  const handleSaveTask = async () => {
    if (!taskTitulo.trim()) return

    try {
      setSaving(true)

      if (editingTask) {
        await updateTask(editingTask.id, {
          titulo: taskTitulo,
          descricao: taskDescricao || null,
          prioridade: taskPrioridade,
          assigned_agent_id: taskAgentId || null,
        })
      } else {
        await createTask({
          titulo: taskTitulo,
          descricao: taskDescricao,
          prioridade: taskPrioridade,
          assigned_agent_id: taskAgentId || undefined,
        })
      }

      setTaskDialogOpen(false)
    } catch (err) {
      console.error('Erro ao salvar task:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (confirm('Tem certeza que deseja excluir esta task?')) {
      await deleteTask(taskId)
    }
  }

  const handleOpenChat = (task: TaskWithAgent) => {
    setChatTask(task)
    setChatOpen(true)
  }

  const handleCreateIssue = async (task: TaskWithAgent) => {
    if (!project?.github_repo) {
      alert('Este projeto não tem repositório GitHub configurado.')
      return
    }

    try {
      const response = await fetch('/api/github/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: project.github_repo,
          task: {
            titulo: task.titulo,
            descricao: task.descricao,
            prioridade: task.prioridade,
            tags: task.tags,
          },
          labels: task.tags || [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar issue')
      }

      const issue = await response.json()
      alert(`Issue #${issue.number} criada com sucesso!\n${issue.html_url}`)
      
      // Salvar referência da issue na task (metadata)
      await updateTask(task.id, {
        metadata: { ...task.metadata, github_issue: issue.number, github_issue_url: issue.html_url }
      })
    } catch (err) {
      console.error('Erro ao criar issue:', err)
      alert(err instanceof Error ? err.message : 'Erro ao criar issue')
    }
  }

  const handleSendToAgent = async (message: string, agent: Agent): Promise<string> => {
    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          agentSlug: agent.slug,
          taskContext: chatTask ? {
            titulo: chatTask.titulo,
            descricao: chatTask.descricao,
            prioridade: chatTask.prioridade,
            status: chatTask.status,
          } : null,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao comunicar com agente')
      }

      const data = await response.json()
      return data.response
    } catch (error) {
      console.error('Erro ao enviar para agente:', error)
      return `Desculpe, tive um problema ao processar sua mensagem. Tente novamente.`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <Skeleton className="h-8 w-48" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-[500px] w-full" />
        </main>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-[400px]">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-bold mb-2">Projeto não encontrado</h2>
            <p className="text-muted-foreground mb-4">
              O projeto &quot;{slug}&quot; não existe.
            </p>
            <Link href="/">
              <Button>Voltar</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <IoArrowBackOutline className="h-4 w-4" />
                </Button>
              </Link>
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: project.cor }}
              />
              <div>
                <h1 className="text-xl font-bold">{project.nome}</h1>
                {project.github_repo && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <IoLogoGithub className="h-3 w-3" />
                    {project.github_repo}
                  </div>
                )}
              </div>
              <Badge variant="secondary" className="ml-2">
                {statusLabels[project.status]}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleNewTask}>
                <IoAdd className="h-4 w-4 mr-2" />
                Nova Task
              </Button>
              <Button variant="ghost" size="icon">
                <IoSettingsOutline className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="container mx-auto px-4 py-6">
        {tasksLoading ? (
          <div className="flex gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex-1 min-w-[280px]">
                <Skeleton className="h-8 w-24 mb-3" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ))}
          </div>
        ) : (
          <KanbanBoard
            tasksByStatus={tasksByStatus}
            agents={agents}
            githubRepo={project.github_repo}
            onMoveTask={moveTask}
            onAssignAgent={assignAgent}
            onDeleteTask={handleDeleteTask}
            onEditTask={handleEditTask}
            onNewTask={handleNewTask}
            onOpenChat={handleOpenChat}
            onCreateIssue={handleCreateIssue}
          />
        )}
      </main>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTask ? 'Editar Task' : 'Nova Task'}
            </DialogTitle>
            <DialogDescription>
              {editingTask 
                ? 'Atualize os dados da task.'
                : 'Crie uma nova task para o projeto.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                placeholder="Ex: Implementar login com Google"
                value={taskTitulo}
                onChange={e => setTaskTitulo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva a task..."
                value={taskDescricao}
                onChange={e => setTaskDescricao(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={taskPrioridade} onValueChange={setTaskPrioridade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">🟢 Baixa</SelectItem>
                    <SelectItem value="medium">🔵 Média</SelectItem>
                    <SelectItem value="high">🟠 Alta</SelectItem>
                    <SelectItem value="urgent">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Atribuir para</Label>
                <Select value={taskAgentId || '__none__'} onValueChange={(v) => setTaskAgentId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Ninguém</SelectItem>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.avatar_emoji} {agent.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTask} disabled={!taskTitulo.trim() || saving}>
              {saving ? 'Salvando...' : editingTask ? 'Salvar' : 'Criar Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat */}
      {chatTask && (
        <TaskChat
          task={chatTask}
          agent={chatTask.assigned_agent || null}
          open={chatOpen}
          onOpenChange={setChatOpen}
          onSendToAgent={handleSendToAgent}
        />
      )}
    </div>
  )
}
