<template>
  <div class="cyberlink-result">
    <div>Cyber transacion:</div>
    <pre v-if="transactionBody && !transactionBody.id">{{
      transactionBody
    }}</pre>
    <div class="button-group">
      <button
        @click="handleAccept"
        class="accept-button"
      >
        Accept
      </button>
      <button
        @click="handleDecline"
        class="decline-button"
      >
        Decline
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, Ref, toRef } from "vue"

import { IsTauri } from "@/shared/utils/platformApi"

import { useDialogMessages } from "@/features/dialogs/composables/useDialogMessages"

import { CosmosWallet } from "@/services/blockchain/cosmos/CosmosWallet"
import { KeplerWallet } from "@/services/blockchain/kepler/KeplerWallet"
import { parseEvents } from "@/services/blockchain/kepler/utils"
import { DbDialogMessageUpdate, DialogMessageNested } from "@/services/data/types/dialogMessage"
import { DbMessageContentUpdate } from "@/services/data/types/messageContents"
import { DbStoredItemUpdate, StoredItem } from "@/services/data/types/storedItem"

const props = defineProps<{
  result: StoredItem[] | null
  message: DialogMessageNested<DbDialogMessageUpdate, DbMessageContentUpdate, DbStoredItemUpdate>
}>()
const keplrWallet = inject<KeplerWallet>("kepler")
const cosmosWallet = inject<CosmosWallet>("cosmos")
// FIXME: Potential parsing error and performance issue in computed property
// JSON.parse can throw errors if contentText is invalid JSON, which would break reactivity.
// Also, parsing happens on every props change. Consider adding error handling and caching.
// Alternative: use try/catch block and store parsed result, or validate data beforehand.
const transactionBody = computed(() => JSON.parse(props.result[0].contentText))
const { updateMessage } = useDialogMessages(toRef(props.message, "dialogId") as Ref<string>)
const handleAccept = async () => {
  const { messageContents } = props.message
  const updatedContents = messageContents.filter(
    (content) => content.type !== "assistant-tool"
  )

  try {
    const wallet = IsTauri ? cosmosWallet : keplrWallet
    const tx = await wallet.executeTransaction(transactionBody.value)
    const data = parseEvents(tx.events)
    console.log("Transaction executed", tx, data)

    updatedContents.push({
      type: "assistant-message",
      text: `Transaction completed: ${Object.entries(data)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")}`,
    })
  } catch (error) {
    console.error("Transaction failed", error)
    updatedContents.push({
      type: "assistant-message",
      text: `Transaction failed: ${error.message}`,
    })
  }
  updateMessage(props.message.id, {
    generatingSession: null,
    status: "processed",
    messageContents: updatedContents,
  })
}

const handleDecline = async () => {
  updateMessage(props.message.id, {
    generatingSession: null,
    status: "processed",
    error: "Transaction Declined",
    messageContents: props.message.messageContents.map((content) => {
      if (content.type === "assistant-message") {
        return {
          ...content,
          text: "[Transaction Declined]",
          status: "processed",
          error: "Transaction Declined",
        }
      }

      return content
    }),
  })
}
</script>

<style scoped>
.cyberlink-result {
  padding: 12px;
  margin: 8px 0;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: 500;
}

.accept-button {
  background-color: #4caf50;
  color: white;
}

.decline-button {
  background-color: #f44336;
  color: white;
}

.declined-message {
  color: #f44336;
  font-weight: 500;
  margin-top: 12px;
}
</style>
