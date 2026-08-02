import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface Notification { notificationId: number; message: string; createdAt: string }

// Tracks the current user's unread-notification count for the topbar badge and polls to keep it fresh.
export function useNotifications() {
  const { user } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch unread notifications and store their count; no-op when signed out, errors swallowed.
  const refresh = useCallback(() => {
    if (!user) return
    api.get<Notification[]>(`/notifications/${user.userId}/unread`)
      .then(list => setUnreadCount(Array.isArray(list) ? list.length : 0))
      .catch(() => {})
  }, [user])

  // Mark everything read on the server and optimistically zero the badge.
  const markAllRead = useCallback(async () => {
    if (!user) return
    await api.post(`/notifications/${user.userId}/mark-read`, {}).catch(() => {})
    setUnreadCount(0)
  }, [user])

  // Refresh immediately on mount, then poll every 60s; interval cleared on unmount.
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  return { unreadCount, markAllRead, refresh }
}
