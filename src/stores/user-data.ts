import { defineStore } from 'pinia'
import { persistentReactive } from 'src/composables/persistent-reactive'

interface UserData {
  lastWorkspaceId: string
  noobAlertDismissed: boolean,
  tipDismissed: Record<string, boolean>
  prodExpiredNotifiedTimestamp: number
  evalExpiredNotified: boolean
  migrationAlertDismissed: boolean
}

export const useUserDataStore = defineStore('user-data', () => {
  const [data, ready] = persistentReactive<UserData>('#user-data', {
    lastWorkspaceId: null,
    noobAlertDismissed: false,
    tipDismissed: {},
    prodExpiredNotifiedTimestamp: null,
    evalExpiredNotified: false,
    migrationAlertDismissed: false
  })
  return { data, ready }
})
