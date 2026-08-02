import { useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import type { View } from '../types'

// Wires global keyboard shortcuts to appStore navigation actions. Mounted once in App.
export function useKeyboard(addToast: (t: string) => void) {
  const store = useAppStore()

  // Attach a window keydown listener for the lifetime of the component (re-bound if store changes).
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      // Cmd/Ctrl+K opens the command palette even while typing in a field.
      if (meta && e.key === 'k') { e.preventDefault(); store.setShowCommandPalette(true); return }
      // Ignore single-key shortcuts while the user is typing in an input/textarea.
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === '/') { e.preventDefault(); store.setShowCommandPalette(true) }   // "/" focuses command palette
      if (e.key === 'c' && !meta) { e.preventDefault(); store.setShowNewIncident(true) } // "c" = quick-create incident
      if (e.key === 'Escape' && store.openIncidentId) store.closeIncident()           // Esc closes open incident

      // "g" begins a two-key "go to" chord: the next key picks a view (e.g. g then i = incidents).
      if (e.key === 'g') {
        const nav = (e2: KeyboardEvent) => {
          const map: Record<string, View> = { d: 'dashboard', i: 'incidents', c: 'changes', p: 'problems', s: 'sla' }
          if (map[e2.key]) store.setView(map[e2.key])
          window.removeEventListener('keydown', nav)
        }
        // Listen for exactly one follow-up keypress to complete the chord.
        window.addEventListener('keydown', nav, { once: true })
      }
    }
    window.addEventListener('keydown', handle)
    // Cleanup: remove the listener on unmount/re-run to avoid duplicate handlers.
    return () => window.removeEventListener('keydown', handle)
  }, [store, addToast])
}
