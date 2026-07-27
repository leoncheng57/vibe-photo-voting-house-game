import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getGitHubProgress, repositoryUrl, type GitHubProgressData } from '../lib/github'

type Tab = 'overview' | 'readme' | 'agents'

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function GitHubProgress() {
  const [data, setData] = useState<GitHubProgressData | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
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
  const mergedPullRequests = data?.pullRequests.filter((pullRequest) => pullRequest.merged_at).length ?? 0

  return (
    <main className="progress-page">
      <header className="progress-hero">
        <div>
          <code>/developer/github-progress</code>
          <span className="progress-kicker">Live repository dashboard</span>
          <h1>GitHub Project Progress</h1>
          <p>Issues, pull requests, and project documentation synchronized from the public repository.</p>
        </div>
        <div className="progress-sync">
          <span>{data ? `Last synced ${formatDate(data.fetchedAt)}` : 'Waiting for GitHub'}</span>
          <button type="button" onClick={() => { setLoading(true); setRequestId((value) => value + 1) }} disabled={loading}>{loading ? 'Syncing…' : 'Refresh now'}</button>
          <a href={repositoryUrl}>Open repository ↗</a>
        </div>
      </header>

      {error && <div className="progress-error" role="alert"><strong>Could not refresh GitHub data.</strong><span>{error}. Existing data remains visible.</span></div>}

      <section className="progress-stats" aria-label="Repository summary">
        <article><span>Open issues</span><strong>{data ? openIssues : '—'}</strong></article>
        <article><span>Open PRs</span><strong>{data ? openPullRequests : '—'}</strong></article>
        <article><span>Merged PRs</span><strong>{data ? mergedPullRequests : '—'}</strong></article>
        <article><span>Documents found</span><strong>{data ? data.agents ? '2 / 2' : '1 / 2' : '—'}</strong></article>
      </section>

      <nav className="progress-tabs" aria-label="Project progress sections">
        <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>Overview</button>
        <button className={tab === 'readme' ? 'active' : ''} onClick={() => setTab('readme')}>README.md</button>
        <button className={tab === 'agents' ? 'active' : ''} onClick={() => setTab('agents')}>AGENTS.md</button>
      </nav>

      {loading && !data && <div className="progress-loading">Syncing repository data…</div>}

      {data && tab === 'overview' && (
        <div className="progress-lists">
          <section>
            <header><div><span>Tracker</span><h2>Issues</h2></div><a href={`${repositoryUrl}/issues`}>View all on GitHub ↗</a></header>
            {data.issues.length === 0 ? <p className="progress-empty">No issues found.</p> : (
              <ol>{data.issues.map((issue) => <li key={issue.number}><a href={issue.html_url}><span className={`status status--${issue.state}`}>{issue.state}</span><b>#{issue.number}</b><strong>{issue.title}</strong><time dateTime={issue.updated_at}>{formatDate(issue.updated_at)}</time></a></li>)}</ol>
            )}
          </section>
          <section>
            <header><div><span>Changes</span><h2>Pull Requests</h2></div><a href={`${repositoryUrl}/pulls`}>View all on GitHub ↗</a></header>
            {data.pullRequests.length === 0 ? <p className="progress-empty">No pull requests found.</p> : (
              <ol>{data.pullRequests.map((pullRequest) => { const status = pullRequest.merged_at ? 'merged' : pullRequest.draft ? 'draft' : pullRequest.state; return <li key={pullRequest.number}><a href={pullRequest.html_url}><span className={`status status--${status}`}>{status}</span><b>#{pullRequest.number}</b><strong>{pullRequest.title}</strong><time dateTime={pullRequest.updated_at}>{formatDate(pullRequest.updated_at)}</time></a></li> })}</ol>
            )}
          </section>
        </div>
      )}

      {data && tab === 'readme' && <article className="progress-markdown"><Markdown remarkPlugins={[remarkGfm]}>{data.readme}</Markdown></article>}

      {data && tab === 'agents' && (data.agents ? (
        <article className="progress-markdown"><Markdown remarkPlugins={[remarkGfm]}>{data.agents}</Markdown></article>
      ) : (
        <section className="missing-document"><code>AGENTS.md</code><h2>Document not found</h2><p>This file is not present on the repository’s <code>main</code> branch. The dashboard will display it automatically if it is added later.</p></section>
      ))}
    </main>
  )
}
