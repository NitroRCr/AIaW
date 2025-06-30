<template>
  <div v-if="isAppReady">
    <router-view />
  </div>
  <pin-modal
    v-model="showPinModal"
    @submit="handlePinSubmit"
  />
</template>

<script setup lang="ts">

import { until } from "@vueuse/core"
import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"
import { computed, onMounted, provide, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useSetTheme } from "@/shared/composables/setTheme"
import { useUserStore, getMnemonic, useUserDataStore, useUserPerfsStore } from "@/shared/store"

import { useArtifactsStore } from "@/features/artifacts/store"
import { useAssistantsStore } from "@/features/assistants/store"
import PinModal from "@/features/auth/components/PinModal.vue"
import { useOnboarding } from "@/features/auth/composables/useOnboarding"
import { usePinModal } from "@/features/auth/composables/usePinModal"
import { useAuthStore } from "@/features/auth/store/auth"
import { useChatsStore } from "@/features/chats/store"
import { useChatMessagesStore } from "@/features/chats/store/chatMessages"
import { useDialogsStore } from "@/features/dialogs/store/dialogs"
import { usePluginsStore } from "@/features/plugins/store"
import { useGlobalPresence } from "@/features/profile/composables/useGlobalPresence"
import { useWorkspacesStore } from "@/features/workspaces/store"

import type { CosmosWallet } from "@/services/blockchain/cosmos/CosmosWallet"
import { createCosmosSigner } from "@/services/blockchain/cosmos/CosmosWallet"
import { createKeplerWallet } from "@/services/blockchain/kepler/KeplerWallet"
import { EncryptionService } from "@/services/security/encryption/EncryptionService"

import { IsTauri, IsWeb } from "./shared/utils/platformApi"
import { checkUpdate, ready } from "./shared/utils/update"
defineOptions({
  name: "App",
})
const { t } = useI18n()
const $q = useQuasar()

const userStore = useUserStore()
const { onboarding } = useOnboarding()

$q.loading.show()

// TODO: investigate how to load all with sigle request
const { isInitialized: userInitialized, isLoggedIn } = storeToRefs(userStore)
const { isLoaded: assistantsLoaded } = storeToRefs(useAssistantsStore())
const { isLoaded: chatsLoaded } = storeToRefs(useChatsStore())
const { isLoaded: dialogsLoaded } = storeToRefs(useDialogsStore())
const { isLoaded: pluginsLoaded } = storeToRefs(usePluginsStore())
const { isLoaded: workspacesLoaded } = storeToRefs(useWorkspacesStore())
const { ready: perfsLoaded } = storeToRefs(useUserPerfsStore())
const { ready: userDataLoaded } = storeToRefs(useUserDataStore())
const { isLoaded: artifactsLoaded } = storeToRefs(useArtifactsStore())

const isAppReady = computed(
  () =>
    userInitialized.value &&
    assistantsLoaded.value &&
    chatsLoaded.value &&
    dialogsLoaded.value &&
    pluginsLoaded.value &&
    workspacesLoaded.value &&
    perfsLoaded.value &&
    userDataLoaded.value &&
    artifactsLoaded.value
)

watch(
  isAppReady,
  (isReady) => {
    if (isReady) {
      $q.loading.hide()
      onboarding()
    }
  },
  { immediate: true }
)

// Subscribes to chat messages
useChatMessagesStore()

// Initialize global presence tracking
useGlobalPresence()

const router = useRouter()
const { showPinModal, checkEncryptedMnemonic } = usePinModal()

// Create and provide wallets
const keplerWallet = createKeplerWallet()
provide("kepler", keplerWallet)

let cosmosWallet: CosmosWallet | null = null

if (IsTauri) {
  cosmosWallet = createCosmosSigner()
  provide("cosmos", cosmosWallet)
}

// provide('db', createDbService())
// Provide Kepler wallet
provide("kepler", createKeplerWallet())

useSetTheme()

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - AI as Workspace`
  }
})

// Check if user is authenticated
router.beforeEach(async (to, from, next) => {
  console.log("!!!!to", to, to.meta.public)

  if (!to.meta.public) {
    await until(() => userInitialized.value).toBeTruthy()

    if (!isLoggedIn.value) {
      $q.notify({
        message: t("common.pleaseLogin"),
        color: "negative",
      })

      return next("/login")
    }
  }

  return next()
})

// TODO: refactor this, move to composable
const handlePinSubmit = async (pin: string) => {
  try {
    const authStore = useAuthStore()

    if (IsTauri) {
      if (!cosmosWallet) {
        throw new Error("Cosmos wallet not initialized")
      }

      const encryptedMnemonic = await getMnemonic()

      if (encryptedMnemonic) {
        const mnemonic = await EncryptionService.decryptMnemonic(
          encryptedMnemonic,
          pin
        )
        await cosmosWallet.connectWithMnemonic(mnemonic, pin)

        // Initialize AuthStore: connect granter (CosmosWallet) and then grantee if info exists
        await authStore.initializeFromStorage(cosmosWallet, pin)

        showPinModal.value = false
      }
    }

    if (IsWeb) {
      // For web, the granter (Kepler) should ideally be connected before PIN modal for grantee is shown.
      // However, handlePinSubmit might be triggered if a PIN is needed for an existing grantee.
      // Ensure Kepler is connected and its signer is in authStore.
      if (!authStore.isGranterActuallyConnected || !authStore.granterSigner) {
        // Attempt to connect Kepler if not already connected or if signer is missing
        try {
          await keplerWallet.connect() // Ensure connection
          const keplerSigner = keplerWallet.getOfflineSigner()

          if (keplerSigner) {
            await authStore.connectWithExternalSigner(keplerSigner)
          } else {
            throw new Error(
              "Kepler signer not available after connect attempt."
            )
          }
        } catch (keplerError) {
          console.error(
            "[App] Kepler connection failed during PIN submit for Web:",
            keplerError
          )
          $q.notify({
            message:
              "Kepler connection failed. Please try connecting Kepler first.",
            color: "negative",
          })

          return // Stop if Kepler connection fails
        }
      }

      // Now, with granter (Kepler) signer in authStore, proceed with grantee connection if mnemonic exists.
      const encryptedMnemonic = authStore.walletInfo?.mnemonic

      if (encryptedMnemonic) {
        // connectGranteeWallet expects the encrypted mnemonic and PIN to derive the grantee signer.
        // authStore.initializeFromStorage could also be used if we consider this an initialization path.
        // For clarity, if we are just connecting the grantee after PIN, connectGranteeWallet is more direct.
        await authStore.connectGranteeWallet(encryptedMnemonic, pin)
      } else {
        // If no grantee mnemonic, PIN might have been for something else or flow is incorrect.
        // For now, we assume PIN here is primarily for grantee if one exists.
        console.log(
          "[App] PIN submitted on Web, but no encrypted grantee mnemonic found in authStore."
        )
      }

      showPinModal.value = false
    }
  } catch (error) {
    console.error(
      "[App] Error during PIN verification or wallet connection:",
      error
    )
    $q.notify({
      message: "Invalid PIN code",
      color: "negative",
    })
  }
}

// declare global {
//   interface Window {
//     authStore: ReturnType<typeof useAuthStore>
//   }
// }

onMounted(async () => {
  ready()
  checkUpdate()
  const authStore = useAuthStore()

  // window.authStore = authStore

  // Attempt to connect Kepler as granter on load for Web
  if (IsWeb) {
    try {
      // Listen for Kepler account changes
      window.addEventListener("keplr_keystorechange", async () => {
        console.log("[App] Kepler keystore changed. Re-evaluating connection.")
        authStore.disconnect() // Disconnect current granter/grantee

        if (window.keplr) {
          // Check if Keplr is still available
          try {
            await keplerWallet.connect() // Attempt to reconnect or get new account
            const signer = keplerWallet.getOfflineSigner()

            if (signer) {
              await authStore.connectWithExternalSigner(signer)
            }
          } catch (e) {
            console.error(
              "[App] Error reconnecting Kepler after keystore change:",
              e
            )
            authStore.setGranterSigner(null) // Ensure signer is cleared on error
          }
        } else {
          console.log(
            "[App] Kepler extension not available after keystore change."
          )
          authStore.setGranterSigner(null) // Clear signer if Keplr is gone
        }
      })

      // Initial connection attempt only if Keplr extension is detected
      if (window.keplr) {
        await keplerWallet.connect() // connect() will get signer and update its own state

        if (keplerWallet.state.value.isConnected) {
          const signer = keplerWallet.getOfflineSigner()

          if (signer) {
            await authStore.connectWithExternalSigner(signer)
            console.log(
              "[App] Kepler connected on mount, signer set in authStore."
            )
          }
        } else {
          console.log(
            "[App] Kepler failed to connect on mount or no accounts found."
          )
          authStore.setGranterSigner(null) // Explicitly set to null if not connected
        }
      } else {
        console.log("[App] Kepler extension not detected on mount.")
        authStore.setGranterSigner(null) // Ensure state reflects no Keplr
      }
    } catch (error) {
      console.error("[App] Error initializing Kepler on mount:", error)
      authStore.setGranterSigner(null) // Ensure state reflects no connection
    }
  }

  // Check for encrypted mnemonic on startup (grantee for Web, primary for Tauri)
  // This will show PIN modal if a mnemonic is found.
  await checkEncryptedMnemonic()

  // For Tauri, if a mnemonic was stored, the PIN modal would have appeared.
  // If PIN is submitted, initializeFromStorage will be called in handlePinSubmit.
  // No automatic connection here for Tauri based on stored mnemonic without PIN.

  console.log("[App MOUNT] Initial authStore state:", authStore)
  // WalletService instance is stateless, no need to log it here for connection status.
  // console.log('[MOUNT] WALLET SERVICE', WalletService.getInstance())
  await userStore.init()
})
</script>
