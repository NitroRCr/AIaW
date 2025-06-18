import { defineStore } from "pinia"
import { ref } from "vue"

import { useChatMessagesSubscription } from "@/features/chats/composables/useChatMessagesSubscription"

import { supabase } from "@/services/supabase/client"
import { ChatMessage, ChatMessageWithProfile } from "@/services/supabase/types"

export const useChatMessagesStore = defineStore("chat-messages", () => {
  const messagesByChat = ref<Record<string, ChatMessageWithProfile[]>>({})

  const onNewMessage = (message: ChatMessageWithProfile) => {
    if (!messagesByChat.value[message.chat_id]) {
      messagesByChat.value[message.chat_id] = []
    }

    messagesByChat.value[message.chat_id].push(message)
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
      messagesByChat.value[chatId] = data as ChatMessageWithProfile[]
    } else {
      messagesByChat.value[chatId].unshift(
        ...(data as ChatMessageWithProfile[])
      )
    }

    return data
  }

  const add = async (
    message: Omit<ChatMessage, "id" | "created_at" | "updated_at">
  ) => {
    const { data, error } = await supabase.from("messages").insert({
      chat_id: message.chat_id,
      sender_id: message.sender_id,
      content: message.content,
    })

    if (error) {
      console.error("❌ Failed to add message:", error.message)
      throw error
    }

    return data
  }

  return {
    messagesByChat,
    fetchMessages,
    add,
  }
})
