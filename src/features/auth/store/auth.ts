import { OfflineSigner, OfflineDirectSigner } from "@cosmjs/proto-signing"
import { defineStore } from "pinia"

import {
  WalletService,
  WalletInfo,
  GranteeWalletInfo,
} from "@/services/blockchain/authz/walletService"
import { CosmosWallet } from "@/services/blockchain/cosmos/CosmosWallet"
import { KeplerWallet } from "@/services/blockchain/kepler/KeplerWallet"

interface AuthState {
  walletInfo: WalletInfo | null // Grantee wallet info (address, encrypted mnemonic)
  isConnected: boolean // Overall status: True if granter is connected AND grantee is created/connected
  isGranterActuallyConnected: boolean // Specific for granter wallet connection
  isGranteeActuallyAuthorized: boolean // Grantee authorization status
  granterSigner: OfflineDirectSigner | null // Granter's signer instance
  granteeSigner: OfflineDirectSigner | null // Grantee's signer instance
}

export const useAuthStore = defineStore({
  id: "auth",
  state: (): AuthState => ({
    walletInfo: null,
    isConnected: false,
    isGranterActuallyConnected: false,
    isGranteeActuallyAuthorized: false,
    granterSigner: null,
    granteeSigner: null,
  }),

  actions: {
    setGranterConnectedStatus (status: boolean) {
      this.isGranterActuallyConnected = status
      this.updateIsConnected()
    },

    // New action to store granter signer
    setGranterSigner (signer: OfflineDirectSigner | null) {
      this.granterSigner = signer
      this.setGranterConnectedStatus(!!signer)
    },

    // New action to store grantee signer
    setGranteeSigner (signer: OfflineDirectSigner | null) {
      this.granteeSigner = signer
      this.updateIsConnected() // isConnected also depends on grantee being present
    },

    updateIsConnected () {
      this.isConnected =
        this.isGranterActuallyConnected &&
        !!this.walletInfo &&
        !!this.granteeSigner
    },

    async createGranteeWallet (pin: string) {
      const walletService = WalletService.getInstance()
      const newGranteeData: GranteeWalletInfo =
        await walletService.createGranteeWallet(pin)
      this.walletInfo = {
        address: newGranteeData.address,
        mnemonic: newGranteeData.mnemonic,
      }
      this.setGranteeSigner(newGranteeData.signer)
      this.isGranteeActuallyAuthorized = false
      this.updateIsConnected()

      return this.walletInfo
    },

    async connectGranteeWallet (encryptedMnemonic: string, pin: string) {
      const walletService = WalletService.getInstance()
      const signer = await walletService.connectGranteeWallet(
        encryptedMnemonic,
        pin
      )
      this.setGranteeSigner(signer)

      // walletInfo should already be populated from persisted state or set by createGranteeWallet
      // If not, this grantee connection is likely part of an initialization flow.
      if (signer && !this.walletInfo) {
        // Recovering walletInfo if not present
        const [account] = await signer.getAccounts()
        this.walletInfo = {
          address: account.address,
          mnemonic: encryptedMnemonic,
        }
      }

      this.updateIsConnected()
      console.log("Grantee Wallet connected, state:", {
        isConnected: this.isConnected,
        walletInfo: this.walletInfo,
      })
    },

    async connectWithExternalSigner (
      signer: OfflineSigner | OfflineDirectSigner
    ) {
      console.log("[External] Connecting external signer")
      const walletService = WalletService.getInstance()
      try {
        await walletService.validateExternalSigner(signer) // Validate before setting
        this.setGranterSigner(signer as OfflineDirectSigner)
      } catch (error) {
        console.error("Failed to connect external signer in authStore:", error)
        this.setGranterSigner(null)
      }
    },

    async initializeFromStorage (
      granterWalletSource: CosmosWallet | KeplerWallet,
      pin: string
    ) {
      if (!this.walletInfo?.mnemonic) {
        console.log(
          "[AuthStore] No grantee mnemonic in storage for initializeFromStorage"
        )
        // Attempt to connect granter even if grantee is not there
        try {
          const granterSigner =
            granterWalletSource.getOfflineSigner() as OfflineDirectSigner
          await WalletService.getInstance().validateExternalSigner(
            granterSigner
          )
          this.setGranterSigner(granterSigner)
        } catch (error) {
          console.error(
            "Error connecting granter during initializeFromStorage (no grantee):",
            error
          )
          this.setGranterSigner(null)
        }

        return
      }

      // Connect Granter
      try {
        const granterSigner =
          granterWalletSource.getOfflineSigner() as OfflineDirectSigner
        await WalletService.getInstance().validateExternalSigner(granterSigner)
        this.setGranterSigner(granterSigner)
      } catch (error) {
        console.error(
          "Error connecting granter during initializeFromStorage:",
          error
        )
        this.setGranterSigner(null)
        // Potentially stop here or allow grantee connection attempt anyway?
        // For now, if granter fails, we still attempt grantee if mnemonic exists.
      }

      // Connect Grantee
      await this.connectGranteeWallet(this.walletInfo.mnemonic, pin)
      // updateIsConnected is called by connectGranteeWallet and setGranterSigner
      console.log("AuthStore initialized from storage, state:", {
        isConnected: this.isConnected,
        isGranterActuallyConnected: this.isGranterActuallyConnected,
      })
    },

    async grantAgentAuthorization (
      granterAddress: string,
      agentAddress: string,
      msgType?: string,
      expiration?: Date
    ) {
      const walletService = WalletService.getInstance()

      if (!this.granterSigner) {
        throw new Error("Granter signer not available")
      }

      if (!this.isGranterActuallyConnected) {
        throw new Error("Granter wallet not connected")
      }

      await walletService.grantAuthorization(
        this.granterSigner,
        granterAddress,
        agentAddress,
        msgType,
        expiration
      )
      this.isGranteeActuallyAuthorized = true
    },

    async grantMsgSendAuthorization (
      granterAddress: string,
      agentAddress: string,
      expiration?: Date
    ) {
      const walletService = WalletService.getInstance()

      if (!this.granterSigner) {
        throw new Error("Granter signer not available")
      }

      if (!this.isGranterActuallyConnected) {
        throw new Error("Granter wallet not connected")
      }

      await walletService.grantSendAuthorization(
        this.granterSigner,
        granterAddress,
        agentAddress,
        "10000000000",
        expiration
      )
    },

    async grantMultipleAuthorizations (
      granterAddress: string,
      agentAddress: string,
      options: {
        grantMsgExec?: boolean
        grantMsgSend?: boolean
        msgSendSpendLimit?: string
        expiration?: Date
      }
    ) {
      const walletService = WalletService.getInstance()

      if (!this.granterSigner) {
        throw new Error("Granter signer not available")
      }

      if (!this.isGranterActuallyConnected) {
        throw new Error("Granter wallet not connected")
      }

      await walletService.grantMultipleAuthorizations(
        this.granterSigner,
        granterAddress,
        agentAddress,
        options
      )

      if (options.grantMsgExec || options.grantMsgSend) {
        this.isGranteeActuallyAuthorized = true
      }
    },

    async revokeAgentAuthorization (
      granterAddress: string,
      agentAddress: string,
      msgType?: string
    ) {
      const walletService = WalletService.getInstance()

      if (!this.granterSigner) {
        throw new Error("Granter signer not available")
      }

      if (!this.isGranterActuallyConnected) {
        throw new Error("Granter wallet not connected")
      }

      await walletService.revokeAuthorization(
        this.granterSigner,
        granterAddress,
        agentAddress,
        msgType
      )
      this.isGranteeActuallyAuthorized = false
    },

    disconnect () {
      console.log("Disconnecting wallets in AuthStore")
      this.setGranterSigner(null)
      this.setGranteeSigner(null)

      this.walletInfo = null
      this.isGranteeActuallyAuthorized = false
      this.updateIsConnected() // This will set isConnected to false
    },
  },

  persist: {
    storage: localStorage,
    // Do not persist signers as they are live objects and can contain sensitive data or become stale.
    // They should be re-established on app load.
    paths: [
      "walletInfo",
      "isConnected",
      "isGranterActuallyConnected",
      "isGranteeActuallyAuthorized",
    ],
  },
})
