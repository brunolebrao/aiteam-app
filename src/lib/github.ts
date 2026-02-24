/**
 * GitHub Integration
 * 
 * Funções para criar issues, PRs e linkar commits às tasks
 */

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ''
const GITHUB_API = 'https://api.github.com'

interface GitHubIssue {
  number: number
  title: string
  body: string
  html_url: string
  state: 'open' | 'closed'
  labels: { name: string; color: string }[]
}

interface GitHubPR {
  number: number
  title: string
  body: string
  html_url: string
  state: 'open' | 'closed' | 'merged'
  head: { ref: string }
  base: { ref: string }
}

// Headers padrão para API do GitHub
function getHeaders() {
  return {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

// Parse owner/repo de uma URL ou string
export function parseRepo(repoString: string): { owner: string; repo: string } | null {
  // Formato: owner/repo ou https://github.com/owner/repo
  const match = repoString.match(/(?:github\.com\/)?([^\/]+)\/([^\/]+?)(?:\.git)?$/)
  if (!match) return null
  return { owner: match[1], repo: match[2] }
}

// Criar issue no GitHub
export async function createIssue(
  repoString: string,
  title: string,
  body: string,
  labels: string[] = []
): Promise<GitHubIssue | null> {
  const repo = parseRepo(repoString)
  if (!repo) throw new Error('Repositório inválido')

  const response = await fetch(`${GITHUB_API}/repos/${repo.owner}/${repo.repo}/issues`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, body, labels }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Erro ao criar issue')
  }

  return response.json()
}

// Buscar issues do repositório
export async function listIssues(
  repoString: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubIssue[]> {
  const repo = parseRepo(repoString)
  if (!repo) throw new Error('Repositório inválido')

  const response = await fetch(
    `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/issues?state=${state}`,
    { headers: getHeaders() }
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar issues')
  }

  return response.json()
}

// Fechar issue
export async function closeIssue(repoString: string, issueNumber: number): Promise<void> {
  const repo = parseRepo(repoString)
  if (!repo) throw new Error('Repositório inválido')

  const response = await fetch(
    `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/issues/${issueNumber}`,
    {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ state: 'closed' }),
    }
  )

  if (!response.ok) {
    throw new Error('Erro ao fechar issue')
  }
}

// Adicionar comentário em issue/PR
export async function addIssueComment(
  repoString: string,
  issueNumber: number,
  body: string
): Promise<void> {
  const repo = parseRepo(repoString)
  if (!repo) throw new Error('Repositório inválido')

  const response = await fetch(
    `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/issues/${issueNumber}/comments`,
    {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ body }),
    }
  )

  if (!response.ok) {
    throw new Error('Erro ao adicionar comentário')
  }
}

// Criar PR
export async function createPullRequest(
  repoString: string,
  title: string,
  body: string,
  head: string,
  base: string = 'main'
): Promise<GitHubPR | null> {
  const repo = parseRepo(repoString)
  if (!repo) throw new Error('Repositório inválido')

  const response = await fetch(`${GITHUB_API}/repos/${repo.owner}/${repo.repo}/pulls`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ title, body, head, base }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Erro ao criar PR')
  }

  return response.json()
}

// Listar PRs
export async function listPullRequests(
  repoString: string,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubPR[]> {
  const repo = parseRepo(repoString)
  if (!repo) throw new Error('Repositório inválido')

  const response = await fetch(
    `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/pulls?state=${state}`,
    { headers: getHeaders() }
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar PRs')
  }

  return response.json()
}

// Buscar commits recentes
export async function listCommits(
  repoString: string,
  branch: string = 'main',
  limit: number = 10
): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
  const repo = parseRepo(repoString)
  if (!repo) throw new Error('Repositório inválido')

  const response = await fetch(
    `${GITHUB_API}/repos/${repo.owner}/${repo.repo}/commits?sha=${branch}&per_page=${limit}`,
    { headers: getHeaders() }
  )

  if (!response.ok) {
    throw new Error('Erro ao buscar commits')
  }

  const data = await response.json()
  return data.map((commit: any) => ({
    sha: commit.sha,
    message: commit.commit.message,
    author: commit.commit.author.name,
    date: commit.commit.author.date,
  }))
}

// Gerar body de issue a partir de uma task
export function generateIssueBody(task: {
  titulo: string
  descricao?: string | null
  prioridade: string
  tags?: string[]
}): string {
  const priority = {
    low: '🟢 Baixa',
    medium: '🔵 Média',
    high: '🟠 Alta',
    urgent: '🔴 Urgente',
  }[task.prioridade] || task.prioridade

  return `## Descrição
${task.descricao || '_Sem descrição_'}

## Informações
- **Prioridade:** ${priority}
${task.tags?.length ? `- **Tags:** ${task.tags.join(', ')}` : ''}

---
_Issue criada pelo AI Team Dashboard_`
}

// Gerar body de PR a partir de uma task
export function generatePRBody(task: {
  titulo: string
  descricao?: string | null
  id: string
}, issueNumber?: number): string {
  return `## O que foi feito
${task.descricao || task.titulo}

${issueNumber ? `## Issue relacionada\nCloses #${issueNumber}` : ''}

## Checklist
- [ ] Código testado localmente
- [ ] Sem erros de lint
- [ ] Documentação atualizada (se aplicável)

---
_PR criado pelo AI Team Dashboard_
_Task ID: ${task.id}_`
}
