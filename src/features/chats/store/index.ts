import { throttle } from "lodash"
import { defineStore } from "pinia"
import { readonly, ref, watch } from "vue"

import { useUserStore } from "@/shared/store/user"

import { useChatsWithSubscription } from "@/features/chats/composables/useChatsWithSubscription"

import { supabase } from "@/services/supabase/client"
import { ChatMapped } from "@/services/supabase/types"

export const useChatsStore = defineStore("chats", () => {
  const { chats, isLoaded } = useChatsWithSubscription()
  const userStore = useUserStore()
  const isSaving = ref(false)
  const hasChanges = ref(false)

  watch(chats, () => {
    hasChanges.value = true
  }, { deep: true })

  const add = async (
    chat: Omit<ChatMapped, "id" | "created_at" | "updated_at" | "owner_id">
  ) => {
    isSaving.value = true
    console.log("addChat", chat)
    const { data, error } = await supabase
      .from("chats")
      .insert(chat)
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("error", error)
    }

    return data
  }

  const update = async (id: string, chat: Partial<ChatMapped>) => {
    isSaving.value = true

    const { data, error } = await supabase
      .from("chats")
      .update(chat)
      .eq("id", id)
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("error", error)
    }

    return data
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from("chats").delete().eq("id", id)

    if (error) {
      console.error("error", error)
      throw error
    }
  }

  const search = async (query: string, workspaceId: string | null) => {
    const queryBuilder = supabase.from("messages").select(`
        id,
        chat_id,
        content,
        chat:chats (
          workspace_id,
          name
        )
      `)

    if (workspaceId) {
      queryBuilder.eq("chats.workspace_id", workspaceId)
    }

    const { data, error } = await queryBuilder.textSearch("content", query)
    console.log("-- search chats error", error)

    return data
  }

  const throttleUpdate = throttle(update, 1000)

  const putItem = async (chat: Partial<ChatMapped>) => {
    if (chat.id) {
      throttleUpdate(chat.id, chat)
    } else {
      await add(
        chat as Omit<
          ChatMapped,
          "id" | "created_at" | "updated_at" | "owner_id"
        >
      )
    }
  }

  const startPrivateChatWith = async (targetUserId: string) => {
    const { data: chatId, error } = await supabase.rpc(
      "start_private_chat_with",
      {
        target_user_id: targetUserId,
        current_user_id: userStore.currentUserId,
      }
    )

    if (error) {
      console.error("error", error)
      throw error
    }

    return chatId
  }

  return {
    chats: readonly(chats),
    isLoaded,
    add,
    update,
    remove,
    search,
    putItem,
    startPrivateChatWith,
    isSaving,
    hasChanges,
  }
})
