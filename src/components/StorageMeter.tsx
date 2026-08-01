import { formatBytes, type StorageSummary } from '../lib/photo-policy'

interface Props {
  summary: StorageSummary | null
  failed: boolean
  variant: 'bar' | 'panel'
}

function bucketLabel(bucketId: string): string {
  return bucketId === 'photo-originals' ? 'Originals' : 'Game copies'
}

export function StorageMeter({ summary, failed, variant }: Props) {
  if (!summary) {
    if (!failed) return null
    return (
      <div className={`storage-meter storage-meter--${variant} storage-meter--critical`} role="status">
        <span className="storage-meter__label">Storage</span>
        <span>Storage usage unavailable — run migration 006 and reload.</span>
      </div>
    )
  }

  const stale = failed ? ' · refresh failed, showing last reading' : ''
  return (
    <div className={`storage-meter storage-meter--${variant} storage-meter--${summary.level}`} role="status">
      <span className="storage-meter__label">Storage {summary.percent}%</span>
      <div className="storage-meter__track" aria-hidden="true">
        <div className="storage-meter__fill" style={{ width: `${Math.min(100, Math.max(2, summary.percent))}%` }} />
      </div>
      <span className="storage-meter__detail">
        {formatBytes(summary.usedBytes)} used · {formatBytes(summary.remainingBytes)} left{stale}
      </span>
      {variant === 'panel' && (
        <ul className="storage-meter__buckets">
          {summary.buckets.map((bucket) => (
            <li key={bucket.bucketId}>
              <b>{bucketLabel(bucket.bucketId)}</b>
              <span>{formatBytes(bucket.totalBytes)} · {bucket.objectCount} {bucket.objectCount === 1 ? 'file' : 'files'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
