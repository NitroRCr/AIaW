import { computed } from "vue"

import { useWorkspacesStore } from "@/features/workspaces/store"

import { Workspace } from "@/services/data/types/workspace"

export function useRootWorkspace (parentId: string | null) {
  const workspaceStore = useWorkspacesStore()

  return computed<Workspace[]>(
    () =>
      workspaceStore.workspaces.filter(
        (workspace) => workspace.parentId === parentId
      ) as Workspace[]
  )
}
