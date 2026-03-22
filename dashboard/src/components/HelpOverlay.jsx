import { useEffect } from 'react'

const shortcuts = [
  { key: '/', description: 'Focus search' },
  { key: '?', description: 'Show this help' },
  { key: 'Esc', description: 'Close panel / overlay' },
  { key: '\u2191 \u2193', description: 'Navigate table rows' },
  { key: 'Enter', description: 'Open selected skill' },
  { key: 'j / k', description: 'Next / previous skill' },
]

export default function HelpOverlay({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape' || e.key === '?') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <kbd className="bg-zinc-800 border border-zinc-700 rounded px-2 py-0.5 text-xs font-mono text-zinc-300 min-w-[2.5rem] text-center">
                {s.key}
              </kbd>
              <span className="text-sm text-zinc-400">{s.description}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-zinc-600 mt-4 text-center">Press ? or Esc to close</p>
      </div>
    </div>
  )
}
