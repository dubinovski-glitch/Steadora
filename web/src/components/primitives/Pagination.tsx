import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  total: number
  page: number
  pageSize: number
  onChange: (page: number) => void
}

// Renders the "Showing X–Y of N" label plus prev/next and numbered page buttons.
// Calls onChange(page) when the user navigates; parent owns the current page state.
export function Pagination({ total, page, pageSize, onChange }: Props) {
  // Derive total page count and the 1-based range of items shown on the current page.
  const totalPages = Math.ceil(total / pageSize)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  // Compute the condensed list of page buttons (with ellipses) to render.
  const pages = buildPageList(page, totalPages)

  return (
    <div className="flex items-center justify-between pt-3 pb-1 px-1">
      <span className="text-xs text-text-muted">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover disabled:opacity-30 text-text-secondary"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`el-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-text-muted">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition-colors ${
                p === page ? 'bg-accent text-white' : 'hover:bg-hover text-text-secondary'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-hover disabled:opacity-30 text-text-secondary"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// Builds a compact page-number sequence: shows all pages when <=7, otherwise
// first/last plus a window around the current page, inserting '...' for gaps.
function buildPageList(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}
