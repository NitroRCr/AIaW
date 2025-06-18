import { ref, readonly } from "vue"

import { Avatar } from "@/shared/utils/types"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/supabase/client"
import type { Workspace, WorkspaceMapped } from "@/services/supabase/types"

export function mapWorkspaceTypes (item: Workspace): WorkspaceMapped {
  const { avatar, ...rest } = item

  return {
    avatar: (avatar ?? { type: "text", text: item.name.slice(0, 1) }) as Avatar,
    ...rest,
  } as WorkspaceMapped
}

const workspaces = ref<WorkspaceMapped[]>([])
let isSubscribed = false
let subscription: ReturnType<typeof supabase.channel> | null = null
const isLoaded = ref(false)

async function fetchWorkspaces () {
  if (isLoaded.value) return

  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("❌ Failed to fetch chats:", error.message)

    return
  }

  workspaces.value = data.map((w) => mapWorkspaceTypes(w as Workspace))
  isLoaded.value = true
}

function subscribeToWorkspaces () {
  if (isSubscribed) return

  isSubscribed = true

  subscription = supabase
    .channel("workspaces-realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "workspaces",
      },
      async (payload) => {
        workspaces.value.unshift(mapWorkspaceTypes(payload.new as Workspace))
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "workspaces",
      },
      (payload) => {
        const deletedId = (payload.old as Workspace).id
        workspaces.value = workspaces.value.filter((c) => c.id !== deletedId)
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "workspaces",
      },
      async (payload) => {
        const updated = mapWorkspaceTypes(payload.new as Workspace)
        workspaces.value = workspaces.value.map((c) =>
          c.id === updated.id ? updated : c
        )
      }
    )
    .subscribe()
}

function unsubscribeFromWorkspaces () {
  if (subscription) {
    subscription.unsubscribe()
    subscription = null
  }

  isSubscribed = false
}

export function useWorkspacesWithSubscription () {
  // Watch for currentUser changes
  useUserLoginCallback(async () => {
    isLoaded.value = false
    unsubscribeFromWorkspaces()
    workspaces.value = []
    await fetchWorkspaces()
    subscribeToWorkspaces()
  })

  return {
    isLoaded,
    workspaces: readonly(workspaces),
  }
}
