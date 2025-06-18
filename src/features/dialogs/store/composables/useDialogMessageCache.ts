// Helpers and composable for updating nested dialogMessages cache
import { merge, omit } from 'lodash'
import { reactive } from 'vue'

import { DialogMessageNested, DialogMessageNestedUpdate } from '@/services/data/types/dialogMessage'
import { MessageContentNested, MessageContentNestedUpdate } from '@/services/data/types/messageContents'
import { StoredItem } from '@/services/data/types/storedItem'

/**
 * Composable for dialogMessages cache with helpers
 */
export function useDialogMessageCache() {
  const dialogMessages = reactive<Record<string, DialogMessageNested[]>>({})

  async function init(dialogId: string, items: DialogMessageNested[]) {
    dialogMessages[dialogId] = items
  }

  /**
   * Update or insert a DialogMessageNested in dialogMessages[dialogId] by id
   */
  function updateDialogMessage(dialogId: string, message: DialogMessageNested) {
    if (!dialogMessages[dialogId]) {
      dialogMessages[dialogId] = []
    }

    const idx = dialogMessages[dialogId].findIndex(m => m.id === message.id)

    if (idx !== -1) {
      dialogMessages[dialogId][idx] = message
    } else {
      dialogMessages[dialogId].push(message)
    }

    return message
  }

  /**
   * Update or insert a MessageContentNested in a DialogMessageNested by id
   */
  function updateMessageContent(dialogId: string, messageId: string, content: MessageContentNested) {
    const msg = dialogMessages[dialogId]?.find(m => m.id === messageId)

    if (!msg) throw new Error(`Message with id ${messageId} not found in dialog ${dialogId}`)

    if (!msg.messageContents) msg.messageContents = []

    const idx = msg.messageContents.findIndex(c => c.id === content.id)

    if (idx !== -1) {
      msg.messageContents[idx] = content
    } else {
      msg.messageContents.push(content)
    }

    return content
  }

  /**
   * Update or insert a StoredItem in a MessageContentNested by id
   */
  function updateStoredItem(dialogId: string, messageId: string, contentId: string, item: StoredItem) {
    const msg = dialogMessages[dialogId]?.find(m => m.id === messageId)

    if (!msg) throw new Error(`Message with id ${messageId} not found in dialog ${dialogId}`)

    const content = msg.messageContents?.find(c => c.id === contentId)

    if (!content) return

    if (!content.storedItems) content.storedItems = []

    const idx = content.storedItems.findIndex(i => i.id === item.id)

    if (idx !== -1) {
      content.storedItems[idx] = item
    } else {
      content.storedItems.push(item)
    }
  }

  /**
   * Remove a MessageContentNested from a DialogMessageNested by id
   */
  function removeMessageContent(dialogId: string, messageId: string, contentId: string) {
    const msg = dialogMessages[dialogId]?.find(m => m.id === messageId)

    if (!msg || !msg.messageContents) return

    msg.messageContents = msg.messageContents.filter(c => c.id !== contentId)
  }

  /**
   * Remove a StoredItem from a MessageContentNested by id
   */
  function removeStoredItem(dialogId: string, messageId: string, contentId: string, itemId: string) {
    const msg = dialogMessages[dialogId]?.find(m => m.id === messageId)

    if (!msg) return

    const content = msg.messageContents?.find(c => c.id === contentId)

    if (!content || !content.storedItems) return

    content.storedItems = content.storedItems.filter(i => i.id !== itemId)
  }

  function mergeDialogMessage(dialogId: string, message: DialogMessageNestedUpdate, omitFields: string[] = []) {
    const idx = dialogMessages[dialogId].findIndex(m => m.id === message.id)

    if (idx !== -1) {
      dialogMessages[dialogId][idx] = merge(dialogMessages[dialogId][idx], omit(message, omitFields))
    } else {
      dialogMessages[dialogId].push(message as DialogMessageNested)
    }

    return omit(dialogMessages[dialogId][idx], omitFields)
  }

  function mergeMessageContent(dialogId: string, messageId: string, messageContent: MessageContentNestedUpdate, omitFields: string[] = []) {
    const msg = dialogMessages[dialogId]?.find(m => m.id === messageId)

    if (!msg) throw new Error(`MergeMessageContent: Message with id ${messageId} not found in dialog ${dialogId}`)

    const idx = msg.messageContents?.findIndex(c => c.id === messageContent.id)

    if (idx === -1) {
      msg.messageContents.push(messageContent as MessageContentNested)

      return omit(messageContent, omitFields)
    }

    msg.messageContents[idx] = merge(msg.messageContents[idx], omit(messageContent, omitFields))

    return msg.messageContents[idx]
  }

  function getDialogMessage(dialogId: string, messageId: string) {
    return dialogMessages[dialogId].find(m => m.id === messageId)
  }

  function getDialogMessageContent(dialogId: string, messageId: string, contentId: string) {
    const msg = dialogMessages[dialogId]?.find(m => m.id === messageId)

    return msg?.messageContents?.find(c => c.id === contentId)
  }

  return {
    dialogMessages,
    cache: {
      updateDialogMessage,
      updateMessageContent,
      updateStoredItem,
      removeMessageContent,
      removeStoredItem,
      init,
      mergeDialogMessage,
      mergeMessageContent,
      getDialogMessage,
      getDialogMessageContent
    }
  }
}
