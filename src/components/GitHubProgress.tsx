import { useEffect, useState, type CSSProperties } from 'react'
import { getGitHubProgress, repositoryUrl, type GitHubIssue, type GitHubProgressData } from '../lib/github'

const priorityGroups = [
  { id: 'high', label: 'High priority', labelName: 'priority: high' },
  { id: 'medium', label: 'Medium priority', labelName: 'priority: medium' },
  { id: 'low', label: 'Low priority', labelName: 'priority: low' },
  { id: 'none', label: 'Unprioritized', labelName: null },
] as const

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function RefreshIcon() {
  return <svg className="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 8a7 7 0 0 1 11.8-1L20 12M4 12l2.1 5A7 7 0 0 0 18 16" /></svg>
}

function IssueRows({ issues }: { issues: GitHubIssue[] }) {
  return <ol>{issues.map((issue) => (
    <li key={issue.number}>
      <a href={issue.html_url}>
        <span className={`status status--${issue.state}`}>{issue.state}</span>
        <b>#{issue.number}</b>
        <div className="issue-summary">
          <strong>{issue.title}</strong>
          {issue.labels.length > 0 && <span className="issue-labels">{issue.labels.map((label) => (
            <span
              className="issue-label"
              key={label.name}
              style={{ '--label-color': `#${label.color}` } as CSSProperties}
            >
              {label.name}
            </span>
          ))}</span>}
        </div>
        <time dateTime={issue.updated_at}>{formatDate(issue.updated_at)}</time>
      </a>
    </li>
  ))}</ol>
}

export function GitHubProgress() {
  const [data, setData] = useState<GitHubProgressData | null>(null)
  const [requestId, setRequestId] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const interval = window.setInterval(() => setRequestId((value) => value + 1), 5 * 60 * 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setError('')
    getGitHubProgress(controller.signal)
      .then((nextData) => { if (active) setData(nextData) })
      .catch((reason: Error) => {
        if (active && reason.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [requestId])

  const openIssues = data?.issues.filter((issue) => issue.state === 'open').length ?? 0
  const openPullRequests = data?.pullRequests.filter((pullRequest) => pullRequest.state === 'open').length ?? 0
  const groupedIssues = priorityGroups.map((group) => ({
    ...group,
    issues: data?.issues.filter((issue) => {
      const priority = issue.labels.find((label) => label.name.startsWith('priority:'))?.name
      return group.labelName ? priority === group.labelName : !priority
    }) ?? [],
  })).filter((group) => group.issues.length > 0)

  return (
    <main className="progress-page">
      <header className="progress-hero">
        <div>
          <code>/developer/github-progress</code>
          <span className="progress-kicker">Live repository dashboard</span>
          <h1>GitHub Project Progress</h1>
          <p>Issues and pull requests synchronized from the public repository.</p>
        </div>
        <div className="progress-sync">
          <span>{data ? `Last synced ${formatDate(data.fetchedAt)}` : 'Waiting for GitHub'}</span>
          <button type="button" onClick={() => { setLoading(true); setRequestId((value) => value + 1) }} disabled={loading}><RefreshIcon />{loading ? 'Syncing…' : 'Refresh now'}</button>
          <a href={repositoryUrl}>Open repository ↗</a>
        </div>
      </header>

      {error && <div className="progress-error" role="alert"><strong>Could not refresh GitHub data.</strong><span>{error}. Existing data remains visible.</span></div>}

      <section className="progress-stats" aria-label="Repository summary">
        <article><span>Open issues</span><strong>{data ? openIssues : '—'}</strong></article>
        <article><span>Open PRs</span><strong>{data ? openPullRequests : '—'}</strong></article>
      </section>

      {loading && !data && <div className="progress-loading">Syncing repository data…</div>}

      {data && <div className="progress-lists">
        <section>
          <header><div><span>Tracker</span><h2>Issues</h2></div><a href={`${repositoryUrl}/issues`}>View all on GitHub ↗</a></header>
          {data.issues.length === 0 ? <p className="progress-empty">No issues found.</p> : (
            <div className="issue-groups">{groupedIssues.map((group) => (
              <section className={`issue-group issue-group--${group.id}`} key={group.id}>
                <header className="issue-group__heading"><strong>{group.label}</strong><span>{group.issues.length}</span></header>
                <IssueRows issues={group.issues} />
              </section>
            ))}</div>
          )}
        </section>
        <section>
          <header><div><span>Changes</span><h2>Pull Requests</h2></div><a href={`${repositoryUrl}/pulls`}>View all on GitHub ↗</a></header>
          {data.pullRequests.length === 0 ? <p className="progress-empty">No pull requests found.</p> : (
            <ol>{data.pullRequests.map((pullRequest) => { const status = pullRequest.merged_at ? 'merged' : pullRequest.draft ? 'draft' : pullRequest.state; return <li key={pullRequest.number}><a href={pullRequest.html_url}><span className={`status status--${status}`}>{status}</span><b>#{pullRequest.number}</b><strong>{pullRequest.title}</strong><time dateTime={pullRequest.updated_at}>{formatDate(pullRequest.updated_at)}</time></a></li> })}</ol>
          )}
        </section>
      </div>}
    </main>
  )
}
