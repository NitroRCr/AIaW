import { defineStore } from "pinia"
import { ref } from "vue"

import { useUserStore } from "@/shared/store"
import { ApiResultItem } from "@/shared/types"

import { useChatMessagesSubscription } from "@/features/chats/composables/useChatMessagesSubscription"
import { useStoredItemsStore } from "@/features/storedItems/store"

import { supabase } from "@/services/data/supabase/client"
import { ChatMessage, DbChatMessageInsert, mapChatMessageToDb, mapDbToChatMessage } from "@/services/data/types/chat"

import { useChatsStore } from "./index"

export const useChatMessagesStore = defineStore("chat-messages", () => {
  const chatsStore = useChatsStore()
  const userStore = useUserStore()
  const storedItemsStore = useStoredItemsStore()
  const messagesByChat = ref<Record<string, ChatMessage[]>>({})

  const onNewMessage = (message: ChatMessage) => {
    if (!messagesByChat.value[message.chatId]) {
      messagesByChat.value[message.chatId] = []
    }

    if (message.senderId !== userStore.currentUserId) {
      chatsStore.incrementUnreadCount(message.chatId)
    }

    messagesByChat.value[message.chatId].push(message)
  }

  useChatMessagesSubscription(onNewMessage)

  // TODO: improve to able to fetch messages with lazy loading
  const fetchMessages = async (chatId: string, offset = 0, limit = 100) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*, sender:profiles(*)")
      .eq("chat_id", chatId)
      // .gt('created_at', date)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit)

    if (error) {
      console.error("❌ Failed to fetch messages:", error.message)

      return
    }

    // TODO: temporary solution for lazy loading
    if (offset === 0) {
      messagesByChat.value[chatId] = data.map(mapDbToChatMessage)
    } else {
      messagesByChat.value[chatId].unshift(
        ...(data.map(mapDbToChatMessage))
      )
    }

    return data
  }

  const add = async (
    message: ChatMessage<DbChatMessageInsert>,
    items: ApiResultItem[]
  ) => {
    const { data, error } = await supabase.from("messages").insert(mapChatMessageToDb(message) as DbChatMessageInsert).select().single()

    if (error) {
      console.error("❌ Failed to add message:", error.message)
      throw error
    }

    if (items.length > 0) {
      await Promise.all(items.map(async (item) => {
        await storedItemsStore.createAndUpload({ messageId: data.id }, item)
      }))
    }

    return data
  }

  return {
    messagesByChat,
    fetchMessages,
    add,
  }
})
