import { useEffect } from 'react'

export default function ConfirmModal({ isOpen, title, message, detail, confirmLabel, confirmVariant, onConfirm, onCancel }) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  const btnClass = confirmVariant === 'danger'
    ? 'bg-red-600 hover:bg-red-500 text-white'
    : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-zinc-400 mb-3">{message}</p>
        {detail && (
          <p className="text-xs font-mono text-zinc-500 bg-zinc-800 rounded px-3 py-2 mb-4 break-all">{detail}</p>
        )}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg cursor-pointer transition-colors ${btnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
