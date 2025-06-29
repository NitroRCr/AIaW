import { useQuasar } from "quasar"
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"

import { useUserStore } from "@/shared/store"

import { useProfileStore } from "@/features/profile/store"
import { useWorkspacesStore } from "@/features/workspaces/store"

export function useWorkspaceManager() {
  const { t } = useI18n()
  const $q = useQuasar()

  const loading = ref(false)
  const adding = ref<Record<string, boolean>>({})
  const removing = ref<Record<string, boolean>>({})

  const userStore = useUserStore()
  const workspacesStore = useWorkspacesStore()
  const profileStore = useProfileStore()

  // Memoized workspace ownership check with proper dependency tracking
  const workspaceOwnershipMap = computed(() => {
    if (!userStore.currentUserId) return new Map()

    const ownershipMap = new Map<string, boolean>()
    workspacesStore.workspaces.forEach(workspace => {
      ownershipMap.set(workspace.id, workspace.ownerId === userStore.currentUserId)
    })

    return ownershipMap
  })

  // Memoized last member check with proper dependency tracking
  const lastMemberMap = computed(() => {
    const memberMap = new Map<string, boolean>()
    Object.entries(workspacesStore.workspaceMembers).forEach(([workspaceId, members]) => {
      memberMap.set(workspaceId, members.length === 1)
    })

    return memberMap
  })

  // Optimized method to get owner name with memoization
  const getOwnerName = computed(() => {
    return (workspace: any): string => {
      if (!workspace.ownerId) return t('common.unknown')

      const ownerProfile = profileStore.profiles[workspace.ownerId]

      return ownerProfile?.name || t('common.unknown')
    }
  })

  // Check if user is owner of a workspace - now using memoized map
  function isWorkspaceOwner(workspace: any): boolean {
    return workspaceOwnershipMap.value.get(workspace.id) || false
  }

  // Check if user is the last member in a workspace - now using memoized map
  function isLastMember(workspaceId: string): boolean {
    return lastMemberMap.value.get(workspaceId) || false
  }

  // Get current user's workspaces with optimized dependency tracking
  const myWorkspaces = computed(() => {
    // Early return if no user - prevents unnecessary computation
    if (!userStore.currentUserId) return []

    // Cache the user ID to avoid repeated access
    const currentUserId = userStore.currentUserId

    // Get joined workspaces with optimized mapping
    const joinedWorkspaces = workspacesStore.getUserAccessibleWorkspaces(currentUserId)
      .map(uw => {
        const workspace = uw.workspace
        const isOwner = workspaceOwnershipMap.value.get(workspace.id) || false
        const isLast = lastMemberMap.value.get(workspace.id) || false

        return {
          ...workspace,
          isJoined: true,
          isOwned: isOwner,
          // If user is owner and last member, show delete action, otherwise show leave action
          actionType: (isOwner && isLast) ? 'delete' : 'leave'
        }
      })

    return joinedWorkspaces
  })

  // Memoized set of my workspace IDs for efficient lookup
  const myWorkspaceIds = computed(() => {
    return new Set(myWorkspaces.value.map(w => w.id))
  })

  // Get all available workspaces with optimized filtering
  const availableWorkspaces = computed(() => {
    // Early return if no user
    if (!userStore.currentUserId) return []

    const myIds = myWorkspaceIds.value
    const ownershipMap = workspaceOwnershipMap.value

    return workspacesStore.workspaces
      .filter(workspace =>
        !myIds.has(workspace.id) &&
        workspace.isPublic &&
        !ownershipMap.get(workspace.id)
      )
      .map(workspace => ({
        ...workspace,
        isJoined: false,
        isOwned: false,
        actionType: 'join' as const
      }))
  })

  // Optimized filtered workspaces with shallow reference for better performance
  const filteredAvailableWorkspaces = computed(() => {
    // Use spread operator only when arrays change, not on every access
    const available = availableWorkspaces.value
    const my = myWorkspaces.value

    // Return cached array if dependencies haven't changed
    return [...available, ...my]
  })

  // Generic handler for workspace actions
  function handleWorkspaceAction(workspace: any) {
    switch (workspace.actionType) {
      case 'join':
        joinWorkspace(workspace)
        break
      case 'leave':
        leaveWorkspace(workspace)
        break
      case 'delete':
        deleteWorkspace(workspace)
        break
    }
  }

  // Actions
  async function joinWorkspace(workspace: any) {
    if (!userStore.currentUserId) {
      $q.notify({
        type: 'negative',
        message: t('common.loginRequired')
      })

      return
    }

    adding.value[workspace.id] = true
    try {
      await workspacesStore.addWorkspaceMember(
        workspace.id,
        userStore.currentUserId,
        'member'
      )
      $q.notify({
        type: 'positive',
        message: t('workspaces.joinSuccess', { name: workspace.name })
      })
    } catch (error) {
      console.error('Failed to join workspace:', error)
      $q.notify({
        type: 'negative',
        message: t('workspaces.joinError')
      })
    } finally {
      adding.value[workspace.id] = false
    }
  }

  async function leaveWorkspace(workspace: any) {
    if (!userStore.currentUserId) return

    $q.dialog({
      title: t('workspaces.leaveConfirmTitle'),
      message: t('workspaces.leaveConfirmMessage', { name: workspace.name }),
      cancel: true,
      persistent: true
    }).onOk(async () => {
      removing.value[workspace.id] = true
      try {
        await workspacesStore.removeWorkspaceMember(
          workspace.id,
          userStore.currentUserId
        )
        $q.notify({
          type: 'positive',
          message: t('workspaces.leaveSuccess', { name: workspace.name })
        })
      } catch (error) {
        console.error('Failed to leave workspace:', error)
        $q.notify({
          type: 'negative',
          message: t('workspaces.leaveError')
        })
      } finally {
        removing.value[workspace.id] = false
      }
    })
  }

  async function deleteWorkspace(workspace: any) {
    if (!userStore.currentUserId) return

    $q.dialog({
      title: t('workspaces.deleteConfirmTitle'),
      message: t('workspaces.deleteConfirmMessage', { name: workspace.name }),
      cancel: true,
      persistent: true
    }).onOk(async () => {
      removing.value[workspace.id] = true
      try {
        await workspacesStore.deleteItem(workspace.id)
        $q.notify({
          type: 'positive',
          message: t('workspaces.deleteSuccess', { name: workspace.name })
        })
      } catch (error) {
        console.error('Failed to delete workspace:', error)
        $q.notify({
          type: 'negative',
          message: t('workspaces.deleteError')
        })
      } finally {
        removing.value[workspace.id] = false
      }
    })
  }

  // Initialize workspace data
  async function initializeWorkspaces() {
    loading.value = true
    try {
      // Make sure all workspace data is loaded
      if (userStore.currentUserId) {
        await workspacesStore.getUserWorkspaces(userStore.currentUserId)
      }

      // Load all profiles to get workspace owner names
      if (!profileStore.isInitialized) {
        await profileStore.fetchProfiles()
      }
    } catch (error) {
      console.error('Failed to load workspace data:', error)
    } finally {
      loading.value = false
    }
  }

  // Utility function for date formatting
  function formatDate(dateString: string) {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
    }
  }

  return {
    // State
    loading,
    adding,
    removing,

    // Computed
    myWorkspaces,
    availableWorkspaces,
    filteredAvailableWorkspaces,
    getOwnerName,

    // Methods
    handleWorkspaceAction,
    joinWorkspace,
    leaveWorkspace,
    deleteWorkspace,
    initializeWorkspaces,
    formatDate,
    isWorkspaceOwner,
    isLastMember
  }
}
