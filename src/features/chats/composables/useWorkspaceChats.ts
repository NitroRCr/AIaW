import { computed, Ref } from "vue"

import { useChatsStore } from "@/features/chats/store"

import { ChatMapped } from "@/services/supabase/types"

export function useWorkspaceChats (workspaceId: Ref<string | null>) {
  const chatsStore = useChatsStore()
  const chats = computed<readonly ChatMapped[]>(() =>
    workspaceId.value
      ? chatsStore.chats.filter(
        (chat) =>
          chat.workspace_id === workspaceId.value || chat.type === "private"
      )
      : chatsStore.chats
  )

  const addChat = async (chat: Partial<ChatMapped>) => {
    await chatsStore.add({ ...chat, workspace_id: workspaceId.value })
  }
  const updateChat = async (id: string, chat: Partial<ChatMapped>) => {
    await chatsStore.update(id, { ...chat, workspace_id: workspaceId.value })
  }
  const removeChat = async (id: string) => {
    await chatsStore.remove(id)
  }

  return {
    chats,
    addChat,
    updateChat,
    removeChat,
  }
}
