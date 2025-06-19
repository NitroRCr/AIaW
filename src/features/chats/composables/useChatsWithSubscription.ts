import { ref, readonly, watch } from "vue"

import { useUserStore } from "@/shared/store"
import type { Avatar } from "@/shared/types"
import { mapAvatarOrDefault } from "@/shared/utils/avatar"
import { defaultTextAvatar } from "@/shared/utils/functions"

import { supabase } from "@/services/data/supabase/client"
import { mapDbToChat, type Chat } from "@/services/data/types/chat"
import { mapDbToUserProfile } from "@/services/data/types/profile"
const chats = ref<Chat[]>([])
let isSubscribed = false
let subscription: ReturnType<typeof supabase.channel> | null = null

async function extendChatsWithDisplayName (
  chatsArr: Chat[],
  currentUserId: string | null
) {
  // For each chat, if not group, fetch members and set displayName
  const extended = await Promise.all(
    chatsArr.map(async (chat) => {
      if (chat.type === "workspace") {
        return mapAvatarOrDefault(chat, chat.name)
      } else {
        // TODO: cache profiles
        // Fetch chat members with profile
        const { data: members, error } = await supabase
          .from("chat_members")
          .select("user_id, profile:profiles(name,avatar)")
          .eq("chat_id", chat.id)

        if (error || !members) {
          return { ...chat, name: "no members" }
        }

        // Find first member that is not myself
        const other = members.map(mapDbToUserProfile).find((m: any) => m.userId !== currentUserId)
        const displayName = other?.profile?.name || chat.name || ""

        return {
          ...chat,
          name: displayName,
          avatar:
            (other?.profile?.avatar as Avatar) ||
            defaultTextAvatar(displayName),
        }
      }
    })
  )

  return extended
}

async function fetchChats (currentUserId: string | null) {
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("❌ Failed to fetch chats:", error.message)

    return
  }

  chats.value = await extendChatsWithDisplayName(
    data.map(mapDbToChat),
    currentUserId
  )
}

function subscribeToChats (currentUserId: string | null) {
  if (isSubscribed) return

  isSubscribed = true
  subscription = supabase
    .channel("chats-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "chats",
      },
      async (payload) => {
        // On insert, extend with displayName
        const extended = await extendChatsWithDisplayName(
          [mapDbToChat(payload.new)],
          currentUserId
        )
        chats.value.unshift(extended[0])
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "chats",
      },
      (payload) => {
        const deletedId = (payload.old as Chat).id
        chats.value = chats.value.filter((c) => c.id !== deletedId)
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "chats",
      },
      async (payload) => {
        const extended = await extendChatsWithDisplayName(
          [mapDbToChat(payload.new)],
          currentUserId
        )
        chats.value = chats.value.map((c) =>
          c.id === extended[0].id ? extended[0] : c
        )
      }
    )
    .subscribe()
}

function unsubscribeFromChats () {
  if (subscription) {
    subscription.unsubscribe()
    subscription = null
  }

  isSubscribed = false
}

export function useChatsWithSubscription () {
  const userStore = useUserStore()
  const isLoaded = ref(false)
  const init = async () => {
    chats.value = []
    isLoaded.value = false
    await fetchChats(userStore.currentUserId)
    subscribeToChats(userStore.currentUserId)
    isLoaded.value = true
  }

  // Initial fetch and subscribe
  if (!isSubscribed) {
    init()
  }

  // Watch for currentUser changes
  watch(
    () => userStore.currentUserId,
    (newId, oldId) => {
      if (newId !== oldId) {
        unsubscribeFromChats()
        init()
      }
    }
  )

  return {
    chats: readonly(chats),
    isLoaded,
  }
}
