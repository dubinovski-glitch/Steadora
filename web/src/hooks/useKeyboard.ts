import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { View } from '../types'

export function useKeyboard(addToast: (t: string) => void) {
  const store = useAppStore()

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key === 'k') { e.preventDefault(); store.setShowCommandPalette(true); return }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === '/') { e.preventDefault(); store.setShowCommandPalette(true) }
      if (e.key === 'c' && !meta) { e.preventDefault(); store.setShowNewIncident(true) }
      if (e.key === 'Escape' && store.openIncidentId) store.closeIncident()

      if (e.key === 'g') {
        const nav = (e2: KeyboardEvent) => {
          const map: Record<string, View> = { d: 'dashboard', i: 'incidents', c: 'changes', p: 'problems', k: 'knowledge', s: 'sla' }
          if (map[e2.key]) store.setView(map[e2.key])
          window.removeEventListener('keydown', nav)
        }
        window.addEventListener('keydown', nav, { once: true })
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [store, addToast])
}
