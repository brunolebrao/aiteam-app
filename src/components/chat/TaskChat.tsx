'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { IoSendOutline, IoChatbubbleEllipsesOutline, IoPersonOutline, IoCheckmarkCircle } from 'react-icons/io5'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { useTaskComments, CommentWithAgent } from '@/hooks/useTaskComments'
import { Task, Agent } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TaskChatProps {
  task: Task
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSendToAgent?: (message: string, agent: Agent) => Promise<{ response: string; model?: string }>
  onApprove?: () => Promise<void>
}

function getModelBadge(model?: string): { emoji: string; label: string; color: string } | null {
  if (!model) return null
  
  const normalized = model.toLowerCase()
  
  if (normalized.includes('opus')) {
    return { emoji: '🟣', label: 'Opus', color: 'bg-purple-100 text-purple-700' }
  }
  if (normalized.includes('sonnet')) {
    return { emoji: '🔵', label: 'Sonnet', color: 'bg-blue-100 text-blue-700' }
  }
  if (normalized.includes('haiku')) {
    return { emoji: '⚪', label: 'Haiku', color: 'bg-slate-100 text-slate-700' }
  }
  
  return null
}

function MessageBubble({ comment, isUser }: { comment: CommentWithAgent; isUser: boolean }) {
  const time = format(new Date(comment.created_at), 'HH:mm', { locale: ptBR })
  
  // Extrai modelo do metadata se disponível
  const modelInfo = !isUser && comment.metadata?.model && typeof comment.metadata.model === 'string'
    ? getModelBadge(comment.metadata.model)
    : null

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        {isUser ? (
          <IoPersonOutline className="h-4 w-4" />
        ) : comment.agent ? (
          <span>{comment.agent.avatar_emoji}</span>
        ) : (
          <IoChatbubbleEllipsesOutline className="h-4 w-4" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-medium">
            {isUser ? 'Você' : comment.agent?.nome || 'Sistema'}
          </span>
          {comment.agent && (
            <Badge variant="outline" className="text-xs">
              {comment.agent.papel.toUpperCase()}
            </Badge>
          )}
          {modelInfo && (
            <Badge variant="secondary" className={`text-xs ${modelInfo.color}`}>
              {modelInfo.emoji} {modelInfo.label}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <Card className={`p-3 ${
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : comment.tipo === 'system' 
              ? 'bg-muted/50 border-dashed'
              : 'bg-card'
        }`}>
          <p className="text-sm whitespace-pre-wrap">{comment.conteudo}</p>
        </Card>
      </div>
    </div>
  )
}

export function TaskChat({ task, agent, open, onOpenChange, onSendToAgent, onApprove }: TaskChatProps) {
  const { comments, loading, addUserMessage, addAgentMessage } = useTaskComments(task.id)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [approving, setApproving] = useState(false)
  const [hasExecutedFirstTurn, setHasExecutedFirstTurn] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Verifica se tem mensagens do agente (pode aprovar)
  const hasAgentMessages = comments.some(c => c.agent_id && c.tipo !== 'system')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [comments])

  // Primeiro turno automático quando chat abre
  useEffect(() => {
    const executeFirstTurn = async () => {
      // Só executa se:
      // - Chat está aberto
      // - Tem agente atribuído
      // - Não tem mensagens ainda
      // - Tem callback de envio
      // - Ainda não executou primeiro turno
      if (open && agent && comments.length === 0 && onSendToAgent && !hasExecutedFirstTurn && !loading) {
        setHasExecutedFirstTurn(true)
        setSending(true)

        try {
          // Mensagem inicial automática
          const firstMessage = `Olá ${agent.nome}! Esta task foi atribuída para você. Analise e me diga como podemos proceder.`
          
          // Adiciona mensagem do usuário
          await addUserMessage(firstMessage)
          
          // Obtém resposta do agente
          const result = await onSendToAgent(firstMessage, agent)
          await addAgentMessage(result.response, agent.id, {
            model: result.model,
          })
        } catch (err) {
          console.error('Erro no primeiro turno automático:', err)
        } finally {
          setSending(false)
        }
      }
    }

    executeFirstTurn()
  }, [open, agent, comments.length, onSendToAgent, hasExecutedFirstTurn, loading, addUserMessage, addAgentMessage])

  // Reset quando fecha o chat
  useEffect(() => {
    if (!open) {
      setHasExecutedFirstTurn(false)
    }
  }, [open])

  const handleSend = async () => {
    if (!message.trim() || sending) return

    const userMessage = message.trim()
    setMessage('')
    setSending(true)

    try {
      // Adicionar mensagem do usuário
      await addUserMessage(userMessage)

      // Se tem agente atribuído e callback de envio, obter resposta
      if (agent && onSendToAgent) {
        const result = await onSendToAgent(userMessage, agent)
        await addAgentMessage(result.response, agent.id, {
          model: result.model,
        })
      }
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleApprove = async () => {
    if (!onApprove) return
    
    setApproving(true)
    try {
      await onApprove()
      // Fecha o chat após aprovar
      onOpenChange(false)
    } catch (err) {
      console.error('Erro ao aprovar:', err)
    } finally {
      setApproving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            💬 Chat
            {agent && (
              <Badge variant="secondary">
                {agent.avatar_emoji} {agent.nome}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            {task.titulo}
          </SheetDescription>
        </SheetHeader>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-16 w-64" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
              <IoChatbubbleEllipsesOutline className="h-12 w-12 mb-4" />
              <p>Nenhuma mensagem ainda.</p>
              {agent && (
                <p className="text-sm mt-2">
                  Converse com {agent.nome} ({agent.papel.toUpperCase()})
                </p>
              )}
            </div>
          ) : (
            <>
              {comments.map(comment => (
                <MessageBubble
                  key={comment.id}
                  comment={comment}
                  isUser={!comment.agent_id}
                />
              ))}
              {sending && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {agent?.avatar_emoji || <IoChatbubbleEllipsesOutline className="h-4 w-4" />}
                  </div>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        {agent?.nome || 'Agente'} está pensando...
                      </span>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t pt-4 space-y-3">
          {/* Botão de Aprovar */}
          {hasAgentMessages && onApprove && (
            <Button
              onClick={handleApprove}
              disabled={approving}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              {approving ? (
                <>
                  <AiOutlineLoading3Quarters className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  ✅ Aprovar e Continuar
                </>
              )}
            </Button>
          )}

          <div className="flex gap-2">
            <Textarea
              placeholder={agent 
                ? `Mensagem para ${agent.nome}...` 
                : 'Digite uma mensagem...'
              }
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              className="resize-none"
              disabled={sending}
            />
            <Button 
              onClick={handleSend} 
              disabled={!message.trim() || sending}
              className="self-end"
            >
              {sending ? (
                <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
              ) : (
                <IoSendOutline className="h-4 w-4" />
              )}
            </Button>
          </div>
          {!agent && (
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Atribua um agente à task para obter respostas automáticas.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
