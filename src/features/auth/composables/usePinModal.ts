import { ref } from "vue"

import { getMnemonic } from "@/shared/store/tauriStore"
import { IsTauri } from "@/shared/utils/platformApi"

export function usePinModal () {
  const showPinModal = ref(false)

  const checkEncryptedMnemonic = async () => {
    // Only for Tauri we check for mnemonic and show PIN modal
    // For Web PIN will be requested on demand
    if (IsTauri) {
      const hasMnemonic = await getMnemonic()

      if (hasMnemonic) {
        showPinModal.value = true

        return true
      }
    }

    return false
  }

  return {
    showPinModal,
    checkEncryptedMnemonic,
  }
}
