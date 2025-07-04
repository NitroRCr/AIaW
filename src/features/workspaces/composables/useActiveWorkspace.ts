import { storeToRefs } from "pinia"
import { computed } from "vue"
import { useRoute } from "vue-router"

import { useUserDataStore } from "@/shared/store"

import { useAssistantsStore } from "@/features/assistants/store"
import { useUserWorkspacesManager, hasUserWorkspaceAccess, findUserWorkspace } from "@/features/workspaces/composables/useUserWorkspacesManager"

/**
 * Returns the active workspace and assistant, if no workspace is selected, the default workspace is used
 * Only returns workspaces that the current user has access to
 * @returns {Object} - The active workspace and assistant
 * @returns {Workspace} workspace - The active workspace (only if user has access)
 * @returns {Assistant} assistant - The active assistant
 */
export function useActiveWorkspace () {
  const route = useRoute()
  const { data: userData } = storeToRefs(useUserDataStore())
  const { assistants } = storeToRefs(useAssistantsStore())
  const { currentUserWorkspaces, loading } = useUserWorkspacesManager()

  const routeWorkspaceId = computed(() => route.params.workspaceId as string)

  const workspaceId = computed(() => {
    // Wait for user workspaces to load
    if (loading.value) return null

    const routeId = routeWorkspaceId.value
    const lastId = userData.value.lastWorkspaceId
    const firstAccessibleId = currentUserWorkspaces.value[0]?.workspaceId

    // Validate that the user has access to the workspace using utility function
    const hasAccessToRoute = routeId && hasUserWorkspaceAccess(currentUserWorkspaces.value, routeId)
    const hasAccessToLast = lastId && hasUserWorkspaceAccess(currentUserWorkspaces.value, lastId)

    return hasAccessToRoute ? routeId
      : hasAccessToLast ? lastId
        : firstAccessibleId || null
  })

  const workspace = computed(() => {
    if (!workspaceId.value) return null

    // Use utility function to find user workspace
    const userWorkspace = findUserWorkspace(currentUserWorkspaces.value, workspaceId.value)

    return userWorkspace?.workspace || null
  })

  const workspaceAssistantId = computed(
    () => userData.value.defaultAssistantIds[workspaceId.value]
  )
  const defaultAssistant = computed(() =>
    assistants.value.find((assistant) => !assistant.workspaceId)
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
