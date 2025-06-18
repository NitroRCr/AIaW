import { ref, readonly } from "vue"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/data/supabase/client"
import { mapDbToWorkspace, Workspace, DbWorkspaceRow } from "@/services/data/types/workspace"

const workspaces = ref<Workspace[]>([])
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

  workspaces.value = data.map(mapDbToWorkspace)
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
        workspaces.value.unshift(mapDbToWorkspace(payload.new as DbWorkspaceRow))
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
        const deletedId = (payload.old as DbWorkspaceRow).id
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
        const updated = mapDbToWorkspace(payload.new as DbWorkspaceRow)
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
