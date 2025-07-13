import { defineStore } from "pinia"

import { ApiResultItem } from "@/shared/types"

import { useStoredItemsStore } from "@/features/storedItems/store"

import { supabase } from "@/services/data/supabase/client"
import { DbDialogMessageUpdate, mapDbToDialogMessageNested, mapDialogMessageToDb, DialogMessageNested, DialogMessage, DialogMessageNestedUpdate } from "@/services/data/types/dialogMessage"
import { DbMessageContentInsert, DbMessageContentUpdate, mapDbToMessageContentNested, mapMessageContentToDb, MessageContentNested, MessageContentNestedUpdate } from "@/services/data/types/messageContents"
import { DbStoredItemInsert, DbStoredItemUpdate, StoredItem } from "@/services/data/types/storedItem"

import { useDialogMessageCache } from "./composables/useDialogMessageCache"

type UpdateSingleEntityParams = {
  dialogId: string
  messageId: string
  message?: DialogMessageNestedUpdate
  messageContent?: MessageContentNestedUpdate
  storedItem?: StoredItem
  cacheOnly?: boolean
}
/**
 * Store for managing dialog messages in AI conversations
 *
 * This store handles:
 * - Fetching, creating, updating, and deleting dialog messages
 * - Managing message content and stored items within messages
 * - Tracking message state (active, streaming, complete)
 * - Organizing messages by dialog
 *
 * Dialog messages represent the individual messages within an AI conversation,
 * including both user inputs and AI responses, along with any attachments or
 * generated content.
 *
 * @dependencies
 * - No direct store dependencies, but works closely with useDialogsStore
 *
 * @database
 * - Table: "dialog_messages" - Stores message metadata and relationships
 * - Table: "message_contents" - Stores actual message content
 * - Table: "stored_items" - Stores attachments and generated files
 *
 * @related
 * - Used by {@link useDialogMessages} composable for message operations
 * - Used by {@link useLlmDialog} for managing conversation flow
 */
export const useDialogMessagesStore = defineStore("dialogMessages", () => {
  const { dialogMessages, cache } = useDialogMessageCache()
  const storeItemsStore = useStoredItemsStore()

  async function fetchDialogMessages(dialogId: string) {
    const { data, error } = await supabase
      .from("dialog_messages")
      .select("*, message_contents(*, stored_items(*))")
      .eq("dialog_id", dialogId)

    if (error) {
      console.error(error)
    }

    cache.init(dialogId, (data || []).map(mapDbToDialogMessageNested))

    return dialogMessages[dialogId]
  }

  // Insert or update message content with stored items
  async function upsertMessageContent<T extends MessageContentNested<DbMessageContentUpdate, DbStoredItemUpdate>>(dialogId: string, messageId: string, messageContent: T) {
    const { storedItems: _, ...messageContentRaw } = messageContent
    const dbItem = mapMessageContentToDb({ ...messageContentRaw, messageId })

    const { data, error } = await supabase.from("message_contents")
      .upsert(dbItem as DbMessageContentInsert)
      .select("*, stored_items(*)")
      .single()

    if (error) {
      console.error(error)
      throw error
    }

    const result = mapDbToMessageContentNested(data)
    cache.updateMessageContent(dialogId, messageId, result)

    return cache.getDialogMessageContent(dialogId, messageId, result.id)
  }

  // Insert or update stored item related to message content
  async function upsertStoredItem<T extends StoredItem<DbStoredItemInsert>>(dialogId: string, messageId: string, storedItem: T) {
    const result = await storeItemsStore.upsert(storedItem)

    cache.updateStoredItem(dialogId, messageId, result.messageContentId, result)

    return result
  }

  async function addDialogMessage(
    dialogId: string,
    parentId: string | null,
    message: DialogMessageNested<DbDialogMessageUpdate, DbMessageContentUpdate, DbStoredItemUpdate>,
  ) {
    const dialogMessage = await upsertDialogMessageNested(dialogId, { ...message, parentId })

    return dialogMessage
  }

  async function upsertDialogMessage(
    dialogId: string,
    message: DialogMessageNestedUpdate,
  ) {
    const { data, error } = await supabase.from("dialog_messages")
      .upsert(mapDialogMessageToDb({ ...message, dialogId }))
      .select("*, message_contents(*, stored_items(*))")
      .single()

    if (error) {
      console.error(error)
      throw error
    }

    const result = mapDbToDialogMessageNested(data)
    cache.updateDialogMessage(dialogId, result)

    return result
  }

  async function upsertDialogMessageNested<T extends DialogMessageNested<DbDialogMessageUpdate, DbMessageContentUpdate, DbStoredItemUpdate>>(
    dialogId: string,
    message: T,
  ) {
    const { messageContents, ...messageRaw } = message

    const result = await upsertDialogMessage(dialogId, messageRaw as DialogMessage)

    if (messageContents) {
      for (const content of messageContents) {
        await upsertMessageContent(dialogId, result.id, content)
      }
    }

    return cache.getDialogMessage(dialogId, result.id)
  }

  async function switchActiveDialogMessage(dialogId: string, activeMessageId: string, siblingMessageIds: string[]) {
    const { data: activeMessage, error: activeMessageError } = await supabase
      .from("dialog_messages")
      .update({ is_active: true })
      .eq("id", activeMessageId)
      .eq("dialog_id", dialogId)
      .select("*, message_contents(*, stored_items(*))")
      .single()

    cache.updateDialogMessage(dialogId, mapDbToDialogMessageNested(activeMessage))

    if (activeMessageError) {
      console.error(activeMessageError)
      throw activeMessageError
    }

    const { data: restMessages, error: restMessagesError } = await supabase
      .from("dialog_messages")
      .update({ is_active: false })
      .in("id", siblingMessageIds.filter((id) => id !== activeMessageId))
      .eq("dialog_id", dialogId)
      .select("*")

    if (restMessagesError) {
      console.error(restMessagesError)
      throw restMessagesError
    }

    restMessages.map((m) => cache.updateDialogMessage(dialogId, mapDbToDialogMessageNested(m)))
  }

  async function updateDialogMessageNested(
    dialogId: string,
    messageId: string,
    message: DialogMessageNestedUpdate,
    cacheOnly = false
  ) {
    const dialogMessage = cache.mergeDialogMessage(dialogId, { id: messageId, ...message })

    if (!cacheOnly) {
      await upsertDialogMessageNested(dialogId, dialogMessage)
    }
  }

  /**
   * Deletes a dialog message from the database
   * Uses the delete operation to permanently remove the message
   */
  async function deleteDialogMessage(dialogId: string, messageId: string) {
    const { error } = await supabase
      .from("dialog_messages")
      .delete()
      .eq("id", messageId)

    if (error) {
      console.error(error)
      throw error
    }

    // TO SYNC with CASCADE DELETE - refetch all dialog messages
    await fetchDialogMessages(dialogId)
  }

  async function addApiResult(dialogId: string, messageId: string, messageContentId: string, item: ApiResultItem) {
    const result = await storeItemsStore.createAndUpload({ messageContentId }, item)

    cache.updateStoredItem(dialogId, messageId, messageContentId, result)

    return result
  }

  /**
   * Deletes a stored item from the database
   * Uses the delete operation to permanently remove the stored item
   */
  async function deleteStoredItem(dialogId: string, messageId: string, storedItem: StoredItem) {
    await storeItemsStore.remove(storedItem)

    // in case if message wasn't applied to dialog(unsubmitted message), it not in cache and db
    if (storedItem.id) {
      cache.removeStoredItem(dialogId, messageId, storedItem.messageContentId, storedItem.id)
    }
  }

  // to update single entity WITHOUT nested entities
  const upsertSingleEntity = async (entity: UpdateSingleEntityParams) => {
    const result: Partial<UpdateSingleEntityParams> = {}
    const { dialogId, messageId, message, messageContent, storedItem, cacheOnly } = entity

    if (message) {
      const plainMessage = cache.mergeDialogMessage(dialogId, message, ["messageContents"])

      if (!cacheOnly) {
        await upsertDialogMessage(dialogId, plainMessage)
      }

      result.message = cache.getDialogMessage(dialogId, messageId)
    }

    if (messageContent) {
      // TODO: can we omit storedItems here? possible bug

      if (!cacheOnly) {
        result.messageContent = await upsertMessageContent(dialogId, messageId, messageContent)
      } else {
        result.messageContent = cache.mergeMessageContent(dialogId, messageId, messageContent)
      }
    }

    if (entity.storedItem) {
      result.storedItem = await upsertStoredItem(dialogId, messageId, storedItem)
    }

    return result
  }

  return {
    dialogMessages,
    fetchDialogMessages,
    addDialogMessage,
    updateDialogMessageNested,
    deleteDialogMessage,
    deleteStoredItem,
    switchActiveDialogMessage,
    upsertSingleEntity,
    addApiResult
  }
})
