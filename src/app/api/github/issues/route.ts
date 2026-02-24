import { NextRequest, NextResponse } from 'next/server'
import { createIssue, listIssues, generateIssueBody } from '@/lib/github'

export async function GET(request: NextRequest) {
  const repo = request.nextUrl.searchParams.get('repo')
  const state = request.nextUrl.searchParams.get('state') as 'open' | 'closed' | 'all' || 'open'

  if (!repo) {
    return NextResponse.json({ error: 'Repositório não informado' }, { status: 400 })
  }

  try {
    const issues = await listIssues(repo, state)
    return NextResponse.json(issues)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar issues' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { repo, task, labels } = body

    if (!repo || !task) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    const issueBody = generateIssueBody(task)
    const issue = await createIssue(repo, task.titulo, issueBody, labels || [])

    return NextResponse.json(issue)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar issue' },
      { status: 500 }
    )
  }
}
