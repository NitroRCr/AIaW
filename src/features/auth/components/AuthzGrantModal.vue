<template>
  <q-dialog
    v-model="dialogVisible"
    persistent
  >
    <q-card style="min-width: 500px">
      <q-card-section class="row items-center">
        <div class="text-h6">
          Authz Grant Setup
        </div>
        <q-space />
        <q-btn
          icon="sym_o_close"
          flat
          round
          dense
          @click="dialogVisible = false"
        />
      </q-card-section>

      <q-card-section>
        <q-stepper
          v-model="step"
          vertical
          color="primary"
          animated
        >
          <!-- Step 1: Create/Select Grantee Wallet -->
          <q-step
            :name="1"
            title="Grantee Wallet"
            icon="account_balance_wallet"
            :done="step > 1"
          >
            <div v-if="!granteeWallet">
              <p class="text-body2 q-mb-md">
                Create a new grantee wallet that will execute transactions on
                your behalf.
              </p>
              <q-btn
                color="primary"
                label="Create New Grantee Wallet"
                @click="showPinModal = true"
                :loading="loading"
              />
            </div>
            <div
              v-else
              class="q-gutter-md"
            >
              <q-card
                flat
                bordered
                class="q-pa-md"
              >
                <div class="text-weight-medium q-mb-sm">
                  Grantee Address
                </div>
                <div class="text-caption text-grey-7 q-mb-md word-break-all">
                  {{ granteeWallet.address }}
                </div>
                <q-btn
                  flat
                  color="negative"
                  icon="sym_o_refresh"
                  label="Regenerate Wallet"
                  @click="regenerateWallet"
                  :loading="loading"
                  size="sm"
                />
              </q-card>
              <q-btn
                color="primary"
                label="Continue to Grant Setup"
                @click="step = 2"
              />
            </div>
          </q-step>

          <!-- Step 2: Grant Configuration -->
          <q-step
            :name="2"
            title="Grant Configuration"
            icon="settings"
            :done="step > 2"
          >
            <div class="q-gutter-md">
              <!-- Existing Grants Section -->
              <q-card
                v-if="hasExistingMsgExecGrant || hasExistingMsgSendGrant"
                flat
                bordered
              >
                <q-card-section>
                  <div class="text-subtitle1 q-mb-md">
                    <q-icon
                      name="sym_o_check_circle"
                      color="positive"
                      class="q-mr-sm"
                    />
                    Current Authorizations
                  </div>
                  <div class="q-gutter-sm">
                    <div
                      v-if="hasExistingMsgExecGrant"
                      class="row items-center justify-between"
                    >
                      <div class="text-body2">
                        <q-icon
                          name="sym_o_smart_toy"
                          class="q-mr-sm"
                        />
                        MsgExecuteContract (Smart Contract Execution)
                      </div>
                      <q-btn
                        flat
                        color="negative"
                        size="sm"
                        label="Revoke"
                        @click="revokeMsgExecGrant"
                        :loading="revokeLoading.msgExec"
                      />
                    </div>
                    <div
                      v-if="hasExistingMsgSendGrant"
                      class="row items-center justify-between"
                    >
                      <div class="text-body2">
                        <q-icon
                          name="sym_o_send"
                          class="q-mr-sm"
                        />
                        MsgSend (Token Transfers)
                      </div>
                      <q-btn
                        flat
                        color="negative"
                        size="sm"
                        label="Revoke"
                        @click="revokeMsgSendGrant"
                        :loading="revokeLoading.msgSend"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>

              <!-- New Grants Section -->
              <q-card
                flat
                bordered
              >
                <q-card-section>
                  <div class="text-subtitle1 q-mb-md">
                    New Authorizations to Grant
                  </div>
                  <div class="q-gutter-sm">
                    <q-checkbox
                      v-if="!hasExistingMsgExecGrant"
                      v-model="grantMsgExecContract"
                      label="MsgExecuteContract (Smart Contract Execution)"
                    />
                    <div
                      v-else
                      class="text-body2 text-grey-6"
                    >
                      <q-icon
                        name="sym_o_info"
                        class="q-mr-sm"
                      />
                      MsgExecuteContract already granted
                    </div>

                    <q-checkbox
                      v-if="!hasExistingMsgSendGrant"
                      v-model="grantMsgSend"
                      label="MsgSend (Token Transfers)"
                    />
                    <div
                      v-else
                      class="text-body2 text-grey-6"
                    >
                      <q-icon
                        name="sym_o_info"
                        class="q-mr-sm"
                      />
                      MsgSend already granted
                    </div>

                    <div
                      v-if="hasExistingMsgExecGrant && hasExistingMsgSendGrant"
                      class="text-body2 text-grey-6"
                    >
                      <q-icon
                        name="sym_o_done_all"
                        class="q-mr-sm"
                      />
                      All permissions already granted. Use revoke buttons above
                      to remove permissions.
                    </div>
                  </div>
                </q-card-section>
              </q-card>

              <q-card
                flat
                bordered
              >
                <q-card-section>
                  <div class="text-subtitle1 q-mb-md">
                    Initial Token Transfer
                  </div>
                  <q-input
                    v-model="tokenAmount"
                    type="number"
                    label="Amount to transfer to grantee"
                    suffix="ustake"
                    filled
                    class="q-mb-sm"
                  />
                  <div class="text-caption text-grey-6">
                    The grantee wallet needs tokens to pay for transaction fees.
                    Tokens will be transferred during the final setup step.
                  </div>
                </q-card-section>
              </q-card>

              <q-card
                flat
                bordered
              >
                <q-card-section>
                  <div class="text-subtitle1 q-mb-md">
                    Gas Settings
                  </div>
                  <q-input
                    v-model="gasAmount"
                    type="number"
                    label="Gas limit"
                    filled
                    class="q-mb-sm"
                  />
                  <q-input
                    v-model="gasPrice"
                    label="Gas price"
                    suffix="ustake"
                    filled
                  />
                </q-card-section>
              </q-card>

              <div class="row q-gutter-md">
                <q-btn
                  color="primary"
                  label="Review & Execute"
                  @click="step = 3"
                  :disable="
                    (!grantMsgExecContract || hasExistingMsgExecGrant) &&
                      (!grantMsgSend || hasExistingMsgSendGrant)
                  "
                />
                <q-btn
                  flat
                  label="Back"
                  @click="step = 1"
                />
              </div>
            </div>
          </q-step>

          <!-- Step 3: Review & Execute -->
          <q-step
            :name="3"
            title="Review & Execute"
            icon="sym_o_check_circle"
          >
            <div class="q-gutter-md">
              <q-card
                flat
                bordered
              >
                <q-card-section>
                  <div class="text-subtitle1 q-mb-md">
                    Summary
                  </div>
                  <q-list>
                    <q-item>
                      <q-item-section>
                        <q-item-label>Grantee Address</q-item-label>
                        <q-item-label caption>
                          {{ granteeWallet?.address }}
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label>New Permissions to Grant</q-item-label>
                        <q-item-label caption>
                          <span
                            v-if="
                              grantMsgExecContract && !hasExistingMsgExecGrant
                            "
                          >MsgExecuteContract
                          </span>
                          <span v-if="grantMsgSend && !hasExistingMsgSendGrant">MsgSend
                          </span>
                          <span
                            v-if="
                              (!grantMsgExecContract ||
                                hasExistingMsgExecGrant) &&
                                (!grantMsgSend || hasExistingMsgSendGrant)
                            "
                            class="text-grey-6"
                          >
                            No new permissions to grant
                          </span>
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label>Initial Transfer</q-item-label>
                        <q-item-label caption>
                          {{ tokenAmount }} ustake
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item>
                      <q-item-section>
                        <q-item-label>Gas Settings</q-item-label>
                        <q-item-label caption>
                          Limit: {{ gasAmount }}, Price: {{ gasPrice }}ustake
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>
                </q-card-section>
              </q-card>

              <!-- Step-by-step execution buttons -->
              <q-card
                flat
                bordered
              >
                <q-card-section>
                  <div class="text-subtitle1 q-mb-md">
                    Execute Operations
                  </div>
                  <div class="q-gutter-md">
                    <!-- Step 1: Transfer Tokens -->
                    <div class="row items-center justify-between">
                      <div class="col">
                        <div class="text-body2">
                          <q-icon
                            :name="
                              setupProgress.tokensTransferred
                                ? 'sym_o_check_circle'
                                : 'sym_o_send'
                            "
                            :color="
                              setupProgress.tokensTransferred
                                ? 'positive'
                                : 'primary'
                            "
                            class="q-mr-sm"
                          />
                          Step 1: Transfer {{ tokenAmount }} ustake to grantee
                          <div
                            v-if="granteeWallet?.address"
                            class="text-caption text-grey-6 q-mt-xs"
                          >
                            Current balance:
                            {{ Math.floor(parseInt(granteeBalance) / 1000000) }}
                            STAKE ({{ granteeBalance }} ustake)
                          </div>
                        </div>
                      </div>
                      <div class="col-auto">
                        <q-btn
                          v-if="!setupProgress.tokensTransferred"
                          color="primary"
                          label="Transfer Tokens"
                          @click="transferTokens"
                          :loading="setupLoading.tokens"
                          size="sm"
                        />
                        <q-chip
                          v-else
                          color="positive"
                          text-color="white"
                          icon="sym_o_check"
                          label="Completed"
                        />
                      </div>
                    </div>

                    <!-- Step 2: Grant Authorizations -->
                    <div
                      v-if="
                        (grantMsgExecContract && !hasExistingMsgExecGrant) ||
                          (grantMsgSend && !hasExistingMsgSendGrant)
                      "
                      class="row items-center justify-between"
                    >
                      <div class="col">
                        <div class="text-body2">
                          <q-icon
                            :name="
                              (setupProgress.msgExecGranted ||
                                hasExistingMsgExecGrant ||
                                !grantMsgExecContract) &&
                                (setupProgress.msgSendGranted ||
                                  hasExistingMsgSendGrant ||
                                  !grantMsgSend)
                                ? 'sym_o_check_circle'
                                : 'sym_o_security'
                            "
                            :color="
                              (setupProgress.msgExecGranted ||
                                hasExistingMsgExecGrant ||
                                !grantMsgExecContract) &&
                                (setupProgress.msgSendGranted ||
                                  hasExistingMsgSendGrant ||
                                  !grantMsgSend)
                                ? 'positive'
                                : setupProgress.tokensTransferred
                                  ? 'primary'
                                  : 'grey'
                            "
                            class="q-mr-sm"
                          />
                          Step 2: Grant permissions
                          <span
                            v-if="
                              grantMsgExecContract &&
                                !hasExistingMsgExecGrant &&
                                grantMsgSend &&
                                !hasExistingMsgSendGrant
                            "
                          >
                            (MsgExecuteContract + MsgSend)
                          </span>
                          <span
                            v-else-if="
                              grantMsgExecContract && !hasExistingMsgExecGrant
                            "
                          >
                            (MsgExecuteContract)
                          </span>
                          <span
                            v-else-if="grantMsgSend && !hasExistingMsgSendGrant"
                          >
                            (MsgSend)
                          </span>
                        </div>
                      </div>
                      <div class="col-auto">
                        <q-btn
                          v-if="
                            !(
                              (setupProgress.msgExecGranted ||
                                hasExistingMsgExecGrant ||
                                !grantMsgExecContract) &&
                              (setupProgress.msgSendGranted ||
                                hasExistingMsgSendGrant ||
                                !grantMsgSend)
                            )
                          "
                          color="primary"
                          label="GRANT"
                          @click="grantAuthorizations"
                          :loading="
                            setupLoading.msgExec || setupLoading.msgSend
                          "
                          :disable="!setupProgress.tokensTransferred"
                          size="sm"
                        />
                        <q-chip
                          v-else
                          color="positive"
                          text-color="white"
                          icon="sym_o_check"
                          label="Completed"
                        />
                      </div>
                    </div>

                    <!-- Completion message and final button -->
                    <div
                      v-if="
                        setupProgress.tokensTransferred &&
                          (!grantMsgExecContract ||
                            hasExistingMsgExecGrant ||
                            setupProgress.msgExecGranted) &&
                          (!grantMsgSend ||
                            hasExistingMsgSendGrant ||
                            setupProgress.msgSendGranted)
                      "
                      class="q-mt-md"
                    >
                      <q-separator class="q-my-md" />
                      <div class="text-center">
                        <q-icon
                          name="sym_o_celebration"
                          color="positive"
                          size="md"
                          class="q-mr-sm"
                        />
                        <div class="text-body1 text-positive q-mb-md">
                          All operations completed successfully!
                        </div>
                        <q-btn
                          color="positive"
                          label="Finish Setup"
                          @click="executeSetup"
                          icon="sym_o_check"
                        />
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>

              <div class="row q-gutter-md">
                <q-btn
                  flat
                  label="Back"
                  @click="step = 2"
                />
              </div>
            </div>
          </q-step>
        </q-stepper>
      </q-card-section>

      <pin-modal
        v-model="showPinModal"
        @submit="handlePinSubmit"
      />
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { ref, computed, onMounted, watch } from "vue"

import PinModal from "@/features/auth/components/PinModal.vue"
import { useAuthStore } from "@/features/auth/store/auth"

import { WalletInfo } from "@/services/blockchain/authz/walletService"

import { WalletService } from "@/services"

interface Props {
  modelValue: boolean
}

interface Emits {
  (e: "update:modelValue", value: boolean): void
  (e: "success"): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const $q = useQuasar()
const authStore = useAuthStore()

// Computed for v-model
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
})

// State
const step = ref(1)
const loading = ref(false)
const showPinModal = ref(false)
const granteeWallet = ref<WalletInfo | null>(null)
const revokeLoading = ref({
  msgExec: false,
  msgSend: false,
})

// Setup execution progress tracking
const setupProgress = ref({
  tokensTransferred: false,
  msgExecGranted: false,
  msgSendGranted: false,
})
const setupLoading = ref({
  tokens: false,
  msgExec: false,
  msgSend: false,
})

// Grantee balance tracking
const granteeBalance = ref("0")

// Grant configuration
const grantMsgExecContract = ref(true)
const grantMsgSend = ref(true)
const tokenAmount = ref("2000000") // 2 tokens in ustake
const gasAmount = ref("200000")
const gasPrice = ref("0.025")

// Computed
const isGranterConnected = computed(() => authStore.isGranterActuallyConnected)
const hasExistingMsgExecGrant = ref(false)
const hasExistingMsgSendGrant = ref(false)

// Load existing wallet info on mount
onMounted(async () => {
  console.log("AuthzGrantModal onMounted:", {
    hasWalletInfo: !!authStore.walletInfo,
    hasGranterSigner: !!authStore.granterSigner,
    isGranterConnected: authStore.isGranterActuallyConnected,
  })

  if (authStore.walletInfo) {
    granteeWallet.value = authStore.walletInfo
    step.value = 2
    // Refresh grants status using the new function
    await refreshGrantsStatus()
  }
})

// Watch for granter connection and refresh status
watch(
  () => authStore.isGranterActuallyConnected,
  async (isConnected) => {
    console.log("Granter connection changed:", isConnected)

    if (isConnected && granteeWallet.value?.address) {
      await refreshGrantsStatus()
    }
  }
)

// Watch for modal opening and refresh status
watch(
  () => props.modelValue,
  async (isOpen) => {
    if (
      isOpen &&
      granteeWallet.value?.address &&
      authStore.isGranterActuallyConnected
    ) {
      console.log("Modal opened, refreshing grants status")
      await refreshGrantsStatus()
    }
  }
)

// Methods
const refreshGrantsStatus = async () => {
  console.log("refreshGrantsStatus called:", {
    hasGranterSigner: !!authStore.granterSigner,
    hasGranteeAddress: !!granteeWallet.value?.address,
    granteeAddress: granteeWallet.value?.address,
  })

  if (!authStore.granterSigner || !granteeWallet.value?.address) {
    console.log("refreshGrantsStatus: early exit, resetting values")
    // Reset to default values if no wallet or granter
    hasExistingMsgExecGrant.value = false
    hasExistingMsgSendGrant.value = false
    setupProgress.value.msgExecGranted = false
    setupProgress.value.msgSendGranted = false
    setupProgress.value.tokensTransferred = false

    return
  }

  try {
    const granterAccounts = await authStore.granterSigner.getAccounts()

    if (granterAccounts.length > 0) {
      const granterAddress = granterAccounts[0].address
      const walletService = WalletService.getInstance()

      // Check grants status
      const grants = await walletService.checkExistingGrants(
        granterAddress,
        granteeWallet.value.address
      )
      hasExistingMsgExecGrant.value = grants.hasMsgExecGrant
      hasExistingMsgSendGrant.value = grants.hasMsgSendGrant

      // Check grantee balance to see if tokens were already transferred
      const balanceCheck = await walletService.checkGranteeBalance(
        granteeWallet.value.address
      )
      setupProgress.value.tokensTransferred = balanceCheck.hasTokens
      granteeBalance.value = balanceCheck.balance

      // If grants don't exist in blockchain, reset setup progress
      if (!grants.hasMsgExecGrant) {
        setupProgress.value.msgExecGranted = false
      }

      if (!grants.hasMsgSendGrant) {
        setupProgress.value.msgSendGranted = false
      }

      console.log("Grants status refreshed:", grants)
      console.log("Balance status refreshed:", balanceCheck)
    }
  } catch (error) {
    console.error("Error refreshing grants status:", error)
    // Reset on error
    hasExistingMsgExecGrant.value = false
    hasExistingMsgSendGrant.value = false
    setupProgress.value.msgExecGranted = false
    setupProgress.value.msgSendGranted = false
    setupProgress.value.tokensTransferred = false
  }
}

const regenerateWallet = async () => {
  granteeWallet.value = null
  hasExistingMsgExecGrant.value = false
  hasExistingMsgSendGrant.value = false
  // Reset setup progress
  setupProgress.value = {
    tokensTransferred: false,
    msgExecGranted: false,
    msgSendGranted: false,
  }
  granteeBalance.value = "0"
  step.value = 1
}

const handlePinSubmit = async (pin: string) => {
  loading.value = true
  try {
    const newWalletInfo = await authStore.createGranteeWallet(pin)
    granteeWallet.value = newWalletInfo

    // Reset grants status for new wallet
    hasExistingMsgExecGrant.value = false
    hasExistingMsgSendGrant.value = false

    // Reset setup progress for new wallet
    setupProgress.value = {
      tokensTransferred: false,
      msgExecGranted: false,
      msgSendGranted: false,
    }
    granteeBalance.value = "0"

    if (newWalletInfo?.address && authStore.granterSigner) {
      // Note: Token transfer will happen in executeSetup step
      // This allows user to configure the amount before sending

      // Refresh grants status after wallet creation
      await refreshGrantsStatus()

      $q.notify({
        message: "Grantee wallet created successfully!",
        color: "positive",
      })

      step.value = 2
    } else {
      throw new Error(
        "Failed to create grantee wallet or granter not connected."
      )
    }
  } catch (error) {
    console.error("Error creating grantee wallet:", error)
    $q.notify({
      message: `Error creating grantee: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    loading.value = false
    showPinModal.value = false
  }
}

const revokeMsgExecGrant = async () => {
  if (!granteeWallet.value?.address || !authStore.granterSigner) return

  revokeLoading.value.msgExec = true
  try {
    const granterAccounts = await authStore.granterSigner.getAccounts()
    const granterAddress = granterAccounts[0].address

    await authStore.revokeAgentAuthorization(
      granterAddress,
      granteeWallet.value.address
    )

    // Refresh grants status after revoking
    await refreshGrantsStatus()

    // Reset setup progress since grant was revoked
    setupProgress.value.msgExecGranted = false

    $q.notify({
      message: "MsgExecuteContract authorization revoked successfully!",
      color: "positive",
    })
  } catch (error) {
    console.error("Error revoking MsgExec grant:", error)
    $q.notify({
      message: `Error revoking grant: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    revokeLoading.value.msgExec = false
  }
}

const revokeMsgSendGrant = async () => {
  if (!granteeWallet.value?.address || !authStore.granterSigner) return

  revokeLoading.value.msgSend = true
  try {
    const granterAccounts = await authStore.granterSigner.getAccounts()
    const granterAddress = granterAccounts[0].address

    await authStore.revokeAgentAuthorization(
      granterAddress,
      granteeWallet.value.address,
      "/cosmos.bank.v1beta1.MsgSend"
    )

    // Refresh grants status after revoking
    await refreshGrantsStatus()

    // Reset setup progress since grant was revoked
    setupProgress.value.msgSendGranted = false

    $q.notify({
      message: "MsgSend authorization revoked successfully!",
      color: "positive",
    })
  } catch (error) {
    console.error("Error revoking MsgSend grant:", error)
    $q.notify({
      message: `Error revoking grant: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    revokeLoading.value.msgSend = false
  }
}

// Step-by-step setup functions
const transferTokens = async () => {
  if (
    !granteeWallet.value?.address ||
    !isGranterConnected.value ||
    !authStore.granterSigner
  ) {
    $q.notify({
      message: "Setup incomplete or granter not connected.",
      color: "warning",
    })

    return
  }

  setupLoading.value.tokens = true
  try {
    await WalletService.getInstance().sendTokensToGrantee(
      authStore.granterSigner,
      granteeWallet.value.address,
      "ustake",
      tokenAmount.value
    )

    setupProgress.value.tokensTransferred = true
    $q.notify({
      message: `Successfully transferred ${tokenAmount.value} ustake to grantee!`,
      color: "positive",
    })
  } catch (error) {
    console.error("Error transferring tokens:", error)
    $q.notify({
      message: `Error transferring tokens: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    setupLoading.value.tokens = false
  }
}

const grantAuthorizations = async () => {
  if (
    !granteeWallet.value?.address ||
    !isGranterConnected.value ||
    !authStore.granterSigner
  ) {
    $q.notify({
      message: "Setup incomplete or granter not connected.",
      color: "warning",
    })

    return
  }

  // Check which grants are actually needed
  const needsMsgExec =
    grantMsgExecContract.value && !hasExistingMsgExecGrant.value
  const needsMsgSend = grantMsgSend.value && !hasExistingMsgSendGrant.value

  if (!needsMsgExec && !needsMsgSend) {
    $q.notify({ message: "No new grants needed.", color: "info" })

    return
  }

  setupLoading.value.msgExec = true
  setupLoading.value.msgSend = true

  try {
    const granterAccounts = await authStore.granterSigner.getAccounts()
    const granterAddress = granterAccounts[0].address

    await authStore.grantMultipleAuthorizations(
      granterAddress,
      granteeWallet.value.address,
      {
        grantMsgExec: needsMsgExec,
        grantMsgSend: needsMsgSend,
        msgSendSpendLimit: "10000000000",
      }
    )

    // Update progress for completed grants
    if (needsMsgExec) setupProgress.value.msgExecGranted = true

    if (needsMsgSend) setupProgress.value.msgSendGranted = true

    await refreshGrantsStatus()

    const grantedTypes = []

    if (needsMsgExec) grantedTypes.push("MsgExecuteContract")

    if (needsMsgSend) grantedTypes.push("MsgSend")

    $q.notify({
      message: `Successfully granted ${grantedTypes.join(" and ")} authorization${grantedTypes.length > 1 ? "s" : ""}!`,
      color: "positive",
    })
  } catch (error) {
    console.error("Error granting authorizations:", error)
    $q.notify({
      message: `Error granting authorizations: ${error.message || error}`,
      color: "negative",
    })
  } finally {
    setupLoading.value.msgExec = false
    setupLoading.value.msgSend = false
  }
}

const executeSetup = async () => {
  // This function now just shows completion message
  // Individual operations are handled by separate functions
  $q.notify({
    message: "Authz grant setup completed successfully!",
    color: "positive",
  })

  emit("success")
  emit("update:modelValue", false)
}
</script>

<style scoped>
.word-break-all {
  word-break: break-all;
  font-family: monospace;
}
</style>
