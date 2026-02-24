'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { IoArrowBackOutline, IoSettingsOutline } from 'react-icons/io5'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase, Agent } from '@/lib/supabase'

const papelLabels: Record<string, string> = {
  po: 'Product Owner',
  sm: 'Scrum Master',
  ux: 'UX Designer',
  dev: 'Developer',
  qa: 'QA Engineer',
}

const papelColors: Record<string, string> = {
  po: 'bg-purple-500',
  sm: 'bg-blue-500',
  ux: 'bg-pink-500',
  dev: 'bg-green-500',
  qa: 'bg-orange-500',
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{agent.avatar_emoji}</span>
            <div>
              <CardTitle className="text-lg">{agent.nome}</CardTitle>
              <Badge className={`${papelColors[agent.papel]} text-white text-xs`}>
                {papelLabels[agent.papel]}
              </Badge>
            </div>
          </div>
          <Badge variant={agent.ativo ? 'default' : 'secondary'}>
            {agent.ativo ? '✅ Ativo' : '⏸️ Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-3">
          {agent.descricao || 'Sem descrição'}
        </CardDescription>
      </CardContent>
    </Card>
  )
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAgents() {
      try {
        const { data, error } = await supabase
          .from('dev_agents')
          .select('*')
          .order('papel')

        if (error) throw error
        setAgents(data || [])
      } catch (err) {
        console.error('Erro ao buscar agentes:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAgents()
  }, [])

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
              <span className="text-2xl">🤖</span>
              <h1 className="text-xl font-bold">Agentes</h1>
            </div>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <IoSettingsOutline className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Time de Agentes AI</h2>
          <p className="text-muted-foreground">
            Conheça os agentes que vão ajudar no desenvolvimento dos seus projetos
          </p>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map(agent => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
