<template>
  <q-item class="q-mt-md q-mb-md">
    <q-item-section>
      <q-item-label>Grantee Wallet</q-item-label>
      <div
        v-if="walletInfo && walletInfo.address"
        class="text-caption q-mt-xs"
      >
        {{ walletInfo.address }}
      </div>
    </q-item-section>
    <q-item-section
      side
      class="items-end"
    >
      <template v-if="walletInfo && walletInfo.address">
        <q-btn
          v-if="!isAuthorizationActuallyGranted"
          flat
          color="primary"
          label="Grant Authorization"
          class="q-mt-xs"
          @click="handleGrantAuthorizationClick"
          :loading="actionLoading"
          :disable="!isGranterConnected"
        />
        <q-btn
          v-else
          flat
          color="negative"
          label="Revoke Authorization"
          class="q-mt-xs"
          @click="handleRevokeClick"
          :loading="actionLoading"
          :disable="!isGranterConnected"
        />
      </template>
      <template v-else>
        <q-btn
          color="primary"
          label="Create New Wallet"
          :disable="!isGranterConnected"
          @click="showPinModal = true"
          :loading="actionLoading"
        />
      </template>
    </q-item-section>
    <pin-modal
      v-model="showPinModal"
      @submit="handlePinSubmit"
    />
  </q-item>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { ref, computed, watch } from "vue"

import PinModal from "@/features/auth/components/PinModal.vue"
import { useAuthStore } from "@/features/auth/store/auth"

import { WalletInfo } from "@/services/blockchain/authz/walletService"

import { WalletService } from "@/services"

const $q = useQuasar()
const showPinModal = ref(false)
const authStore = useAuthStore()
const walletInfo = ref<WalletInfo | null>(null)
const actionLoading = ref(false)

const isGranterConnected = computed(() => authStore.isGranterActuallyConnected)
const isAuthorizationActuallyGranted = computed(
  () => authStore.isGranteeActuallyAuthorized
)

watch(
  () => authStore.walletInfo,
  (newVal) => {
    walletInfo.value = newVal
  },
  { immediate: true, deep: true }
)

const handlePinSubmit = async (pin: string) => {
  actionLoading.value = true
  try {
    const newWalletInfo = await authStore.createGranteeWallet(pin)
    walletInfo.value = newWalletInfo

    if (newWalletInfo?.address && authStore.granterSigner) {
      await WalletService.getInstance().sendTokensToGrantee(
        authStore.granterSigner,
        newWalletInfo.address
      )
      $q.notify({
        message:
          "Grantee wallet created and activated. Please grant authorization.",
        color: "positive",
      })
    } else if (!authStore.granterSigner) {
      throw new Error(
        "Granter wallet is not connected. Cannot send activation tokens."
      )
    } else {
      throw new Error("Failed to create grantee wallet or get its address.")
    }
  } catch (error) {
    console.error("Error in handlePinSubmit:", error)
    $q.notify({
      message: `Error creating grantee: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    actionLoading.value = false
    showPinModal.value = false
  }
}

const handleGrantAuthorizationClick = async () => {
  if (
    !walletInfo.value?.address ||
    !isGranterConnected.value ||
    !authStore.granterSigner
  ) {
    $q.notify({
      message: "Granter not connected or grantee address missing.",
      color: "warning",
    })

    return
  }

  actionLoading.value = true
  try {
    const granterAccounts = await authStore.granterSigner.getAccounts()

    if (granterAccounts.length === 0) {
      throw new Error("Granter account not found for authorization")
    }

    const granterAddress = granterAccounts[0].address
    await authStore.grantAgentAuthorization(
      granterAddress,
      walletInfo.value.address
    )
    $q.notify({
      message: "Authorization granted successfully.",
      color: "positive",
    })
  } catch (error) {
    console.error("Error granting authorization:", error)
    $q.notify({
      message: `Error granting authorization: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    actionLoading.value = false
  }
}

const handleRevokeClick = async () => {
  if (
    !walletInfo.value?.address ||
    !isGranterConnected.value ||
    !authStore.granterSigner
  ) {
    $q.notify({
      message: "Granter not connected or grantee address missing.",
      color: "warning",
    })

    return
  }

  actionLoading.value = true
  try {
    const granterAccounts = await authStore.granterSigner.getAccounts()

    if (granterAccounts.length === 0) {
      throw new Error("Granter account not found for authorization")
    }

    const granterAddress = granterAccounts[0].address
    await authStore.revokeAgentAuthorization(
      granterAddress,
      walletInfo.value.address
    )
    authStore.disconnect()
    $q.notify({
      message: "Authorization revoked successfully.",
      color: "positive",
    })
  } catch (error) {
    console.error("Error revoking authorization:", error)
    $q.notify({
      message: `Error revoking authorization: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    actionLoading.value = false
  }
}
</script>

<style scoped>
.q-item__section--side {
  align-items: flex-end; /* Ensures buttons are aligned to the right if space allows */
}
</style>
