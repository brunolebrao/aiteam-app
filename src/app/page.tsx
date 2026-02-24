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
import { Plus, FolderGit2, Settings, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'

// Mock data - será substituído por Supabase
const mockProjects = [
  {
    id: '1',
    slug: 'lercom',
    nome: 'LerCom',
    descricao: 'Plataforma de leitura em grupo',
    github_repo: 'brunolebrao/lercom-app',
    status: 'active',
    cor: '#22c55e',
    tasks_count: { backlog: 3, doing: 2, review: 1, done: 5 },
  },
]

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

function ProjectCard({ project }: { project: typeof mockProjects[0] }) {
  const total = Object.values(project.tasks_count).reduce((a, b) => a + b, 0)
  const done = project.tasks_count.done
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

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
            {project.descricao}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {project.github_repo && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FolderGit2 className="h-4 w-4" />
                <span>{project.github_repo}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-2">
                <span className="text-muted-foreground">{project.tasks_count.backlog} backlog</span>
                <span className="text-blue-500">{project.tasks_count.doing} doing</span>
                <span className="text-green-500">{project.tasks_count.done} done</span>
              </div>
              <span className="font-medium">{progress}%</span>
            </div>
            
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function NewProjectDialog() {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [githubRepo, setGithubRepo] = useState('')

  const handleSubmit = () => {
    // TODO: Criar projeto no Supabase
    console.log({ nome, descricao, githubRepo })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
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
          <Button onClick={handleSubmit} disabled={!nome.trim()}>
            Criar Projeto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function HomePage() {
  const [projects, setProjects] = useState(mockProjects)
  const [loading, setLoading] = useState(false)

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
                  <Users className="h-4 w-4 mr-2" />
                  Agentes
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
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
          <NewProjectDialog />
        </div>

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
              <FolderGit2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum projeto ainda</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro projeto para começar a trabalhar com o time.
              </p>
              <NewProjectDialog />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
