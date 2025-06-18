import { computed, Ref } from "vue"

import { useStorage } from "@/shared/composables/storage/useStorage"
import { ApiResultItem } from "@/shared/types"

import { UserMessageContent } from "@/features/dialogs/types"

import { DbMessageContentInsert, MessageContentNested } from "@/services/data/types/messageContents"
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
  const { updateMessage, lastMessageId, lastMessage } = useDialogMessages(dialogId)
  const storage = useStorage()

  /**
   * Updates the text content of the input message
   *
   * @param text - The new text content
   */
  async function updateInputText(text: string): Promise<void> {
    await updateMessage(
      lastMessageId.value,
      {
        // use shallow keyPath to avoid dexie's sync bug
        messageContents: [
          {
            ...inputMessageContent.value,
            text,
          },
        ] as MessageContentNested<DbMessageContentInsert>[],
        status: "inputing",
      }, true
    )
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
    const storedItemsResults = await storage.saveApiResultItems(items, { dialogId: dialogId.value, messageContentId: lastMessageId.value })

    await updateMessage(
      lastMessageId.value,
      {
        messageContents: [
          {
            ...inputMessageContent.value,
            storedItems: [
              ...inputMessageContent.value.storedItems,
              ...storedItemsResults,
            ],
          },
        ],
      }
    )
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

  /**
   * Whether the input message is empty (no text and no stored items)
   */
  const inputEmpty = computed<boolean>(
    () =>
      !inputMessageContent.value?.text &&
      !inputMessageContent.value?.storedItems.length
  )

  return {
    inputMessageId: lastMessageId,
    updateInputText,
    inputMessageContent,
    inputContentItems,
    addInputItems,
    inputEmpty,
  }
}
