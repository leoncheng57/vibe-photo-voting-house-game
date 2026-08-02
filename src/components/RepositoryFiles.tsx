import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getRepositoryFiles, repositoryUrl, type RepositoryFilesData } from '../lib/github'

type DocumentName = 'readme' | 'agents' | 'party-phases' | 'screenshot-plan'

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function RefreshIcon() {
  return <svg className="refresh-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 8a7 7 0 0 1 11.8-1L20 12M4 12l2.1 5A7 7 0 0 0 18 16" /></svg>
}

export function RepositoryFiles() {
  const [data, setData] = useState<RepositoryFilesData | null>(null)
  const [documentName, setDocumentName] = useState<DocumentName>('readme')
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
    getRepositoryFiles(controller.signal)
      .then((nextData) => { if (active) setData(nextData) })
      .catch((reason: Error) => {
        if (active && reason.name !== 'AbortError') setError(reason.message)
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [requestId])

  return (
    <main className="progress-page">
      <header className="progress-hero">
        <div>
          <code>/developer/repository-files</code>
          <span className="progress-kicker">Live repository documentation</span>
          <h1>Repository Files</h1>
          <p>Project documentation rendered directly from the repository’s main branch.</p>
        </div>
        <div className="progress-sync">
          <span>{data ? `Last synced ${formatDate(data.fetchedAt)}` : 'Waiting for GitHub'}</span>
          <button type="button" onClick={() => { setLoading(true); setRequestId((value) => value + 1) }} disabled={loading}><RefreshIcon />{loading ? 'Syncing…' : 'Refresh now'}</button>
          <a href={repositoryUrl}>Open repository ↗</a>
        </div>
      </header>

      {error && <div className="progress-error" role="alert"><strong>Could not refresh repository files.</strong><span>{error}. Existing documents remain visible.</span></div>}

      <section className="progress-files">
        <header><span>Reference</span><h2>Project Documentation</h2><p>Select a file to read its latest contents.</p></header>
        {data && <nav className="progress-tabs" aria-label="Repository files">
          <button type="button" className={documentName === 'readme' ? 'active' : ''} onClick={() => setDocumentName('readme')}>README.md</button>
          <button type="button" className={documentName === 'agents' ? 'active' : ''} onClick={() => setDocumentName('agents')}>AGENTS.md</button>
          <button type="button" className={documentName === 'party-phases' ? 'active' : ''} onClick={() => setDocumentName('party-phases')}>Party Phases</button>
          <button type="button" className={documentName === 'screenshot-plan' ? 'active' : ''} onClick={() => setDocumentName('screenshot-plan')}>Screenshot Capture Plan</button>
        </nav>}

        {loading && !data && <div className="progress-loading">Syncing repository files…</div>}
        {!loading && !data && <div className="progress-loading">Repository files unavailable.</div>}
        {data && documentName === 'readme' && <article className="progress-markdown"><Markdown remarkPlugins={[remarkGfm]}>{data.readme}</Markdown></article>}
        {data && documentName === 'agents' && (data.agents ? (
          <article className="progress-markdown"><Markdown remarkPlugins={[remarkGfm]}>{data.agents}</Markdown></article>
        ) : (
          <section className="missing-document"><code>AGENTS.md</code><h2>Document not found</h2><p>This file is not present on the repository’s <code>main</code> branch. This page will display it automatically if it is added later.</p></section>
        ))}
        {data && documentName === 'party-phases' && (data.partyPhases ? (
          <article className="progress-markdown"><Markdown remarkPlugins={[remarkGfm]}>{data.partyPhases}</Markdown></article>
        ) : (
          <section className="missing-document"><code>PARTY_PHASES.md</code><h2>Document not found</h2><p>This file is not present on the repository’s <code>main</code> branch. This page will display it automatically if it is added later.</p></section>
        ))}
        {data && documentName === 'screenshot-plan' && (data.screenshotPlan ? (
          <article className="progress-markdown"><Markdown remarkPlugins={[remarkGfm]}>{data.screenshotPlan}</Markdown></article>
        ) : (
          <section className="missing-document"><code>SCREENSHOT_CAPTURE_PLAN.md</code><h2>Document not found</h2><p>This file is not present on the repository’s <code>main</code> branch. This page will display it automatically if it is added later.</p></section>
        ))}
      </section>
    </main>
  )
}
