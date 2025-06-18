import { ref } from "vue"

import { getMnemonic } from "@/shared/store/tauriStore"
import { IsTauri } from "@/shared/utils/platformApi"

import { useAuthStore } from "@/features/auth/store/auth"

export function usePinModal () {
  const showPinModal = ref(false)

  const checkEncryptedMnemonic = async () => {
    const authStore = useAuthStore()
    const hasMnemonic = !!(IsTauri
      ? await getMnemonic()
      : authStore.walletInfo?.mnemonic)

    if (hasMnemonic) {
      showPinModal.value = true

      return true
    }

    return false
  }

  return {
    showPinModal,
    checkEncryptedMnemonic,
  }
}
