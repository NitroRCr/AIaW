import { computed } from "vue"
import { useI18n } from "vue-i18n"

import { useUserStore } from "@/shared/store"

import { useWorkspacesStore } from "@/features/workspaces/store"

import { UserWorkspace } from "@/services/data/types/workspace"

/**
 * Utility function to check if user has access to a specific workspace
 */
export function hasUserWorkspaceAccess(
  userWorkspaces: UserWorkspace[],
  workspaceId: string
): boolean {
  return userWorkspaces.some(uw => uw.workspaceId === workspaceId)
}

/**
 * Utility function to find user workspace by workspace ID
 */
export function findUserWorkspace(
  userWorkspaces: UserWorkspace[],
  workspaceId: string
): UserWorkspace | undefined {
  return userWorkspaces.find(uw => uw.workspaceId === workspaceId)
}

/**
 * Composable for managing user workspaces
 * Provides user workspace specific operations and data access
 */
export function useUserWorkspacesManager() {
  const { t } = useI18n()
  const userStore = useUserStore()
  const workspacesStore = useWorkspacesStore()

  // Computed properties
  const currentUserId = computed(() => userStore.currentUserId)

  const userWorkspaces = computed(() => workspacesStore.userWorkspaces)

  const currentUserWorkspaces = computed(() => {
    if (!currentUserId.value) return []

    return workspacesStore.getUserAccessibleWorkspaces(currentUserId.value)
  })

  const loading = computed(() => !workspacesStore.isLoaded)

  // Methods
  async function fetchUserWorkspaces(userId?: string) {
    return await workspacesStore.getUserWorkspaces(userId)
  }

  async function fetchUserWorkspacesByUser(userId: string) {
    return await workspacesStore.getUserWorkspacesByUser(userId)
  }

  async function fetchUserWorkspacesByWorkspace(workspaceId: string) {
    return await workspacesStore.getUserWorkspacesByWorkspace(workspaceId)
  }

  function isUserInWorkspace(userId: string, workspaceId: string): boolean {
    return workspacesStore.isUserInWorkspace(userId, workspaceId)
  }

  function getUserAccessibleWorkspaces(userId: string): UserWorkspace[] {
    return workspacesStore.getUserAccessibleWorkspaces(userId)
  }

  async function removeUserFromWorkspace(workspaceId: string, userId: string) {
    return await workspacesStore.removeWorkspaceMember(workspaceId, userId)
  }

  async function addUserToWorkspace(workspaceId: string, userId: string, role: 'admin' | 'member' | 'guest' = 'member') {
    return await workspacesStore.addWorkspaceMember(workspaceId, userId, role)
  }

  // Data transformation for UI
  function transformForList(userWorkspaces: UserWorkspace[]) {
    return userWorkspaces.map(uw => ({
      id: `${uw.userId}-${uw.workspaceId}`,
      userId: uw.userId,
      workspaceId: uw.workspaceId,
      name: uw.workspace.name,
      description: uw.workspace.description || t('userWorkspaces.noDescription'),
      avatar: uw.workspace.avatar,
      profile: uw.profile,
      workspace: uw.workspace,
      // Additional UI properties
      subtitle: `${uw.profile.name} • ${uw.workspace.name}`,
      searchText: `${uw.profile.name} ${uw.workspace.name} ${uw.workspace.description || ''}`
    }))
  }

  // Action handlers
  async function handleRemoveAccess(item: any) {
    await removeUserFromWorkspace(item.workspaceId, item.userId)
  }

  async function handleViewWorkspace(item: any) {
    // TODO: Navigate to workspace - this would need router integration
    // router.push(`/workspaces/${item.workspaceId}`)
  }

  async function handleViewUser(item: any) {
    // TODO: Navigate to user profile - this would need router integration
    // router.push(`/users/${item.userId}`)
  }

  return {
    // State
    userWorkspaces,
    currentUserWorkspaces,
    loading,
    currentUserId,

    // Methods
    fetchUserWorkspaces,
    fetchUserWorkspacesByUser,
    fetchUserWorkspacesByWorkspace,
    isUserInWorkspace,
    getUserAccessibleWorkspaces,
    removeUserFromWorkspace,
    addUserToWorkspace,

    // UI helpers
    transformForList,
    handleRemoveAccess,
    handleViewWorkspace,
    handleViewUser,

    // Utility functions
    hasUserWorkspaceAccess: (workspaceId: string) =>
      hasUserWorkspaceAccess(currentUserWorkspaces.value, workspaceId),
    findUserWorkspace: (workspaceId: string) =>
      findUserWorkspace(currentUserWorkspaces.value, workspaceId)
  }
}
