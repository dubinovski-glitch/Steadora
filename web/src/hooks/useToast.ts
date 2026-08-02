import { useState, useCallback } from 'react'

interface Toast { id: string; text: string }

// Manages the transient toast queue. addToast is threaded down to feature views; ToastStack renders it.
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  // Push a toast with a random id, then auto-dismiss it after 2.4s.
  const addToast = useCallback((text: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(t => [...t, { id, text }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2400)
  }, [])

  // Manually remove a toast by id (e.g. user dismiss).
  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id))
  }, [])

  return { toasts, addToast, removeToast }
}
