import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useRoute } from "vue-router"

import { useUserDataStore } from "@/shared/store"

import { useAssistantsStore } from "@/features/assistants/store"
import { useWorkspacesStore } from "@/features/workspaces/store"

/**
 * Returns the active workspace and assistant, if no workspace is selected, the default workspace is used
 * @returns {Object} - The active workspace and assistant
 * @returns {WorkspaceMapped} workspace - The active workspace
 * @returns {AssistantMapped} assistant - The active assistant
 */
export function useActiveWorkspace () {
  const route = useRoute()
  const { data: userData } = storeToRefs(useUserDataStore())
  const workspacesStore = useWorkspacesStore()
  const { assistants } = storeToRefs(useAssistantsStore())
  const routeWorkspaceId = computed(() => route.params.workspaceId as string)
  const workspaceId = computed(() =>
    workspacesStore.isLoaded
      ? routeWorkspaceId.value ||
        userData.value.lastWorkspaceId ||
        workspacesStore.workspaces?.[0]?.id
      : null
  )
  const workspace = computed(() =>
    workspacesStore.workspaces
      ? workspacesStore.workspaces.find(
        (workspace) => workspace.id === workspaceId.value
      )
      : null
  )
  const workspaceAssistantId = computed(
    () => userData.value.defaultAssistantIds[workspaceId.value]
  )
  const defaultAssistant = computed(() =>
    assistants.value.find((assistant) => !assistant.workspace_id)
  )
  const assistant = computed(
    () =>
      assistants.value.find(
        (assistant) => assistant.id === workspaceAssistantId.value
      ) || defaultAssistant.value
  )
  const lastDialogId = computed(
    () => userData.value.lastDialogIds[workspaceId.value]
  )

  return { workspace, assistant, lastDialogId, workspaceId }
}
