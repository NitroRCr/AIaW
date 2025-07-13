<template>
  <div>
    <q-item>
      <q-item-section>
        <q-item-label v-if="!isTauri">
          Link Kepler Wallet
        </q-item-label>
        <q-item-label v-else>
          Link Cosmos Wallet
        </q-item-label>
      </q-item-section>
      <q-item-section>
        <kepler-wallet v-if="!isTauri" />
        <cosmos-wallet v-else />
      </q-item-section>
    </q-item>
    <q-item class="q-mt-md q-mb-md">
      <q-item-section>
        <q-item-label>Authz Grant Setup</q-item-label>
        <div
          v-if="authStore.walletInfo && authStore.walletInfo.address"
          class="text-caption q-mt-xs"
        >
          Grantee: {{ authStore.walletInfo.address }}
        </div>
        <div
          v-else
          class="text-caption q-mt-xs text-grey-6"
        >
          No grantee wallet configured
        </div>
      </q-item-section>
      <q-item-section
        side
        class="items-end"
      >
        <q-btn
          v-if="authStore.walletInfo && authStore.walletInfo.address"
          flat
          color="negative"
          label="Reconfigure"
          class="q-mt-xs"
          @click="showAuthzModal = true"
          :disable="!authStore.isGranterActuallyConnected"
        />
        <q-btn
          v-else
          color="primary"
          label="Setup Authz Grant"
          @click="showAuthzModal = true"
          :disable="!authStore.isGranterActuallyConnected"
        />
      </q-item-section>
    </q-item>
    <authz-grant-modal
      v-model="showAuthzModal"
      @success="handleAuthzSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"

import { IsTauri } from "@/shared/utils/platformApi"

import AuthzGrantModal from "@/features/auth/components/AuthzGrantModal.vue"
import CosmosWallet from "@/features/auth/components/CosmosWallet.vue"
import KeplerWallet from "@/features/auth/components/KeplerWallet.vue"
import { useAuthStore } from "@/features/auth/store/auth"

const { t } = useI18n()
const $q = useQuasar()
const isTauri = computed(() => IsTauri)
const authStore = useAuthStore()
const showAuthzModal = ref(false)

function handleAuthzSuccess() {
  $q.notify({
    message: t("settingsView.authzGrantSuccess") || "Authz grant setup completed successfully!",
    color: "positive",
  })
}
</script>
