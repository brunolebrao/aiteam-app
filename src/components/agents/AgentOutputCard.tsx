'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  IoCopyOutline, 
  IoDownloadOutline, 
  IoChevronDownOutline,
  IoChevronUpOutline,
  IoCheckmarkCircle
} from 'react-icons/io5'
import ReactMarkdown from 'react-markdown'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AgentOutputCardProps {
  agent: {
    slug: string
    nome: string
    papel: string
    avatar_emoji: string
  }
  output: string
  prompt: string
  model: string
  createdAt: string
  taskTitle: string
}

// Badge de modelo
function getModelBadge(model: string) {
  if (model.includes('opus')) {
    return { emoji: '🟣', label: 'Opus', color: 'text-purple-600' }
  }
  if (model.includes('haiku')) {
    return { emoji: '⚪', label: 'Haiku', color: 'text-slate-600' }
  }
  // Sonnet (padrão)
  return { emoji: '🔵', label: 'Sonnet', color: 'text-blue-600' }
}

// Gradiente sutil por agente
function getAgentGradient(slug: string) {
  const gradients: Record<string, string> = {
    anna: 'from-pink-50 to-rose-50',
    frank: 'from-blue-50 to-indigo-50',
    rask: 'from-purple-50 to-violet-50',
    bruce: 'from-green-50 to-emerald-50',
    ali: 'from-orange-50 to-amber-50',
  }
  return gradients[slug] || 'from-gray-50 to-slate-50'
}

export function AgentOutputCard({
  agent,
  output,
  prompt,
  model,
  createdAt,
  taskTitle,
}: AgentOutputCardProps) {
  const [promptOpen, setPromptOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const modelBadge = getModelBadge(model)
  const gradient = getAgentGradient(agent.slug)
  const time = format(new Date(createdAt), "dd/MM 'às' HH:mm", { locale: ptBR })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const filename = `${agent.slug}-${format(new Date(createdAt), 'yyyy-MM-dd-HHmmss')}.md`
    const blob = new Blob([output], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={`overflow-hidden border-2 bg-gradient-to-br ${gradient}`}>
      {/* Header */}
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{agent.avatar_emoji}</span>
            <div>
              <div className="font-semibold text-sm">
                {agent.nome} <span className="text-muted-foreground font-normal">({agent.papel})</span>
              </div>
              <div className="text-xs text-muted-foreground">{time}</div>
            </div>
          </div>
          <Badge variant="secondary" className={`${modelBadge.color} font-medium`}>
            {modelBadge.emoji} {modelBadge.label}
          </Badge>
        </div>

        {/* Título da task (contexto) */}
        <div className="text-xs text-muted-foreground border-l-2 border-muted pl-2">
          📋 {taskTitle}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-4">
        {/* Output renderizado */}
        <div className="bg-white rounded-lg p-4 border shadow-sm max-h-96 overflow-y-auto">
          <div className="prose prose-sm max-w-none prose-headings:font-semibold prose-p:text-sm prose-li:text-sm">
            <ReactMarkdown>{output}</ReactMarkdown>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1"
          >
            {copied ? (
              <>
                <IoCheckmarkCircle className="h-4 w-4 mr-1 text-green-600" />
                Copiado!
              </>
            ) : (
              <>
                <IoCopyOutline className="h-4 w-4 mr-1" />
                Copiar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-1"
          >
            <IoDownloadOutline className="h-4 w-4 mr-1" />
            Download .md
          </Button>
        </div>

        {/* Prompt (collapsible) */}
        <Collapsible open={promptOpen} onOpenChange={setPromptOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs text-muted-foreground hover:text-foreground"
            >
              <span>💬 Prompt usado</span>
              {promptOpen ? (
                <IoChevronUpOutline className="h-4 w-4" />
              ) : (
                <IoChevronDownOutline className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="bg-muted rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {prompt}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  )
}
