import { storeToRefs } from "pinia"

import { useUserStore } from "@/shared/store"

import { useWorkspacesStore } from "@/features/workspaces/store"

export const useRightsManagement = () => {
  const workspaceStore = useWorkspacesStore()

  const { currentUserId } = storeToRefs(useUserStore())

  const isUserWorkspaceAdmin = (workspaceId: string | null) => {
    if (!workspaceId || !currentUserId.value) return false

    return ["admin", "owner"].includes(
      workspaceStore.isUserWorkspaceRole(workspaceId, currentUserId.value)
    )
  }

  return {
    isUserWorkspaceAdmin,
  }
}
