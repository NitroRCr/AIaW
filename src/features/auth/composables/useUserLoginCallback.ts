import { storeToRefs } from "pinia"
import { watch } from "vue"

import { useUserStore } from "@/shared/store"

export function useUserLoginCallback (onLogin: () => Promise<void>) {
  const { isInitialized, currentUserId } = storeToRefs(useUserStore())

  watch(
    () => [currentUserId.value, isInitialized.value],
    ([newId, newInit], old) => {
      const [oldId] = old ?? []

      if (newId !== oldId || !oldId) {
        if (newInit) {
          onLogin()
        }
      }
    }
  )
}
