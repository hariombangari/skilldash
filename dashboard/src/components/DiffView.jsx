import { useState, useEffect, useCallback } from 'react'
import { fetchDiff } from '../lib/api'

const AGENT_COLORS = {
  'claude-code': '#a78bfa',
  'cursor': '#34d399',
  'windsurf': '#38bdf8',
  'aider': '#fb923c',
}

function computeLineDiff(textA, textB) {
  const linesA = (textA ?? '').split('\n')
  const linesB = (textB ?? '').split('\n')
  const maxLen = Math.max(linesA.length, linesB.length)
  const result = []
  for (let i = 0; i < maxLen; i++) {
    const a = linesA[i] ?? ''
    const b = linesB[i] ?? ''
    result.push({ lineNum: i + 1, left: a, right: b, same: a === b })
  }
  return result
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

export default function DiffView({ leftId, rightId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!leftId || !rightId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchDiff(leftId, rightId)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Failed to load diff')
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [leftId, rightId])

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const left = data?.left
  const right = data?.right
  const diffLines = left && right ? computeLineDiff(left.body ?? '', right.body ?? '') : []
  const leftColor = left?.agent ? (AGENT_COLORS[left.agent] ?? '#a1a1aa') : '#a1a1aa'
  const rightColor = right?.agent ? (AGENT_COLORS[right.agent] ?? '#a1a1aa') : '#a1a1aa'

  return (
    <div
      className="fixed inset-0 z-[60] bg-zinc-950/95 flex flex-col"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="min-w-0">
          {left && right ? (
            <h2 className="text-lg font-bold text-white truncate">
              Comparing: {left.name} &mdash;{' '}
              <span style={{ color: leftColor }}>{left.agent}</span>
              {' vs '}
              <span style={{ color: rightColor }}>{right.agent}</span>
            </h2>
          ) : (
            <h2 className="text-lg font-bold text-white">Loading comparison...</h2>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white flex-shrink-0 cursor-pointer p-1"
          aria-label="Close diff view"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Content */}
      {loading && <Spinner />}
      {error && <div className="p-6 text-red-400 text-sm">{error}</div>}
      {!loading && !error && left && right && (
        <div className="flex flex-1 overflow-hidden">
          {/* Left column */}
          <div className="w-1/2 border-r border-zinc-800 overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: leftColor }}
              />
              <span className="text-sm text-zinc-300 font-medium">{left.name}</span>
              <span className="text-xs text-zinc-500">{left.agent}</span>
            </div>
            <div className="font-mono text-xs leading-5">
              {diffLines.map((line) => (
                <div
                  key={line.lineNum}
                  className={`flex ${line.same ? '' : 'bg-red-500/10'}`}
                >
                  <span className="w-10 flex-shrink-0 text-right pr-2 text-zinc-600 select-none">
                    {line.lineNum}
                  </span>
                  <pre className="flex-1 whitespace-pre-wrap break-all text-zinc-300 pr-4">
                    {line.left}
                  </pre>
                </div>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="w-1/2 overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: rightColor }}
              />
              <span className="text-sm text-zinc-300 font-medium">{right.name}</span>
              <span className="text-xs text-zinc-500">{right.agent}</span>
            </div>
            <div className="font-mono text-xs leading-5">
              {diffLines.map((line) => (
                <div
                  key={line.lineNum}
                  className={`flex ${line.same ? '' : 'bg-green-500/10'}`}
                >
                  <span className="w-10 flex-shrink-0 text-right pr-2 text-zinc-600 select-none">
                    {line.lineNum}
                  </span>
                  <pre className="flex-1 whitespace-pre-wrap break-all text-zinc-300 pr-4">
                    {line.right}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
