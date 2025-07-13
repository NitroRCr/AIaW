import { computed, Ref } from "vue"

import { ApiResultItem } from "@/shared/types"

import { UserMessageContent } from "@/features/dialogs/types"

import { StoredItem } from "@/services/data/types/storedItem"

import { useDialogMessages } from "./useDialogMessages"

/**
 * Composable for managing input in a dialog
 *
 * Provides utilities for managing the input message content in a dialog,
 * including updating text and adding stored items.
 *
 * @param dialogId - Reference to the dialog ID
 * @returns Object with functions and computed properties for managing dialog input
 */
export const useDialogInput = (
  dialogId: Ref<string>,
) => {
  const { upsertSingleEntity, addApiResultStoredItem, lastMessageId, lastMessage } = useDialogMessages(dialogId)

  /**
   * Updates the text content of the input message
   *
   * @param text - The new text content
   */
  async function updateInputText(text: string): Promise<void> {
    await upsertSingleEntity({
      dialogId: dialogId.value,
      messageId: lastMessageId.value,
      messageContent: {
        id: inputMessageContent.value.id,
        text,
      },
      cacheOnly: true,
    })
  }

  /**
   * Adds items to the input message's stored items
   *
   * Converts API result items to stored items and adds them to the
   * input message.
   *
   * @param items - API result items to add
   */
  async function addInputItems(items: ApiResultItem[]): Promise<void> {
    await Promise.all(items.map(async (item) => {
      await addApiResultStoredItem(lastMessageId.value, inputMessageContent.value.id, item)
    }))
  }

  /**
   * The content of the input message
   */
  const inputMessageContent = computed(
    () => lastMessage.value?.messageContents[0] as UserMessageContent
  )

  /**
   * The stored items in the input message
   */
  const inputContentItems = computed<StoredItem[]>(
    () => inputMessageContent.value?.storedItems || []
  )

  return {
    inputMessageId: lastMessageId,
    updateInputText,
    inputMessageContent,
    inputContentItems,
    addInputItems,
  }
}
