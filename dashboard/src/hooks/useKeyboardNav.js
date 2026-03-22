import { useEffect, useCallback } from 'react'

export function useKeyboardNav({ skills, selectedIndex, setSelectedIndex, onSelectSkill, onToggleHelp }) {
  const handleKeyDown = useCallback((e) => {
    // Don't handle if user is typing in an input
    const tag = e.target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') {
      if (e.key === 'Escape') {
        e.target.blur()
      }
      return
    }

    switch (e.key) {
      case '?':
        e.preventDefault()
        onToggleHelp()
        break
      case 'ArrowDown':
      case 'j':
        e.preventDefault()
        setSelectedIndex(i => Math.min((i ?? -1) + 1, skills.length - 1))
        break
      case 'ArrowUp':
      case 'k':
        e.preventDefault()
        setSelectedIndex(i => Math.max((i ?? 0) - 1, 0))
        break
      case 'Enter':
        if (selectedIndex != null && skills[selectedIndex]) {
          onSelectSkill(skills[selectedIndex].id)
        }
        break
    }
  }, [skills, selectedIndex, setSelectedIndex, onSelectSkill, onToggleHelp])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
