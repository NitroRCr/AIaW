import { ref, onMounted, onUnmounted, computed } from 'vue'

import { useUserStore } from '@/shared/store'

import { supabase } from '@/services/data/supabase/client'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

interface UserPresence {
  user_id: string
  status: PresenceStatus
  last_seen: string
  workspace_id?: string
}

interface PresenceState {
  [userId: string]: UserPresence[]
}

export function useUserPresence(roomId: string = 'global') {
  const userStore = useUserStore()
  const presenceState = ref<PresenceState>({})
  const channel = ref<ReturnType<typeof supabase.channel> | null>(null)
  const currentStatus = ref<PresenceStatus>('online')

  // Track user's own status
  const updateStatus = async (status: PresenceStatus) => {
    if (!userStore.currentUserId || !channel.value) return

    currentStatus.value = status

    await channel.value.track({
      user_id: userStore.currentUserId,
      status,
      last_seen: new Date().toISOString(),
      workspace_id: roomId !== 'global' ? roomId : undefined
    })
  }

  // Get online users
  const onlineUsers = computed(() => {
    const users: Record<string, PresenceStatus> = {}

    Object.entries(presenceState.value).forEach(([userId, presences]) => {
      // Get the most recent presence for each user
      const latestPresence = presences.reduce((latest, current) =>
        new Date(current.last_seen) > new Date(latest.last_seen) ? current : latest
      )
      users[userId] = latestPresence.status
    })

    return users
  })

  // Get user status
  const getUserStatus = (userId: string): PresenceStatus => {
    return onlineUsers.value[userId] || 'offline'
  }

  // Initialize presence tracking
  const initPresence = async () => {
    if (!userStore.currentUserId) return

    channel.value = supabase.channel(`presence:${roomId}`, {
      config: {
        presence: {
          key: userStore.currentUserId,
        },
      },
    })

    // Listen to presence changes
    channel.value
      .on('presence', { event: 'sync' }, () => {
        const state = channel.value?.presenceState()

        if (state) {
          presenceState.value = state as unknown as PresenceState
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user as online
          await updateStatus(currentStatus.value)
        }
      })
  }

  // Cleanup
  const cleanup = async () => {
    if (channel.value) {
      await channel.value.untrack()
      await channel.value.unsubscribe()
      channel.value = null
    }
  }

  // Auto-away detection (optional)
  let awayTimer: ReturnType<typeof setTimeout> | null = null

  const resetAwayTimer = () => {
    if (awayTimer) clearTimeout(awayTimer)

    if (currentStatus.value === 'away') {
      updateStatus('online')
    }

    // Set user as away after 5 minutes of inactivity
    awayTimer = setTimeout(() => {
      if (currentStatus.value === 'online') {
        updateStatus('away')
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  // Track user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

  const addActivityListeners = () => {
    activityEvents.forEach(event => {
      document.addEventListener(event, resetAwayTimer, true)
    })
    resetAwayTimer() // Initialize timer
  }

  const removeActivityListeners = () => {
    if (awayTimer) clearTimeout(awayTimer)

    activityEvents.forEach(event => {
      document.removeEventListener(event, resetAwayTimer, true)
    })
  }

  // Lifecycle
  onMounted(() => {
    initPresence()
    addActivityListeners()
  })

  onUnmounted(() => {
    cleanup()
    removeActivityListeners()
  })

  // Handle page visibility changes
  const handleVisibilityChange = () => {
    if (document.hidden) {
      updateStatus('away')
    } else {
      updateStatus('online')
      resetAwayTimer()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    presenceState,
    onlineUsers,
    currentStatus,
    updateStatus,
    getUserStatus,
    initPresence,
    cleanup
  }
}
