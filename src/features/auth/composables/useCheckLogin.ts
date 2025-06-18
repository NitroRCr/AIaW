import { useQuasar } from "quasar"

import { useUserStore } from "@/shared/store"

export function useCheckLogin () {
  const userStore = useUserStore()
  const $q = useQuasar()
  const ensureLogin = (
    message: string = "⚠️ Please login to perform this action"
  ) => {
    if (!userStore.isLoggedIn) {
      $q.notify({
        message,
        color: "negative",
        position: "top",
      })
      throw new Error(message)
    }

    return true
  }

  return {
    ensureLogin,
    isLoggedIn: userStore.isLoggedIn,
  }
}
