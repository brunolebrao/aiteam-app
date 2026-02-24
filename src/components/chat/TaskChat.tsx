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
import { Send, Bot, User, Loader2 } from 'lucide-react'
import { useTaskComments, CommentWithAgent } from '@/hooks/useTaskComments'
import { Task, Agent } from '@/lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface TaskChatProps {
  task: Task
  agent: Agent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSendToAgent?: (message: string, agent: Agent) => Promise<string>
}

function MessageBubble({ comment, isUser }: { comment: CommentWithAgent; isUser: boolean }) {
  const time = format(new Date(comment.created_at), 'HH:mm', { locale: ptBR })

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
      }`}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : comment.agent ? (
          <span>{comment.agent.avatar_emoji}</span>
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">
            {isUser ? 'Você' : comment.agent?.nome || 'Sistema'}
          </span>
          {comment.agent && (
            <Badge variant="outline" className="text-xs">
              {comment.agent.papel.toUpperCase()}
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

export function TaskChat({ task, agent, open, onOpenChange, onSendToAgent }: TaskChatProps) {
  const { comments, loading, addUserMessage, addAgentMessage } = useTaskComments(task.id)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [comments])

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
        const response = await onSendToAgent(userMessage, agent)
        await addAgentMessage(response, agent.id)
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
              <Bot className="h-12 w-12 mb-4" />
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
                    {agent?.avatar_emoji || <Bot className="h-4 w-4" />}
                  </div>
                  <Card className="p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
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
        <div className="border-t pt-4">
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
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
