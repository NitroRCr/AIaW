<template>
  <div class="cosmos-wallet">
    <div
      v-if="!walletState.isConnected"
      class="not-connected"
    >
      <q-btn
        color="primary"
        @click="handleConnect"
        label="Connect Wallet"
      />
    </div>
    <div
      v-else
      class="connected"
    >
      <div class="address">
        <div class="label">
          Address:
        </div>
        <div class="value">
          {{ walletState.address }}
        </div>
      </div>
      <q-btn
        color="grey"
        outline
        @click="disconnectWallet"
        label="Disconnect"
      />
    </div>

    <mnemonic-dialog
      v-model="showMnemonicDialog"
      @connect="connectWithMnemonic"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue"

import { CosmosWallet } from "@/services/cosmos/CosmosWallet"

import MnemonicDialog from "./MnemonicDialog.vue"

const wallet = inject<CosmosWallet>("cosmos")
const showMnemonicDialog = ref(false)

const walletState = computed(() => wallet.state.value)

const handleConnect = async () => {
  showMnemonicDialog.value = true
}

const connectWithMnemonic = async (mnemonic: string, pin: string) => {
  try {
    await wallet.connectWithMnemonic(mnemonic, pin)
  } catch (error) {
    console.error("Failed to connect with mnemonic:", error)
  }
}

const disconnectWallet = async () => {
  try {
    await wallet.disconnect()
  } catch (error) {
    console.error("Failed to disconnect wallet:", error)
  }
}
</script>

<style scoped>
.cosmos-wallet {
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

.address,
.type {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.label {
  font-size: 0.875rem;
  color: var(--q-text-secondary);
}

.value {
  font-family: monospace;
  word-break: break-all;
}
</style>
