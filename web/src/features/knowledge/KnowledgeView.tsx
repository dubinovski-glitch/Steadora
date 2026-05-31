import { useState, useEffect } from 'react'
import { Search, Pin, ThumbsUp, Eye } from 'lucide-react'
import { kbApi } from '../../api/knowledge'
import { SkeletonArticleGrid } from '../../components/primitives/Skeleton'
import type { KbArticle, KbCategory } from '../../types'

export function KnowledgeView() {
  const [articles, setArticles] = useState<KbArticle[]>([])
  const [categories, setCategories] = useState<KbCategory[]>([])
  const [query, setQuery] = useState('')
  const [selectedCat, setSelectedCat] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    kbApi.search(query || undefined, selectedCat).then(setArticles).finally(() => setLoading(false))
  }

  useEffect(() => { kbApi.getCategories().then(setCategories) }, [])
  useEffect(() => { load() }, [query, selectedCat])

  const pinned = articles.filter(a => a.pinned)
  const rest = articles.filter(a => !a.pinned)

  return (
    <div className="flex gap-6 h-full">
      {/* Category sidebar */}
      <div className="w-56 shrink-0">
        <div className="bg-surface rounded-lg border border-border-default p-3 shadow-sm">
          <button
            onClick={() => setSelectedCat(undefined)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${!selectedCat ? 'bg-accent-subtle text-accent-text font-medium' : 'text-text-secondary hover:bg-hover'}`}
          >
            All articles <span className="float-right text-xs text-text-muted">{articles.length}</span>
          </button>
          <div className="mt-1 space-y-0.5">
            {categories.map(c => (
              <button
                key={c.kbCategoryId}
                onClick={() => setSelectedCat(c.kbCategoryId)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${selectedCat === c.kbCategoryId ? 'bg-accent-subtle text-accent-text font-medium' : 'text-text-secondary hover:bg-hover'}`}
              >
                {c.displayName} <span className="float-right text-xs text-text-muted">{c.articleCount}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Knowledge base</h1>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search articles…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border-default bg-surface text-sm focus:outline-none focus:border-border-focus shadow-sm"
          />
        </div>

        {loading ? (
          <SkeletonArticleGrid cards={6} />
        ) : (
          <>
            {/* Pinned hero */}
            {pinned.length > 0 && !selectedCat && !query && (
              <div className="bg-gradient-to-br from-[#1d44b8] to-[#2b5fff] rounded-xl p-6 text-white shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Pin size={14} className="opacity-80" />
                  <span className="text-xs opacity-80 font-medium uppercase tracking-wide">{pinned[0].kbCategoryName}</span>
                </div>
                <h2 className="text-xl font-semibold mb-1">{pinned[0].title}</h2>
                {pinned[0].snippet && <p className="text-sm opacity-80 line-clamp-2">{pinned[0].snippet}</p>}
                <div className="flex items-center gap-3 mt-3 text-xs opacity-70">
                  <span className="flex items-center gap-1"><Eye size={12} /> {pinned[0].views}</span>
                  <span className="flex items-center gap-1"><ThumbsUp size={12} /> {pinned[0].helpfulPercent}%</span>
                </div>
              </div>
            )}

            {/* Article grid */}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
              {rest.map(a => <ArticleCard key={a.articleId} article={a} onVote={helpful => kbApi.vote(a.articleId, helpful).then(() => load())} />)}
              {rest.length === 0 && <div className="col-span-full py-12 text-center text-text-muted">No articles found</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ArticleCard({ article: a, onVote }: { article: KbArticle; onVote: (h: boolean) => void }) {
  return (
    <div className="bg-surface rounded-lg border border-border-default p-4 shadow-sm hover:shadow-md hover:border-accent/30 transition-all flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs bg-subtle text-text-secondary px-2 py-0.5 rounded-full">{a.kbCategoryName}</span>
        {a.pinned && <Pin size={12} className="text-accent" />}
      </div>
      <h3 className="font-medium text-text-primary text-sm leading-snug">{a.title}</h3>
      {a.snippet && <p className="text-xs text-text-secondary line-clamp-2">{a.snippet}</p>}
      {a.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {a.tags.slice(0, 3).map(t => <span key={t} className="text-xs bg-subtle text-text-tertiary px-1.5 py-0.5 rounded">{t}</span>)}
        </div>
      )}
      <div className="flex items-center gap-3 pt-1 text-xs text-text-muted">
        <span className="flex items-center gap-1"><Eye size={11} /> {a.views}</span>
        <span className="flex items-center gap-1"><ThumbsUp size={11} /> {a.helpfulPercent}%</span>
        <div className="flex-1" />
        <button onClick={() => onVote(true)} className="hover:text-[#1f8a4c]">👍</button>
        <button onClick={() => onVote(false)} className="hover:text-[#c8252b]">👎</button>
      </div>
    </div>
  )
}
