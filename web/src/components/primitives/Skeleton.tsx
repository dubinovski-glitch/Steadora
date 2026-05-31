// Reusable skeleton components — use animate-pulse on muted bg blocks.

function Bar({ w, h = 'h-4' }: { w: string; h?: string }) {
  return <div className={`${w} ${h} bg-border-default rounded animate-pulse`} />
}

// ── Generic rows (div-based, for most list views and admin tabs) ──────────────
export function SkeletonRows({ rows = 5, cols }: {
  rows?: number
  cols?: string[]   // Tailwind width classes for each column
}) {
  const widths = cols ?? ['w-16', 'flex-1', 'w-24', 'w-20']
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border-default last:border-0">
          {widths.map((w, j) => (
            <div
              key={j}
              className={`h-4 bg-border-default animate-pulse rounded ${w === 'flex-1' ? 'flex-1' : w}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Table rows (tr-based, for views with <tbody>) ─────────────────────────────
export function SkeletonTableRows({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-border-default last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-3 py-3">
              <div
                className={`h-4 bg-border-default animate-pulse rounded ${j === 1 ? 'w-full' : j === 0 ? 'w-16' : 'w-20'}`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Card list (for Changes, Knowledge, Problems cards) ────────────────────────
export function SkeletonCards({ cards = 4, cols = 3 }: { cards?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border-default overflow-hidden">
          {/* Top strip */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
            <Bar w="w-20" h="h-4" />
            <Bar w="w-16" h="h-4" />
            <Bar w="flex-1" h="h-4" />
            <Bar w="w-24" h="h-4" />
          </div>
          {/* Body */}
          <div className={`grid gap-4 px-4 py-3`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="flex flex-col gap-2">
                <Bar w="w-14" h="h-3" />
                <Bar w="w-full" h="h-3" />
                <Bar w={j === 0 ? 'w-3/4' : 'w-2/3'} h="h-3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Knowledge article grid ────────────────────────────────────────────────────
export function SkeletonArticleGrid({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="bg-surface rounded-lg border border-border-default p-4 flex flex-col gap-3">
          <Bar w="w-3/4" h="h-4" />
          <Bar w="w-full" h="h-3" />
          <Bar w="w-5/6" h="h-3" />
          <div className="flex gap-2 mt-1">
            <Bar w="w-12" h="h-3" />
            <Bar w="w-16" h="h-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Full detail view (incident / change / problem detail) ─────────────────────
export function SkeletonDetail() {
  return (
    <div className="flex h-full -mx-6 -mt-4 overflow-hidden">
      {/* Left content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky header */}
        <div className="px-6 pt-4 pb-3 border-b border-border-default">
          <Bar w="w-48" h="h-3" />
          <div className="mt-3 mb-3">
            <Bar w="w-2/3" h="h-7" />
          </div>
          <div className="flex items-center gap-2">
            {['w-16', 'w-20', 'w-24', 'w-16'].map((w, i) => (
              <Bar key={i} w={w} h="h-5" />
            ))}
          </div>
        </div>
        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Bar w="w-28" h="h-4" />
            {['w-full', 'w-11/12', 'w-full', 'w-4/5', 'w-10/12'].map((w, i) => (
              <Bar key={i} w={w} h="h-4" />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Bar w="w-28" h="h-4" />
            {['w-full', 'w-3/4', 'w-full'].map((w, i) => (
              <Bar key={i} w={w} h="h-4" />
            ))}
          </div>
        </div>
      </div>
      {/* Right sidebar */}
      <div className="w-80 shrink-0 border-l border-border-default p-4 flex flex-col gap-5">
        <Bar w="w-full" h="h-9" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Bar w="w-20" h="h-3" />
            <Bar w="w-full" h="h-8" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Simple centred spinner for small inline uses ──────────────────────────────
export function SkeletonInline({ rows = 3 }: { rows?: number }) {
  return (
    <div className="py-4 flex flex-col gap-3 px-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Bar key={i} w={i % 2 === 0 ? 'w-full' : 'w-4/5'} h="h-4" />
      ))}
    </div>
  )
}
