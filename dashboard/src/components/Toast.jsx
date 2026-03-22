import { useState, useEffect } from 'react'

export default function Toast({ event }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!event) return

    // Extract skill name from path
    const pathParts = event.path?.split('/') || []
    const skillDir = pathParts[pathParts.length - 2] || 'skill'
    setMessage(`${skillDir} ${event.event}`)
    setVisible(true)

    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [event])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
        <span className="text-sm text-zinc-200">{message}</span>
      </div>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
      `}</style>
    </div>
  )
}
