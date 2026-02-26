'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { IoAdd, IoFolderOpenOutline, IoSettingsOutline, IoPeopleOutline, IoAlertCircleOutline, IoTimeOutline } from 'react-icons/io5'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import Link from 'next/link'
import { useState } from 'react'
import { useProjects, ProjectWithCounts } from '@/hooks/useProjects'

const statusColors: Record<string, string> = {
  planning: 'bg-slate-500',
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  done: 'bg-blue-500',
  archived: 'bg-gray-400',
}

const statusLabels: Record<string, string> = {
  planning: '📝 Planejando',
  active: '🚀 Ativo',
  paused: '⏸️ Pausado',
  done: '✅ Concluído',
  archived: '📦 Arquivado',
}

function ProjectCard({ project, onToggleAutoIdeas }: { 
  project: ProjectWithCounts
  onToggleAutoIdeas: (projectId: string, enabled: boolean) => Promise<void>
}) {
  const [isTogglingAutoIdeas, setIsTogglingAutoIdeas] = useState(false)
  const counts = project.tasks_count
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const done = counts.done
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const handleAutoIdeasToggle = async (e: React.MouseEvent, enabled: boolean) => {
    e.preventDefault() // Evita navegação
    e.stopPropagation()
    
    setIsTogglingAutoIdeas(true)
    try {
      await onToggleAutoIdeas(project.id, enabled)
    } catch (err) {
      console.error('Erro ao alternar auto-ideas:', err)
    } finally {
      setIsTogglingAutoIdeas(false)
    }
  }

  return (
    <Link href={`/projects/${project.slug}`}>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: project.cor }}
              />
              <CardTitle className="text-lg group-hover:text-primary transition-colors">
                {project.nome}
              </CardTitle>
            </div>
            <Badge 
              variant="secondary" 
              className="text-xs"
            >
              {statusLabels[project.status]}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {project.descricao || 'Sem descrição'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {project.github_repo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IoFolderOpenOutline className="h-4 w-4" />
                <span className="truncate">{project.github_repo}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground">{counts.backlog} backlog</span>
                <span className="text-blue-500">{counts.doing} doing</span>
                <span className="text-green-500">{counts.done} done</span>
              </div>
              <span className="font-medium">{progress}%</span>
            </div>
            
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Toggle Ideias Automáticas */}
            <div 
              className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              onClick={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-2">
                <IoTimeOutline className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Ideias Automáticas</p>
                  <p className="text-xs text-muted-foreground">07:00 e 22:00</p>
                </div>
              </div>
              <Switch
                checked={project.auto_ideas}
                onCheckedChange={(checked) => handleAutoIdeasToggle(event as any, checked)}
                disabled={isTogglingAutoIdeas}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function NewProjectDialog({ onCreate }: { onCreate: (data: { nome: string; descricao?: string; github_repo?: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!nome.trim()) return
    
    try {
      setSaving(true)
      await onCreate({ nome, descricao, github_repo: githubRepo })
      setOpen(false)
      setNome('')
      setDescricao('')
      setGithubRepo('')
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IoAdd className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
          <DialogDescription>
            Crie um novo projeto para gerenciar com o time de agentes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              placeholder="Ex: LerCom"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              placeholder="Descreva o projeto..."
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github">Repositório GitHub (opcional)</Label>
            <Input
              id="github"
              placeholder="usuario/repo"
              value={githubRepo}
              onChange={e => setGithubRepo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!nome.trim() || saving}>
            {saving ? 'Criando...' : 'Criar Projeto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function HomePage() {
  const { projects, loading, error, createProject, refresh } = useProjects()
  const { showToast } = useToast()

  const handleToggleAutoIdeas = async (projectId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/auto-ideas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao atualizar configuração')
      }

      const result = await response.json()
      showToast(result.message, 'success')
      
      // Refresh projects
      await refresh()
    } catch (err) {
      console.error('Erro ao alternar auto-ideas:', err)
      showToast(
        err instanceof Error ? err.message : 'Erro ao atualizar configuração',
        'error'
      )
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏢</span>
              <h1 className="text-xl font-bold">Dev Team</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/agents">
                <Button variant="ghost" size="sm">
                  <IoPeopleOutline className="h-4 w-4 mr-2" />
                  Agentes
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <IoSettingsOutline className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Projetos</h2>
            <p className="text-muted-foreground">
              Gerencie seus projetos com o time de agentes AI
            </p>
          </div>
          <NewProjectDialog onCreate={createProject} />
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="flex items-center gap-3 py-4">
              <IoAlertCircleOutline className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Erro ao carregar projetos</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <IoFolderOpenOutline className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum projeto ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro projeto para começar a trabalhar com o time.
              </p>
              <NewProjectDialog onCreate={createProject} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onToggleAutoIdeas={handleToggleAutoIdeas}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
