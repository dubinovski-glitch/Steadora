import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'

interface Notification { notificationId: number; message: string; createdAt: string }

export function useNotifications() {
  const { user } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    if (!user) return
    api.get<Notification[]>(`/notifications/${user.userId}/unread`)
      .then(list => setUnreadCount(Array.isArray(list) ? list.length : 0))
      .catch(() => {})
  }, [user])

  const markAllRead = useCallback(async () => {
    if (!user) return
    await api.post(`/notifications/${user.userId}/mark-read`, {}).catch(() => {})
    setUnreadCount(0)
  }, [user])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [refresh])

  return { unreadCount, markAllRead, refresh }
}
