import { ref } from "vue"

import {
  getMnemonic,
  saveMnemonic,
  removeMnemonic,
} from "@/shared/store/tauriStore"

import { EncryptionService } from "@/services/encryption/EncryptionService"

export function useMnemonic () {
  const isMnemonicLocked = ref(false)

  const encryptAndSaveMnemonic = async (
    mnemonic: string,
    pin: string
  ): Promise<void> => {
    try {
      const encryptedMnemonic = await EncryptionService.encryptMnemonic(
        mnemonic,
        pin
      )
      await saveMnemonic(encryptedMnemonic)
      isMnemonicLocked.value = true
    } catch (error) {
      console.error("Failed to encrypt and save mnemonic:", error)
      throw error
    }
  }

  const decryptMnemonic = async (pin: string): Promise<string> => {
    try {
      const encryptedMnemonic = await getMnemonic()

      if (!encryptedMnemonic) {
        throw new Error("No encrypted mnemonic found")
      }

      return await EncryptionService.decryptMnemonic(encryptedMnemonic, pin)
    } catch (error) {
      console.error("Failed to decrypt mnemonic:", error)
      throw error
    }
  }

  const checkMnemonicLock = async (): Promise<boolean> => {
    const encryptedMnemonic = await getMnemonic()
    isMnemonicLocked.value = !!encryptedMnemonic

    return isMnemonicLocked.value
  }

  const clearMnemonic = async (): Promise<void> => {
    await removeMnemonic()
    isMnemonicLocked.value = false
  }

  return {
    isMnemonicLocked,
    encryptAndSaveMnemonic,
    decryptMnemonic,
    checkMnemonicLock,
    clearMnemonic,
  }
}
