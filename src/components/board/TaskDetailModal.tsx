'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { TaskWithAgent } from '@/hooks/useTasks'
import { TaskComment, supabase } from '@/lib/supabase'
import { IoTimeOutline, IoPersonOutline, IoLogoGithub, IoOpenOutline, IoCopyOutline, IoDownloadOutline } from 'react-icons/io5'
import { toast } from 'sonner'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface TaskDetailModalProps {
  task: TaskWithAgent | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

const AGENT_GRADIENT: Record<string, string> = {
  anna: 'from-indigo-500/20 to-indigo-500/5',
  frank: 'from-blue-500/20 to-blue-500/5',
  rask: 'from-pink-500/20 to-pink-500/5',
  bruce: 'from-purple-500/20 to-purple-500/5',
  ali: 'from-orange-500/20 to-orange-500/5',
}

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    if (task && open) {
      fetchComments()
    }
  }, [task, open])

  const fetchComments = async () => {
    if (!task) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('dev_task_comments')
        .select(`
          *,
          agent:dev_agents(*)
        `)
        .eq('task_id', task.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Erro ao buscar comentários:', err)
    } finally {
      setLoading(false)
    }
  }

  const latestOutput = useMemo(() => {
    const outputs = comments.filter(c => c.tipo === 'agent_output')
    return outputs.length > 0 ? outputs[outputs.length - 1] : null
  }, [comments])

  if (!task) return null

  const progressLog = task.progress_log || []
  const gradient = task.assigned_agent?.slug ? AGENT_GRADIENT[task.assigned_agent.slug] : 'from-slate-200 to-slate-50'

  const handleCopy = async () => {
    if (!latestOutput?.conteudo) return
    await navigator.clipboard.writeText(latestOutput.conteudo)
    toast.success('Copiado!')
  }

  const handleDownload = () => {
    if (!latestOutput?.conteudo) return
    const blob = new Blob([latestOutput.conteudo], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${task.titulo.replace(/\s+/g, '-').toLowerCase()}.md`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Download iniciado')
  }

  const outputPreview = latestOutput?.conteudo
    ? (expanded ? latestOutput.conteudo : latestOutput.conteudo.slice(0, 1200))
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-3">
                {task.numero && <span className="text-muted-foreground mr-2">#{task.numero}</span>}
                {task.titulo}
              </DialogTitle>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className={`text-xs ${PRIORITY_COLORS[task.prioridade]}`}>
                  {PRIORITY_LABELS[task.prioridade]}
                </Badge>

                {task.force_opus && (
                  <Badge variant="default" className="text-xs bg-purple-500">
                    🟣 Opus
                  </Badge>
                )}

                {task.execution_status === 'pending' && (
                  <Badge variant="outline" className="text-xs border-slate-400 text-slate-600">
                    ⏳ Aguardando
                  </Badge>
                )}

                {task.execution_status === 'running' && (
                  <Badge variant="default" className="text-xs bg-blue-500 animate-pulse">
                    🔄 Executando
                  </Badge>
                )}

                {task.execution_status === 'completed' && (
                  <Badge variant="default" className="text-xs bg-green-500">
                    ✅ Concluído
                  </Badge>
                )}

                {task.tags?.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Info da Task */}
          <div>
            {task.descricao && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Descrição</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {task.descricao}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-xs text-muted-foreground">Agente Atribuído</p>
                <div className="flex items-center gap-2 mt-1">
                  {task.assigned_agent ? (
                    <>
                      <span>{task.assigned_agent.avatar_emoji}</span>
                      <span className="text-sm font-medium">{task.assigned_agent.nome}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Nenhum</span>
                  )}
                </div>
              </div>

              {task.due_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <div className="flex items-center gap-1 mt-1">
                    <IoTimeOutline className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(task.due_date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pull Request */}
          {task.pr_url && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-2">Pull Request</h3>
                <a
                  href={task.pr_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <IoLogoGithub className="h-4 w-4" />
                  {task.pr_url}
                  <IoOpenOutline className="h-3 w-3" />
                </a>
                {task.pr_status && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {task.pr_status}
                  </Badge>
                )}
              </div>
            </>
          )}

          {/* Output Gerado */}
          {latestOutput && (
            <>
              <Separator />
              <div className="rounded-xl border bg-gradient-to-br p-4 md:p-5" style={{}}>
                <div className={`rounded-lg border bg-gradient-to-br ${gradient} p-3 mb-4`}>
                  <div className="flex items-center gap-2 text-sm">
                    <span>{latestOutput.agent?.avatar_emoji || '🤖'}</span>
                    <span className="font-medium">{latestOutput.agent?.nome || 'Agente'}</span>
                    <Badge variant="outline" className="text-xs">{latestOutput.metadata?.model || 'modelo'}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(latestOutput.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">📄 Output Gerado</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopy} className="h-7 px-2">
                      <IoCopyOutline className="h-3.5 w-3.5 mr-1" /> Copiar
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownload} className="h-7 px-2">
                      <IoDownloadOutline className="h-3.5 w-3.5 mr-1" /> Download .md
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setExpanded(v => !v)} className="h-7 px-2">
                      {expanded ? 'Recolher' : 'Expandir'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden border">
                  <SyntaxHighlighter language="markdown" style={oneDark} customStyle={{ margin: 0, padding: '16px', fontSize: 12 }}>
                    {outputPreview}
                  </SyntaxHighlighter>
                </div>

                {latestOutput.metadata?.prompt && (
                  <div className="mt-4">
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPrompt(v => !v)}
                    >
                      💬 Prompt Usado {showPrompt ? '▲' : '▼'}
                    </button>
                    {showPrompt && (
                      <div className="mt-2 rounded-lg border bg-slate-50 p-3 text-xs whitespace-pre-wrap">
                        {latestOutput.metadata?.prompt}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Progress Log */}
          {progressLog.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold mb-3">Timeline de Execução</h3>
                <div className="space-y-3">
                  {progressLog.map((entry, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        {idx < progressLog.length - 1 && (
                          <div className="w-px h-full bg-slate-200 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-2">
                        <p className="text-sm font-medium">{entry.action}</p>
                        {entry.details && (
                          <p className="text-xs text-muted-foreground">{entry.details}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(entry.timestamp).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Comentários */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold mb-3">
              Comentários {loading && '(carregando...)'}
            </h3>

            {comments.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">Nenhum comentário ainda</p>
            )}

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {comment.agent && (
                      <>
                        <span>{comment.agent.avatar_emoji}</span>
                        <span className="text-sm font-medium">{comment.agent.nome}</span>
                      </>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {comment.tipo}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(comment.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.conteudo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
