const repository = 'leoncheng57/vibe-photo-voting-house-game'
const apiBase = `https://api.github.com/repos/${repository}`
const rawBase = `https://raw.githubusercontent.com/${repository}/main`

export const repositoryUrl = `https://github.com/${repository}`

export interface GitHubLabel {
  name: string
  color: string
}

export interface GitHubIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  updated_at: string
  html_url: string
  labels: GitHubLabel[]
  pull_request?: object
}

export interface GitHubPullRequest {
  number: number
  title: string
  state: 'open' | 'closed'
  draft: boolean
  updated_at: string
  merged_at: string | null
  html_url: string
}

export interface GitHubProgressData {
  issues: GitHubIssue[]
  pullRequests: GitHubPullRequest[]
  fetchedAt: Date
}

export interface RepositoryFilesData {
  readme: string
  agents: string | null
  screenshotPlan: string | null
  fetchedAt: Date
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) throw new Error(`GitHub returned ${response.status}`)
  return response.json() as Promise<T>
}

async function fetchDocument(name: string, signal: AbortSignal, optional = false) {
  const response = await fetch(`${rawBase}/${name}`, { signal })
  if (optional && response.status === 404) return null
  if (!response.ok) throw new Error(`${name} returned ${response.status}`)
  return response.text()
}

export async function getGitHubProgress(signal: AbortSignal): Promise<GitHubProgressData> {
  const [issues, pullRequests] = await Promise.all([
    fetchJson<GitHubIssue[]>(`${apiBase}/issues?state=all&per_page=100&sort=updated&direction=desc`, signal),
    fetchJson<GitHubPullRequest[]>(`${apiBase}/pulls?state=all&per_page=100&sort=updated&direction=desc`, signal),
  ])

  return {
    issues: issues.filter((issue) => !issue.pull_request),
    pullRequests,
    fetchedAt: new Date(),
  }
}

export async function getRepositoryFiles(signal: AbortSignal): Promise<RepositoryFilesData> {
  const [readme, agents, screenshotPlan] = await Promise.all([
    fetchDocument('README.md', signal),
    fetchDocument('AGENTS.md', signal, true),
    fetchDocument('SCREENSHOT_CAPTURE_PLAN.md', signal, true),
  ])

  return {
    readme: readme ?? '',
    agents,
    screenshotPlan,
    fetchedAt: new Date(),
  }
}
