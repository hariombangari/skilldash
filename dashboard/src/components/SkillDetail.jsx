import { useState, useEffect, useCallback } from 'react'
import { fetchSkillDetail } from '../lib/api'
import { marked } from 'marked'
import DiffView from './DiffView'
import ConfirmModal from './ConfirmModal'

const AGENT_COLORS = {
  'claude-code': '#a78bfa',
  'cursor': '#34d399',
  'windsurf': '#38bdf8',
  'aider': '#fb923c',
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin" />
    </div>
  )
}

function SectionHeading({ children, sub }) {
  return (
    <div className="mb-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{children}</h3>
      {sub && <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  )
}

function formatBytes(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function findSimilarities(skillId, similarities) {
  if (!similarities || !Array.isArray(similarities)) return []
  const results = []
  for (const sim of similarities) {
    const skillIds = sim.skills?.map((s) => (typeof s === 'string' ? s : s.id)) ?? []
    if (skillIds.includes(skillId)) {
      const others = skillIds.filter((id) => id !== skillId)
      for (const otherId of others) {
        results.push({ id: otherId, type: sim.type })
      }
    }
  }
  return results
}

// Note: marked.parse() renders trusted local SKILL.md file content only.
// This content is read from disk by the backend and is not user-supplied.
function renderMarkdown(body) {
  return { __html: marked.parse(body) }
}

export default function SkillDetail({ skillId, similarities, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [diffTarget, setDiffTarget] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (!skillId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchSkillDetail(skillId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load skill detail')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [skillId])

  const handleEscape = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!skillId) return
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [skillId, handleEscape])

  const isOpen = Boolean(skillId)

  const handleCopyPath = useCallback(() => {
    if (detail?.filePath) {
      navigator.clipboard.writeText(detail.filePath).catch(() => {
        // Clipboard write failed — ignore silently
      })
    }
  }, [detail])

  const handleOpenEditor = useCallback(() => {
    if (detail?.filePath) {
      fetch('/api/actions/open-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: detail.filePath }),
      })
    }
  }, [detail])

  const handleOpenFolder = useCallback(() => {
    if (detail?.filePath) {
      fetch('/api/actions/open-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: detail.filePath }),
      })
    }
  }, [detail])

  const similarSkills = findSimilarities(skillId, similarities)
  const agentColor = detail?.agent ? (AGENT_COLORS[detail.agent] ?? '#a1a1aa') : '#a1a1aa'

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-200 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-1/2 sm:max-w-2xl bg-zinc-900 border-l border-zinc-800 flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {loading && <Spinner />}
        {error && (
          <div className="p-6 text-red-400 text-sm">{error}</div>
        )}
        {!loading && !error && detail && (
          <>
            {/* Header — sticky top */}
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-start justify-between gap-4 z-10">
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{detail.name}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {/* Agent badge */}
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
                    <span
                      className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                      style={{ backgroundColor: agentColor }}
                    />
                    {detail.agent}
                  </span>
                  {/* Scope badge */}
                  {detail.scope && (
                    <span className="text-xs bg-zinc-800 text-zinc-400 rounded px-2 py-0.5">
                      {detail.scope}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white flex-shrink-0 cursor-pointer p-1"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* What it does */}
              {detail.description && (
                <section>
                  <SectionHeading>What it does</SectionHeading>
                  <p className="text-zinc-200 text-sm leading-relaxed">{detail.description}</p>
                </section>
              )}

              {/* Possible triggers */}
              {detail.triggers && detail.triggers.length > 0 && (
                <section>
                  <SectionHeading sub="Heuristic — extracted from description">
                    Possible triggers
                  </SectionHeading>
                  <div className="flex flex-wrap gap-2">
                    {detail.triggers.map((trigger) => (
                      <span
                        key={trigger}
                        className="bg-zinc-800 rounded-full px-3 py-1 text-xs text-zinc-400"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Also installed in */}
              {similarSkills.length > 0 && (
                <section>
                  <SectionHeading>Also installed in</SectionHeading>
                  <div className="space-y-1">
                    {similarSkills.map((sim) => (
                      <div key={sim.id} className="flex items-center gap-2 text-sm">
                        <span className="text-zinc-300 font-mono text-xs">{sim.id}</span>
                        <span className="text-xs text-zinc-500">
                          ({sim.type === 'exact-duplicate' ? 'exact duplicate' : 'same name, different content'})
                        </span>
                        {sim.type === 'same-name-different-content' && (
                          <button
                            onClick={() => setDiffTarget(sim.id)}
                            className="text-xs text-blue-400 hover:text-blue-300 ml-2 cursor-pointer"
                          >
                            View diff
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Full Content — markdown */}
              {detail.body && (
                <section>
                  <SectionHeading>Full Content</SectionHeading>
                  <div
                    className="skill-content text-sm"
                    dangerouslySetInnerHTML={renderMarkdown(detail.body)}
                  />
                </section>
              )}

              {/* File info */}
              <section className="border-t border-zinc-800 pt-4 space-y-2 text-xs text-zinc-500">
                {detail.filePath && (
                  <p className="font-mono truncate" title={detail.filePath}>
                    {detail.filePath}
                  </p>
                )}
                <div className="flex gap-4">
                  {detail.fileSize != null && <span>{formatBytes(detail.fileSize)}</span>}
                  {detail.lastModified && <span>{formatDate(detail.lastModified)}</span>}
                  {detail.lineCount != null && <span>{detail.lineCount} lines</span>}
                </div>
              </section>
            </div>

            {/* Action buttons — sticky bottom */}
            <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-6 py-3 flex gap-2">
              <button
                onClick={handleOpenEditor}
                className="bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 cursor-pointer transition-colors"
              >
                Open in Editor
              </button>
              <button
                onClick={handleCopyPath}
                className="bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 cursor-pointer transition-colors"
              >
                Copy Path
              </button>
              <button
                onClick={handleOpenFolder}
                className="bg-zinc-800 hover:bg-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-200 cursor-pointer transition-colors"
              >
                Open Folder
              </button>
            </div>
          </>
        )}
      </div>

      {diffTarget && (
        <DiffView
          leftId={skillId}
          rightId={diffTarget}
          onClose={() => setDiffTarget(null)}
        />
      )}

      {/* Markdown styles for skill content */}
      <style>{`
        .skill-content h1,
        .skill-content h2,
        .skill-content h3,
        .skill-content h4,
        .skill-content h5,
        .skill-content h6 {
          color: #fff;
          font-weight: 600;
          margin-top: 1.25em;
          margin-bottom: 0.5em;
        }
        .skill-content h1 { font-size: 1.25rem; }
        .skill-content h2 { font-size: 1.125rem; }
        .skill-content h3 { font-size: 1rem; }
        .skill-content p {
          color: #d4d4d8;
          line-height: 1.625;
          margin-bottom: 0.75em;
        }
        .skill-content ul,
        .skill-content ol {
          color: #d4d4d8;
          padding-left: 1.5em;
          margin-bottom: 0.75em;
        }
        .skill-content ul { list-style-type: disc; }
        .skill-content ol { list-style-type: decimal; }
        .skill-content li { margin-bottom: 0.25em; }
        .skill-content code {
          background-color: #27272a;
          border-radius: 0.25rem;
          padding: 0.125em 0.375em;
          font-size: 0.875em;
        }
        .skill-content pre {
          background-color: #27272a;
          border-radius: 0.5rem;
          padding: 1em;
          overflow-x: auto;
          margin-bottom: 0.75em;
        }
        .skill-content pre code {
          background: none;
          padding: 0;
        }
        .skill-content a {
          color: #60a5fa;
          text-decoration: underline;
        }
        .skill-content a:hover {
          color: #93bbfd;
        }
        .skill-content blockquote {
          border-left: 3px solid #3f3f46;
          padding-left: 1em;
          color: #a1a1aa;
          margin-bottom: 0.75em;
        }
        .skill-content table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.75em;
        }
        .skill-content th,
        .skill-content td {
          border: 1px solid #3f3f46;
          padding: 0.5em 0.75em;
          text-align: left;
          color: #d4d4d8;
        }
        .skill-content th {
          background-color: #27272a;
          color: #fff;
        }
      `}</style>
    </>
  )
}
