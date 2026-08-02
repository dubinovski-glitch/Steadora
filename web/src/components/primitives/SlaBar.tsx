interface Props {
  percent?: number | null
  breachedAt?: string | null
  targetMinutes?: number | null
  startedAt?: string | null
  pausedSeconds?: number
  compact?: boolean
}

// Picks bar/text colors by SLA consumption: green < 60%, amber 60–80%,
// red 80–100%, dark red once breached (>=100%).
function pctColor(pct: number) {
  if (pct >= 100) return { bar: '#991b1b', text: '#991b1b' }
  if (pct >= 80)  return { bar: '#dc2626', text: '#dc2626' }
  if (pct >= 60)  return { bar: '#d97706', text: '#d97706' }
  return { bar: '#1f8a4c', text: '#1f8a4c' }
}

// Minutes elapsed since startedAt, minus any paused time, clamped to >= 0.
function elapsedMinutes(startedAt: string, pausedSec = 0) {
  return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000) - Math.floor(pausedSec / 60))
}

// Renders an SLA progress bar plus a label (remaining minutes / percent / "Breached").
// Uses the provided percent, or derives it from target + elapsed time when absent.
export function SlaBar({ percent, breachedAt, targetMinutes, startedAt, pausedSeconds = 0, compact = false }: Props) {
  // Use the explicit percent if given; otherwise compute it from elapsed vs target (capped at 200%).
  let pct = percent ?? 0
  if (!percent && targetMinutes && startedAt)
    pct = Math.min(200, (elapsedMinutes(startedAt, pausedSeconds) / targetMinutes) * 100)

  const { bar, text } = pctColor(pct)
  // Breached when at/over 100% or an explicit breach timestamp exists.
  const isBreached = pct >= 100 || !!breachedAt

  // Minutes left before breach (may be negative); null when timing data is missing.
  const remaining = targetMinutes && startedAt
    ? targetMinutes - elapsedMinutes(startedAt, pausedSeconds)
    : null

  // Compact variant: narrow inline bar with a short label, for dense table cells.
  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-14 h-1.5 bg-subtle rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: bar }} />
        </div>
        <span className="tabular text-xs" style={{ color: text }}>
          {isBreached ? 'Breached' : remaining !== null ? `${remaining}m` : `${Math.round(pct)}%`}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-[80px]">
      <div className="w-full h-1.5 bg-subtle rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: bar }} />
      </div>
      <span className="tabular text-xs" style={{ color: text }}>
        {isBreached ? 'Breached' : remaining !== null ? `${remaining}m left` : `${Math.round(pct)}%`}
      </span>
    </div>
  )
}
