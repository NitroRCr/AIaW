import { computed } from "vue"

import { useUserStore } from "@/shared/store"

import { useWorkspacesStore } from "@/features/workspaces/store"

import { Workspace } from "@/services/data/types/workspace"

export function useRootWorkspace (parentId: string | null) {
  const workspaceStore = useWorkspacesStore()
  const userStore = useUserStore()

  return computed<Workspace[]>(() => {
    // If no user is logged in, return empty array
    if (!userStore.currentUserId) {
      return []
    }

    // Get workspaces the user has access to
    const userAccessibleWorkspaces = workspaceStore.getUserAccessibleWorkspaces(userStore.currentUserId)
    const accessibleWorkspaceIds = new Set(userAccessibleWorkspaces.map(uw => uw.workspaceId))

    // Filter by both user access and parent ID
    return workspaceStore.workspaces.filter(
      (workspace) =>
        workspace.parentId === parentId &&
        accessibleWorkspaceIds.has(workspace.id)
    ) as Workspace[]
  })
}
