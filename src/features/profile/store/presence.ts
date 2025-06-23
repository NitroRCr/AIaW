import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import { useUserStore } from '@/shared/store'

import { supabase } from '@/services/data/supabase/client'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export const usePresenceStore = defineStore('presence', () => {
  const userStore = useUserStore()
  const presenceData = ref<Record<string, PresenceStatus>>({})
  const currentStatus = ref<PresenceStatus>('online')
  const channel = ref<ReturnType<typeof supabase.channel> | null>(null)

  // Get user status
  const getUserStatus = (userId: string): PresenceStatus => {
    return presenceData.value[userId] || 'offline'
  }

  // Update current user's status
  const updateStatus = async (status: PresenceStatus) => {
    if (!userStore.currentUserId || !channel.value) return

    currentStatus.value = status
    presenceData.value[userStore.currentUserId] = status

    await channel.value.track({
      user_id: userStore.currentUserId,
      status,
      last_seen: new Date().toISOString()
    })
  }

  // Initialize presence tracking
  const initPresence = async () => {
    if (!userStore.currentUserId) return

    channel.value = supabase.channel('global-presence', {
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
          // Convert Supabase presence format to our format
          const newPresenceData: Record<string, PresenceStatus> = {}
          Object.entries(state).forEach(([userId, presences]) => {
            if (Array.isArray(presences) && presences.length > 0) {
              const latest = presences[presences.length - 1] as any

              if (latest && latest.status) {
                newPresenceData[userId] = latest.status
              }
            }
          })
          presenceData.value = newPresenceData
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (Array.isArray(newPresences) && newPresences.length > 0) {
          const latest = newPresences[newPresences.length - 1] as any

          if (latest && latest.status) {
            presenceData.value[key] = latest.status
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        presenceData.value[key] = 'offline'
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
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

  // Auto-away detection
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

  // Online users count
  const onlineCount = computed(() => {
    return Object.values(presenceData.value).filter(status => status === 'online').length
  })

  return {
    presenceData,
    currentStatus,
    onlineCount,
    getUserStatus,
    updateStatus,
    initPresence,
    cleanup,
    resetAwayTimer
  }
})
