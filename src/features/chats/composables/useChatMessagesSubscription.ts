import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"
import { useProfileStore } from "@/features/profile/store"

import { supabase } from "@/services/data/supabase/client"
import { ChatMessage } from "@/services/data/types/chat"
import { Profile } from "@/services/data/types/profile"

// Cache for sender profiles
const profileCache = new Map<string, Profile | null>()

// Subscription reference
let subscription: ReturnType<typeof supabase.channel> | null = null

/**
 * Subscribes to all new messages (INSERT events on messages table).
 * Messages are stored in a Record keyed by chat_id.
 * Optionally, a callback can be provided to handle each new message.
 */
export function useChatMessagesSubscription (
  onNewMessage: (message: ChatMessage) => void
) {
  const { fetchProfile } = useProfileStore()
  // Subscribe only once
  const subscribe = () => {
    if (!subscription) {
      subscription = supabase
        .channel("all-messages")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          async (payload) => {
            const message = payload.new as ChatMessage
            // Fetch sender profile with cache
            const profile = await fetchProfile(message.senderId)
            profileCache.set(message.senderId, profile)
            message.sender = profile as Profile

            onNewMessage(message)
          }
        )
        .subscribe()
    }
  }

  function unsubscribe () {
    if (subscription) {
      subscription.unsubscribe()
      subscription = null
    }
  }

  subscribe()

  // Watch for currentUser changes
  useUserLoginCallback(async () => {
    unsubscribe()
    subscribe()
  })
}
