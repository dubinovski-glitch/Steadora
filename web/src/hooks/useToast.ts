import { useState, useCallback } from 'react'

interface Toast { id: string; text: string }

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
