'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, TaskComment, Agent } from '@/lib/supabase'

export type CommentWithAgent = TaskComment & {
  agent?: Agent | null
}

export function useTaskComments(taskId: string) {
  const [comments, setComments] = useState<CommentWithAgent[]>([])
  const [loading, setLoading] = useState(true)

  const fetchComments = useCallback(async () => {
    if (!taskId) return

    try {
      const { data, error } = await supabase
        .from('dev_task_comments')
        .select(`
          *,
          agent:dev_agents(*)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Erro ao buscar comentários:', err)
    } finally {
      setLoading(false)
    }
  }, [taskId])

  const addComment = async (content: string, agentId?: string, tipo: string = 'comment') => {
    try {
      const { data, error } = await supabase
        .from('dev_task_comments')
        .insert({
          task_id: taskId,
          agent_id: agentId || null,
          tipo,
          conteudo: content,
        })
        .select(`*, agent:dev_agents(*)`)
        .single()

      if (error) throw error

      setComments(prev => [...prev, data])
      return data
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err)
      throw err
    }
  }

  const addUserMessage = async (content: string) => {
    return addComment(content, undefined, 'comment')
  }

  const addAgentMessage = async (content: string, agentId: string) => {
    return addComment(content, agentId, 'comment')
  }

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Realtime subscription
  useEffect(() => {
    if (!taskId) return

    const channel = supabase
      .channel(`comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dev_task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          // Buscar comentário com agente
          const { data } = await supabase
            .from('dev_task_comments')
            .select(`*, agent:dev_agents(*)`)
            .eq('id', payload.new.id)
            .single()

          if (data) {
            setComments(prev => {
              // Evitar duplicatas
              if (prev.some(c => c.id === data.id)) return prev
              return [...prev, data]
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [taskId])

  return {
    comments,
    loading,
    refresh: fetchComments,
    addComment,
    addUserMessage,
    addAgentMessage,
  }
}
