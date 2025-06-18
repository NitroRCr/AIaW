<template>
  <div class="kepler-wallet">
    <div
      v-if="!walletState.isConnected"
      class="not-connected"
    >
      <q-btn
        color="primary"
        @click="connectWallet"
        label="Connect Wallet"
        :disable="!hasKeplr"
      />
    </div>
    <div
      v-else
      class="connected"
    >
      <span class="address">
        {{ walletState.address }}
      </span>
      <q-btn
        color="grey"
        outline
        @click="disconnectWallet"
        label="Disconnect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue"

import { useAuthStore } from "@/features/auth/store/auth"

import { KeplerWallet } from "@/services/blockchain/kepler/KeplerWallet"

const hasKeplr = computed(() => typeof window !== "undefined" && window.keplr)

const wallet = inject<KeplerWallet>("kepler")

const walletState = computed(() => wallet.state.value)

const connectWallet = async () => {
  try {
    await wallet.connect()
    const authStore = useAuthStore()
    authStore.connectWithExternalSigner(wallet.getOfflineSigner())
  } catch (error) {
    console.error("Failed to connect wallet:", error)
    // You might want to show an error message to the user here
  }
}

const disconnectWallet = async () => {
  try {
    await wallet.disconnect()
    const authStore = useAuthStore()
    authStore.disconnect()
  } catch (error) {
    console.error("Failed to disconnect wallet:", error)
  }
}
</script>

<style scoped>
.kepler-wallet {
  padding: 1rem;
  border-radius: 8px;
  background-color: var(--q-background-soft);
}

.not-connected,
.connected {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
}

.address {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-family: monospace;
  word-break: break-all;
}
</style>
