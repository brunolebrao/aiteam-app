'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, Project, TaskCounts } from '@/lib/supabase'

export type ProjectWithCounts = Project & {
  tasks_count: TaskCounts
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Buscar projetos
      const { data: projectsData, error: projectsError } = await supabase
        .from('dev_projects')
        .select('*')
        .order('updated_at', { ascending: false })

      if (projectsError) throw projectsError

      // Buscar contagem de tasks por projeto
      const projectsWithCounts = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: tasksData } = await supabase
            .from('dev_tasks')
            .select('status')
            .eq('project_id', project.id)

          const counts: TaskCounts = {
            backlog: 0,
            todo: 0,
            doing: 0,
            review: 0,
            done: 0,
            blocked: 0,
          }

          tasksData?.forEach((task) => {
            if (task.status in counts) {
              counts[task.status as keyof TaskCounts]++
            }
          })

          return { ...project, tasks_count: counts }
        })
      )

      setProjects(projectsWithCounts)
    } catch (err) {
      console.error('Erro ao buscar projetos:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [])

  const createProject = async (data: {
    nome: string
    descricao?: string
    github_repo?: string
  }) => {
    try {
      const slug = data.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      const { data: newProject, error } = await supabase
        .from('dev_projects')
        .insert({
          slug,
          nome: data.nome,
          descricao: data.descricao || null,
          github_repo: data.github_repo || null,
          status: 'planning',
        })
        .select()
        .single()

      if (error) throw error

      await fetchProjects()
      return newProject
    } catch (err) {
      console.error('Erro ao criar projeto:', err)
      throw err
    }
  }

  const updateProject = async (id: string, data: Partial<Project>) => {
    try {
      const { error } = await supabase
        .from('dev_projects')
        .update(data)
        .eq('id', id)

      if (error) throw error

      await fetchProjects()
    } catch (err) {
      console.error('Erro ao atualizar projeto:', err)
      throw err
    }
  }

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('dev_projects')
        .delete()
        .eq('id', id)

      if (error) throw error

      await fetchProjects()
    } catch (err) {
      console.error('Erro ao deletar projeto:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  return {
    projects,
    loading,
    error,
    refresh: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  }
}
