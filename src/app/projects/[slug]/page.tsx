'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Plus,
  FileText,
  Palette,
  Code,
  TestTube,
  MoreHorizontal,
  Trash2,
  GripVertical,
  Settings,
  Github,
  FileCode,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { use } from 'react'

// Tipos
type TaskType = 'spec' | 'ux' | 'dev' | 'test' | 'review' | 'deploy' | 'bug' | 'other'
type TaskStatus = 'backlog' | 'todo' | 'doing' | 'review' | 'done' | 'blocked'

type Task = {
  id: string
  titulo: string
  descricao: string | null
  tipo: TaskType
  status: TaskStatus
  agente: { slug: string; nome: string; emoji: string } | null
  ordem: number
}

type Agent = {
  slug: string
  nome: string
  emoji: string
  role: string
  cor: string
}

// Constantes
const TASK_TYPES: Record<TaskType, { label: string; icon: typeof FileText; color: string }> = {
  spec: { label: 'Spec', icon: FileText, color: 'bg-blue-500' },
  ux: { label: 'UX', icon: Palette, color: 'bg-purple-500' },
  dev: { label: 'Dev', icon: Code, color: 'bg-green-500' },
  test: { label: 'Test', icon: TestTube, color: 'bg-orange-500' },
  review: { label: 'Review', icon: FileCode, color: 'bg-yellow-500' },
  deploy: { label: 'Deploy', icon: Code, color: 'bg-cyan-500' },
  bug: { label: 'Bug', icon: FileText, color: 'bg-red-500' },
  other: { label: 'Outro', icon: FileText, color: 'bg-gray-500' },
}

const STATUS_COLUMNS: Array<{ id: TaskStatus; label: string; color: string }> = [
  { id: 'backlog', label: '📋 Backlog', color: 'border-slate-400' },
  { id: 'todo', label: '📝 To Do', color: 'border-blue-400' },
  { id: 'doing', label: '🔨 Doing', color: 'border-yellow-400' },
  { id: 'review', label: '👀 Review', color: 'border-purple-400' },
  { id: 'done', label: '✅ Done', color: 'border-green-400' },
]

// Mock data
const mockProject = {
  id: '1',
  slug: 'lercom',
  nome: 'LerCom',
  descricao: 'Plataforma de leitura em grupo',
  github_repo: 'brunolebrao/lercom-app',
  github_branch: 'dev',
  status: 'active',
  cor: '#22c55e',
}

const mockTasks: Task[] = [
  { id: '1', titulo: 'Modal de sincronização', descricao: 'Implementar modal de sync livro/grupo', tipo: 'dev', status: 'doing', agente: { slug: 'bruce', nome: 'Bruce', emoji: '💻' }, ordem: 0 },
  { id: '2', titulo: 'Spec do ranking', descricao: null, tipo: 'spec', status: 'backlog', agente: { slug: 'anna', nome: 'Anna', emoji: '📋' }, ordem: 0 },
  { id: '3', titulo: 'Testar WhatsApp', descricao: 'Testar fluxo completo do chatbot', tipo: 'test', status: 'review', agente: { slug: 'ali', nome: 'Ali', emoji: '🧪' }, ordem: 0 },
  { id: '4', titulo: 'Fix progresso coletivo', descricao: null, tipo: 'bug', status: 'done', agente: null, ordem: 0 },
]

const mockAgents: Agent[] = [
  { slug: 'anna', nome: 'Anna', emoji: '📋', role: 'PO', cor: '#ec4899' },
  { slug: 'frank', nome: 'Frank', emoji: '📊', role: 'SM', cor: '#f59e0b' },
  { slug: 'rask', nome: 'Rask', emoji: '🎨', role: 'UX', cor: '#8b5cf6' },
  { slug: 'bruce', nome: 'Bruce', emoji: '💻', role: 'Dev', cor: '#22c55e' },
  { slug: 'ali', nome: 'Ali', emoji: '🧪', role: 'QA', cor: '#f97316' },
]

// Componentes
function TaskCard({ task, onMove, onDelete }: { 
  task: Task
  onMove: (taskId: string, status: TaskStatus) => void
  onDelete: (taskId: string) => void
}) {
  const typeInfo = TASK_TYPES[task.tipo]
  const TypeIcon = typeInfo.icon

  return (
    <Card className="mb-2 cursor-move hover:shadow-md transition-shadow group">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn('p-1 rounded', typeInfo.color)}>
                <TypeIcon className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-medium truncate">{task.titulo}</span>
            </div>
            {task.descricao && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {task.descricao}
              </p>
            )}
            {task.agente && (
              <Badge variant="outline" className="text-xs">
                {task.agente.emoji} {task.agente.nome}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_COLUMNS.filter(s => s.id !== task.status).map(status => (
                <DropdownMenuItem key={status.id} onClick={() => onMove(task.id, status.id)}>
                  Mover para {status.label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(task.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

function KanbanColumn({ 
  status, 
  tasks, 
  onMoveTask,
  onDeleteTask,
}: { 
  status: typeof STATUS_COLUMNS[number]
  tasks: Task[]
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onDeleteTask: (taskId: string) => void
}) {
  return (
    <div className={cn('flex-1 min-w-[260px] max-w-[300px]')}>
      <div className={cn('border-t-4 rounded-t-lg p-3 bg-muted/30', status.color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{status.label}</h3>
          <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
        </div>
      </div>
      <div className="p-2 min-h-[400px] bg-muted/10 rounded-b-lg border border-t-0">
        {tasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onMove={onMoveTask}
            onDelete={onDeleteTask}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-8">
            Nenhuma task
          </div>
        )}
      </div>
    </div>
  )
}

function NewTaskDialog({ onCreateTask }: { 
  onCreateTask: (data: { titulo: string; descricao: string; tipo: TaskType; agente: string | null }) => void 
}) {
  const [open, setOpen] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [tipo, setTipo] = useState<TaskType>('other')
  const [agente, setAgente] = useState('')

  const handleSubmit = () => {
    onCreateTask({ titulo, descricao, tipo, agente: agente || null })
    setOpen(false)
    setTitulo('')
    setDescricao('')
    setTipo('other')
    setAgente('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              placeholder="Ex: Implementar modal de sync"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              placeholder="Detalhes da task..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TaskType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <info.icon className="h-4 w-4" />
                        {info.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agente</Label>
              <Select value={agente} onValueChange={setAgente}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {mockAgents.map(agent => (
                    <SelectItem key={agent.slug} value={agent.slug}>
                      {agent.emoji} {agent.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!titulo.trim()}>Criar Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [tasks, setTasks] = useState(mockTasks)
  const project = mockProject // TODO: Fetch from Supabase

  const tasksByStatus = STATUS_COLUMNS.reduce((acc, status) => {
    acc[status.id] = tasks.filter(t => t.status === status.id)
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  const handleMoveTask = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, status: newStatus } : t
    ))
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleCreateTask = (data: { titulo: string; descricao: string; tipo: TaskType; agente: string | null }) => {
    const agent = data.agente ? mockAgents.find(a => a.slug === data.agente) : null
    const newTask: Task = {
      id: Date.now().toString(),
      titulo: data.titulo,
      descricao: data.descricao || null,
      tipo: data.tipo,
      status: 'backlog',
      agente: agent ? { slug: agent.slug, nome: agent.nome, emoji: agent.emoji } : null,
      ordem: 0,
    }
    setTasks(prev => [...prev, newTask])
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: project.cor }}
                />
                <h1 className="text-lg font-bold">{project.nome}</h1>
              </div>
              {project.github_repo && (
                <a 
                  href={`https://github.com/${project.github_repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                  <span className="hidden sm:inline">{project.github_repo}</span>
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NewTaskDialog onCreateTask={handleCreateTask} />
              <Link href={`/projects/${slug}/settings`}>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mx-auto px-4">
        <Tabs defaultValue="kanban" className="mt-4">
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="context">Contexto</TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="mt-4">
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STATUS_COLUMNS.map(status => (
                <KanbanColumn
                  key={status.id}
                  status={status}
                  tasks={tasksByStatus[status.id] || []}
                  onMoveTask={handleMoveTask}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="context" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Contexto do Projeto</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  className="min-h-[400px] font-mono text-sm"
                  placeholder="# Stack&#10;- Next.js 14&#10;- Supabase&#10;&#10;# Padrões&#10;- ..."
                  defaultValue={`# LerCom

## Stack
- Next.js 14 (App Router)
- Supabase (self-hosted)
- TypeScript, Tailwind, shadcn/ui

## Arquivos-chave
- src/hooks/ — hooks principais
- src/components/ — componentes reutilizáveis
- supabase/migrations/ — schema do banco

## Padrões
- Nomes de variáveis sem acento
- UI text em português
- Usar Drawer para mobile

## GitHub
- Repo: brunolebrao/lercom-app
- Branch: dev → main`}
                />
                <Button className="mt-4">Salvar Contexto</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
