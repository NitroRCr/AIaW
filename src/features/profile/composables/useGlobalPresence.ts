import { onMounted, onUnmounted, watch } from 'vue'

import { useUserStore } from '@/shared/store'

import { usePresenceStore } from '../store/presence'

export function useGlobalPresence() {
  const userStore = useUserStore()
  const presenceStore = usePresenceStore()

  // Activity tracking
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']

  const addActivityListeners = () => {
    activityEvents.forEach(event => {
      document.addEventListener(event, presenceStore.resetAwayTimer, true)
    })
    presenceStore.resetAwayTimer() // Initialize timer
  }

  const removeActivityListeners = () => {
    activityEvents.forEach(event => {
      document.removeEventListener(event, presenceStore.resetAwayTimer, true)
    })
  }

  // Handle page visibility changes
  const handleVisibilityChange = () => {
    if (document.hidden) {
      presenceStore.updateStatus('away')
    } else {
      presenceStore.updateStatus('online')
      presenceStore.resetAwayTimer()
    }
  }

  const initializePresenceWhenReady = async () => {
    if (!userStore.isInitialized || !userStore.isLoggedIn) return

    // Initialize presence tracking
    await presenceStore.initPresence()

    // Add activity tracking
    addActivityListeners()

    // Add visibility change tracking
    document.addEventListener('visibilitychange', handleVisibilityChange)
  }

  // Watch for user authentication changes
  watch(
    () => [userStore.isInitialized, userStore.isLoggedIn],
    ([isInitialized, isLoggedIn]) => {
      if (isInitialized && isLoggedIn) {
        initializePresenceWhenReady()
      } else if (isInitialized && !isLoggedIn) {
        // User logged out, cleanup presence
        presenceStore.cleanup()
      }
    },
    { immediate: true }
  )

  onMounted(() => {
    // Try to initialize immediately if user is already ready
    initializePresenceWhenReady()
  })

  onUnmounted(async () => {
    // Cleanup
    await presenceStore.cleanup()
    removeActivityListeners()
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })

  return {
    currentStatus: presenceStore.currentStatus,
    onlineCount: presenceStore.onlineCount,
    updateStatus: presenceStore.updateStatus
  }
}
