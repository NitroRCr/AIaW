import { LanguageModelUsage } from "ai"
import merge from "lodash/merge"
import { defineStore } from "pinia"
import { reactive } from "vue"

import { supabase } from "@/services/supabase/client"
import {
  DialogMessageMapped,
  MessageContentMapped,
  StoredItemMapped,
  DialogMessageInput,

} from "@/services/supabase/types"

const SELECT_DIALOG_MESSAGES = "*, message_contents(*, stored_items(*))"

const mapDialogMessage = (message): DialogMessageMapped => {
  return {
    ...message,
    usage: message.usage as LanguageModelUsage,
  }
}

export const useDialogMessagesStore = defineStore("dialogMessages", () => {
  const dialogMessages = reactive<Record<string, DialogMessageMapped[]>>({})

  async function fetchDialogMessages(dialogId: string) {
    const { data, error } = await supabase
      .from("dialog_messages")
      .select(SELECT_DIALOG_MESSAGES)
      .eq("dialog_id", dialogId)

    if (error) {
      console.error(error)
    }

    if (data) {
      dialogMessages[dialogId] = data.map(mapDialogMessage)
    } else {
      dialogMessages[dialogId] = []
    }

    return dialogMessages[dialogId]
  }

  async function addDialogMessage(
    dialogId: string,
    parentId: string | null,
    message: DialogMessageInput,
  ) {
    const { message_contents, ...messageInput } = message

    // 1. create dialog message
    const { data: dialogMessage, error } = await supabase
      .from("dialog_messages")
      .insert({ ...messageInput, dialog_id: dialogId, parent_id: parentId })
      .select(SELECT_DIALOG_MESSAGES)
      .single<DialogMessageMapped>()
    console.log("-- addDialogMessage", dialogMessage)

    if (error) {
      console.error(error)
      throw error
    }

    // 2. create message contents
    for (const content of message_contents) {
      const { stored_items = [], id, ...contentInput } = content
      const { data: contentData, error: contentError } = await supabase
        .from("message_contents")
        .insert({ ...contentInput, message_id: dialogMessage.id })
        .select("*, stored_items(*)")
        .single()

      if (contentError) {
        console.error(contentError)
        throw contentError
      }

      const messageContent = contentData as MessageContentMapped
      // 3. create stored items
      for (const item of stored_items) {
        const { data: itemData, error: itemError } = await supabase
          .from("stored_items")
          .insert({
            ...item,
            message_content_id: contentData.id,
            dialog_id: dialogId,
          })
          .select()
          .single()

        if (itemError) {
          console.error(itemError)
          throw itemError
        }

        messageContent.stored_items.push(itemData as StoredItemMapped)
      }
      dialogMessage.message_contents.push(messageContent)
    }

    if (!dialogMessages[dialogId]) {
      dialogMessages[dialogId] = []
    }

    dialogMessages[dialogId].push(dialogMessage)

    return dialogMessage
  }

  async function switchActiveDialogMessage(dialogId: string, activeMessageId: string, siblingMessageIds: string[]) {
    const { error: activeMessageError } = await supabase
      .from("dialog_messages")
      .select("*")
      .eq("id", activeMessageId)
      .eq("dialog_id", dialogId)
      .single()

    if (activeMessageError) {
      console.error(activeMessageError)
      throw activeMessageError
    }

    const { error: restMessagesError } = await supabase
      .from("dialog_messages")
      .update({ is_active: false })
      .in("id", siblingMessageIds.filter((id) => id !== activeMessageId))
      .eq("dialog_id", dialogId)

    if (restMessagesError) {
      console.error(restMessagesError)
      throw restMessagesError
    }

    dialogMessages[dialogId] = dialogMessages[dialogId].map((m) =>
      siblingMessageIds.includes(m.id) ? { ...m, is_active: m.id === activeMessageId } : m
    )
  }

  async function updateDialogMessage(
    dialogId: string,
    messageId: string,
    message: Partial<DialogMessageInput>
  ) {
    let dialogMessage = merge(
      dialogMessages[dialogId].find((m) => m.id === messageId) || {},
      message
    ) as DialogMessageMapped
    const shouldSave =
      dialogMessage.status &&
      !["streaming", "inputing", "pending"].includes(dialogMessage.status)

    if (!shouldSave) {
      dialogMessages[dialogId] = dialogMessages[dialogId].map((m) =>
        m.id === messageId ? dialogMessage : m
      )

      return
    }

    const { message_contents, ...messageInput } = dialogMessage
    console.log("-----updateDialogMessage: 1. message_contents", message_contents)

    if (Object.keys(messageInput).length > 0) {
      const { data, error } = await supabase
        .from("dialog_messages")
        .update(messageInput)
        .eq("id", messageId)
        .eq("dialog_id", dialogId)
        .select(SELECT_DIALOG_MESSAGES)
        .single()

      if (error) {
        console.error(error)
        throw error
      }

      dialogMessage = merge(mapDialogMessage(data), dialogMessage)
    }

    console.log("-----updateDialogMessage: 2. message_contents", dialogMessage.message_contents)

    for (const content of dialogMessage.message_contents) {
      const { stored_items = [], ...contentInput } = content
      let messageContent = content as MessageContentMapped

      if (content.id) {
        const { data: contentData, error: contentError } = await supabase
          .from("message_contents")
          .update({ ...contentInput, message_id: dialogMessage.id })
          .eq("id", content.id)
          .select("*, stored_items(*)")
          .single()

        if (contentError) {
          console.error(contentError)
          throw contentError
        }

        messageContent = contentData as MessageContentMapped
      } else {
        const { data: contentData, error: contentError } = await supabase
          .from("message_contents")
          .insert({ ...contentInput, message_id: dialogMessage.id })
          .select("*, stored_items(*)")
          .single()

        if (contentError) {
          console.error(contentError)
          throw contentError
        }

        messageContent = contentData as MessageContentMapped
      }

      for (const item of stored_items) {
        if (item.id) {
          const { data: itemData, error: itemError } = await supabase
            .from("stored_items")
            .update({
              ...item,
              message_content_id: messageContent.id,
              dialog_id: dialogId,
            })
            .eq("id", item.id)
            .select()
            .single()

          if (itemError) {
            console.error(itemError)
            throw itemError
          }

          console.log("-----updateDialogMessage: update stored item", itemData)
          messageContent.stored_items.map((i) =>
            i.id === item.id ? (itemData as StoredItemMapped) : i
          )
        } else {
          const { data: itemData, error: itemError } = await supabase
            .from("stored_items")
            .insert({
              ...item,
              message_content_id: messageContent.id,
              dialog_id: dialogId,
            })
            .select()
            .single()

          if (itemError) {
            console.error(itemError)
            throw itemError
          }

          console.log("-----updateDialogMessage: add stored item", itemData)
          messageContent.stored_items.push(itemData as StoredItemMapped)
        }
      }

      dialogMessage.message_contents = dialogMessage.message_contents.map(
        (c) => (c.id === messageContent.id ? messageContent : c)
      )
    }
    dialogMessages[dialogId] = dialogMessages[dialogId].map((m) =>
      m.id === messageId ? dialogMessage : m
    )
  }

  async function removeDialogMessage(dialogId: string, messageId: string) {
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

  async function removeStoredItem(stored_item: StoredItemMapped) {
    // TODO: remove stored item from dialog messages, with message_content_id or without
    const { error } = await supabase
      .from("stored_items")
      .delete()
      .eq("id", stored_item.id)

    if (error) {
      console.error(error)
      throw error
    }

    dialogMessages[stored_item.dialog_id] = dialogMessages[
      stored_item.dialog_id
    ].map((m) =>
      m.id === stored_item.message_content_id
        ? {
            ...m,
            message_contents: m.message_contents.map((c) =>
              c.id === stored_item.message_content_id
                ? {
                    ...c,
                    stored_items: c.stored_items.filter(
                      (i) => i.id !== stored_item.id
                    ),
                  }
                : c
            ),
          }
        : m
    )
  }

  return {
    dialogMessages,
    fetchDialogMessages,
    addDialogMessage,
    updateDialogMessage,
    removeDialogMessage,
    removeStoredItem,
    switchActiveDialogMessage,
    // messageMap
  }
})
