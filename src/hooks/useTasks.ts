'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Task, Agent } from '@/lib/supabase'

export type TaskWithAgent = Task & {
  assigned_agent?: Agent | null
  latest_output?: TaskComment | null
}

export type TasksByStatus = {
  ideias: TaskWithAgent[]
  backlog: TaskWithAgent[]
  anna: TaskWithAgent[]
  frank: TaskWithAgent[]
  rask: TaskWithAgent[]
  bruce: TaskWithAgent[]
  ali: TaskWithAgent[]
  done: TaskWithAgent[]
}

export function useTasks(projectId: string) {
  const [tasks, setTasks] = useState<TaskWithAgent[]>([])
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>({
    ideias: [],
    backlog: [],
    anna: [],
    frank: [],
    rask: [],
    bruce: [],
    ali: [],
    done: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const organizeTasks = (taskList: TaskWithAgent[]) => {
    const organized: TasksByStatus = {
      ideias: [],
      backlog: [],
      anna: [],
      frank: [],
      rask: [],
      bruce: [],
      ali: [],
      done: [],
    }

    taskList.forEach(task => {
      if (task.status in organized) {
        organized[task.status as keyof TasksByStatus].push(task)
      }
    })

    // Ordenar por ordem dentro de cada coluna
    Object.keys(organized).forEach(key => {
      organized[key as keyof TasksByStatus].sort((a, b) => a.ordem - b.ordem)
    })

    setTasksByStatus(organized)
  }

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('dev_tasks')
        .select(`
          *,
          assigned_agent:dev_agents(*)
        `)
        .eq('project_id', projectId)
        .order('ordem', { ascending: true })

      if (fetchError) throw fetchError

      const taskList = data || []

      // Buscar último output por task (agent_output)
      const taskIds = taskList.map(t => t.id)
      let outputsByTask = new Map<string, TaskComment>()
      if (taskIds.length > 0) {
        const { data: outputs } = await supabase
          .from('dev_task_comments')
          .select(`*, agent:dev_agents(*)`)
          .in('task_id', taskIds)
          .eq('tipo', 'agent_output')
          .order('created_at', { ascending: false })

        if (outputs) {
          for (const out of outputs) {
            if (!outputsByTask.has(out.task_id)) {
              outputsByTask.set(out.task_id, out)
            }
          }
        }
      }

      const withOutput = taskList.map(t => ({
        ...t,
        latest_output: outputsByTask.get(t.id) || null,
      }))

      setTasks(withOutput)
      organizeTasks(withOutput)

    } catch (err) {
      console.error('Erro ao buscar tasks:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const createTask = async (data: {
    titulo: string
    descricao?: string
    prioridade?: string
    assigned_agent_id?: string
    tags?: string[]
    force_opus?: boolean
  }) => {
    try {
      const maxOrdem = Math.max(0, ...tasks.filter(t => t.status === 'ideias').map(t => t.ordem))

      const { data: newTask, error } = await supabase
        .from('dev_tasks')
        .insert({
          project_id: projectId,
          titulo: data.titulo,
          descricao: data.descricao || null,
          prioridade: data.prioridade || 'medium',
          assigned_agent_id: data.assigned_agent_id || null,
          tags: data.tags || [],
          force_opus: data.force_opus || false,
          status: 'ideias',
          ordem: maxOrdem + 1,
        })
        .select(`*, assigned_agent:dev_agents(*)`)
        .single()

      if (error) throw error

      await fetchTasks()
      return newTask
    } catch (err) {
      console.error('Erro ao criar task:', err)
      throw err
    }
  }

  const updateTask = async (id: string, data: Partial<Task>) => {
    try {
      const { error } = await supabase
        .from('dev_tasks')
        .update(data)
        .eq('id', id)

      if (error) throw error

      await fetchTasks()
    } catch (err) {
      console.error('Erro ao atualizar task:', err)
      throw err
    }
  }

  const moveTask = async (taskId: string, newStatus: Task['status'], newOrder: number) => {
    try {
      // Atualiza localmente primeiro (otimistic update)
      const updatedTasks = tasks.map(t => 
        t.id === taskId ? { ...t, status: newStatus, ordem: newOrder } : t
      )
      setTasks(updatedTasks)
      organizeTasks(updatedTasks)

      // Atualiza no banco
      const { error } = await supabase
        .from('dev_tasks')
        .update({ status: newStatus, ordem: newOrder })
        .eq('id', taskId)

      if (error) throw error

    } catch (err) {
      console.error('Erro ao mover task:', err)
      // Reverte em caso de erro
      await fetchTasks()
      throw err
    }
  }

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dev_tasks')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchTasks()
    } catch (err) {
      console.error('Erro ao deletar task:', err)
      throw err
    }
  }

  const assignAgent = async (taskId: string, agentId: string | null) => {
    await updateTask(taskId, { assigned_agent_id: agentId })
  }

  useEffect(() => {
    if (projectId) {
      fetchTasks()
    }
  }, [projectId, fetchTasks])

  // Realtime subscription
  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dev_tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchTasks()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, fetchTasks])

  return {
    tasks,
    tasksByStatus,
    loading,
    error,
    refresh: fetchTasks,
    createTask,
    updateTask,
    moveTask,
    deleteTask,
    assignAgent,
  }
}
