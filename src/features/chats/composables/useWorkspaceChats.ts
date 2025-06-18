import { computed, Ref } from "vue"

import { useChatsStore } from "@/features/chats/store"

import { Chat } from "@/services/data/types/chat"

export function useWorkspaceChats (workspaceId: Ref<string | null>) {
  const chatsStore = useChatsStore()
  const chats = computed<readonly Chat[]>(() =>
    workspaceId.value
      ? chatsStore.chats.filter(
        (chat) =>
          chat.workspaceId === workspaceId.value || chat.type === "private"
      )
      : chatsStore.chats
  )

  const addChat = async (chat: Partial<Chat>) => {
    await chatsStore.add({ ...chat, workspaceId: workspaceId.value })
  }
  const updateChat = async (id: string, chat: Partial<Chat>) => {
    await chatsStore.update(id, { ...chat, workspaceId: workspaceId.value })
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
