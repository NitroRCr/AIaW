import { computed, Ref, watch } from "vue"

import { useStorage } from "@/shared/composables/storage/useStorage"
import { FILES_BUCKET } from "@/shared/composables/storage/utils"
import { ApiResultItem } from "@/shared/utils/types"

import { UserMessageContent } from "@/features/dialogs/types"

import {
  MessageContentMapped,
  StoredItemMapped,
} from "@/services/supabase/types"

import { useDialogMessages } from "./useDialogMessages"

export const useDialogInput = (
  dialogId: Ref<string>,
) => {
  const { updateMessage, lastMessageId, lastMessage } = useDialogMessages(dialogId)
  const storage = useStorage(FILES_BUCKET)

  async function updateInputText (text) {
    await updateMessage(
      lastMessageId.value,
      {
        // use shallow keyPath to avoid dexie's sync bug
        message_contents: [
          {
            ...inputMessageContent.value,
            text,
          },
        ] as MessageContentMapped[],
        status: "inputing",
      }
    )
  }

  async function addInputItems (items: ApiResultItem[]) {
    const storedItems: StoredItemMapped[] = await storage.saveApiResultItems(items, { dialog_id: dialogId.value })

    await updateMessage(
      lastMessageId.value,
      {
        message_contents: [
          {
            ...inputMessageContent.value,
            stored_items: [
              ...inputMessageContent.value.stored_items,
              ...storedItems.filter((i) => i),
            ],
          },
        ],
      }
    )
  }

  const inputMessageContent = computed(
    () =>
      lastMessage.value?.message_contents[0] as UserMessageContent
  )
  const inputContentItems = computed(
    () => inputMessageContent.value.stored_items
  )
  const inputEmpty = computed(
    () =>
      !inputMessageContent.value?.text &&
      !inputMessageContent.value?.stored_items.length
  )

  watch(lastMessage, (newMessage) => {
    console.log("-----useDialogInput lastMessage", newMessage)
  })

  return {
    updateInputText,
    inputMessageContent,
    inputContentItems,
    addInputItems,
    inputEmpty,
  }
}
