import { throttle } from "lodash"
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import { ApiResultItem, IconAvatar } from "@/shared/types"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"
import { DefaultWsIndexContent } from "@/features/dialogs/utils"
import { useStoredItemsStore } from "@/features/storedItems"
import { useWorkspacesWithSubscription } from "@/features/workspaces/composables/useWorkspacesWithSubscription"

import { supabase } from "@/services/data/supabase/client"
import { StoredItem } from "@/services/data/types/storedItem"
import {
  DbWorkspaceInsert,
  DbWorkspaceMember,
  DbWorkspaceUpdate,
  mapDbToWorkspaceMember,
  mapDbToUserWorkspace,
  mapWorkspaceToDb,
  Workspace,
  WorkspaceMember,
  WorkspaceMemberRole,
  UserWorkspace
} from "@/services/data/types/workspace"

/**
 * Store for managing workspaces, workspace members, and user workspace relationships
 *
 * This store provides functionality for:
 * - Managing workspace CRUD operations (create, read, update, delete)
 * - Managing workspace members and their roles
 * - Managing user workspace relationships (read-only, auto-maintained by DB triggers)
 * - Retrieving workspace membership information
 *
 * Workspaces are a fundamental organizational unit in the application that
 * contain dialogs, assistants, and other resources.
 *
 * @dependencies
 * - {@link useWorkspacesWithSubscription} - For real-time workspace data
 * - {@link useI18n} - For internationalization of default workspace names
 *
 * @database
 * - Table: "workspaces" - Stores workspace data
 * - Table: "workspace_members" - Stores workspace membership and roles
 * - Table: "user_workspaces" - Denormalized table for fast user-workspace lookups (auto-maintained)
 * - Related to: "profiles" table for member information
 */
export const useWorkspacesStore = defineStore("workspaces", () => {
  const { workspaces, isLoaded } = useWorkspacesWithSubscription()
  const storedItems = useStoredItemsStore()
  const isLoadedMembers = ref(false)
  const isLoadedUserWorkspaces = ref(false)
  const workspaceMembers = ref<Record<string, WorkspaceMember[]>>({})
  const userWorkspaces = ref<Record<string, UserWorkspace[]>>({})
  const { t } = useI18n()
  const isSaving = ref(false)
  const hasChanges = ref(false)

  // Real-time subscriptions for workspace members and user workspaces
  let membersSubscription: ReturnType<typeof supabase.channel> | null = null
  let userWorkspacesSubscription: ReturnType<typeof supabase.channel> | null = null

  watch(workspaces, () => {
    hasChanges.value = true
  }, { deep: true })

  const init = async () => {
    isLoadedMembers.value = false
    isLoadedUserWorkspaces.value = false
    workspaceMembers.value = {}
    userWorkspaces.value = {}

    // Unsubscribe from existing subscriptions
    unsubscribeFromRealtimeUpdates()

    await Promise.all([
      fetchWorkspaceMembers(),
      fetchUserWorkspaces()
    ])

    // Set up real-time subscriptions
    subscribeToRealtimeUpdates()

    isLoadedMembers.value = true
    isLoadedUserWorkspaces.value = true
  }

  function subscribeToRealtimeUpdates() {
    // Subscribe to workspace members changes
    membersSubscription = supabase
      .channel("workspace-members-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workspace_members",
        },
        async (payload) => {
          console.log("🔄 New workspace member added:", payload.new)

          const memberData = payload.new as DbWorkspaceMember
          const workspaceId = memberData.workspace_id
          const userId = memberData.user_id

          // Fetch complete member data with profile information
          try {
            const { data, error } = await supabase
              .from("workspace_members")
              .select("*, profile:profiles(*)")
              .eq("workspace_id", workspaceId)
              .eq("user_id", userId)
              .single()

            if (!error && data) {
              const newMember = mapDbToWorkspaceMember(data as DbWorkspaceMember)

              if (!workspaceMembers.value[workspaceId]) {
                workspaceMembers.value[workspaceId] = []
              }

              // Check if member already exists to avoid duplicates
              const exists = workspaceMembers.value[workspaceId].some(m => m.userId === userId)

              if (!exists) {
                workspaceMembers.value[workspaceId].push(newMember)
                console.log("✅ Member added to local state:", newMember)
              }

              // Refresh user workspaces for the affected user
              await fetchUserWorkspaces(userId)
            } else {
              console.error("❌ Failed to fetch complete member data:", error)
            }
          } catch (error) {
            console.error("❌ Error handling member INSERT:", error)
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "workspace_members",
        },
        (payload) => {
          console.log("🔄 Workspace member removed:", payload.old)

          const oldMember = payload.old as DbWorkspaceMember
          const workspaceId = oldMember.workspace_id
          const userId = oldMember.user_id

          if (workspaceMembers.value[workspaceId]) {
            workspaceMembers.value[workspaceId] = workspaceMembers.value[workspaceId].filter(
              (member) => member.userId !== userId
            )
            console.log("✅ Member removed from local state")
          }

          // Remove from user workspaces
          if (userWorkspaces.value[userId]) {
            userWorkspaces.value[userId] = userWorkspaces.value[userId].filter(
              (uw) => uw.workspaceId !== workspaceId
            )
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workspace_members",
        },
        async (payload) => {
          console.log("🔄 Workspace member updated:", payload.new)

          const memberData = payload.new as DbWorkspaceMember
          const workspaceId = memberData.workspace_id
          const userId = memberData.user_id

          // Fetch complete updated member data with profile information
          try {
            const { data, error } = await supabase
              .from("workspace_members")
              .select("*, profile:profiles(*)")
              .eq("workspace_id", workspaceId)
              .eq("user_id", userId)
              .single()

            if (!error && data) {
              const updatedMember = mapDbToWorkspaceMember(data as DbWorkspaceMember)

              if (workspaceMembers.value[workspaceId]) {
                workspaceMembers.value[workspaceId] = workspaceMembers.value[workspaceId].map((member) =>
                  member.userId === updatedMember.userId ? updatedMember : member
                )
                console.log("✅ Member updated in local state:", updatedMember)
              }
            } else {
              console.error("❌ Failed to fetch updated member data:", error)
            }
          } catch (error) {
            console.error("❌ Error handling member UPDATE:", error)
          }
        }
      )
      .subscribe()

    // Subscribe to user workspaces changes (for immediate UI updates)
    userWorkspacesSubscription = supabase
      .channel("user-workspaces-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_workspaces",
        },
        async (payload) => {
          const newUserWorkspace = payload.new as any
          const userId = newUserWorkspace.user_id

          // Fetch the complete user workspace data with relationships
          const { data, error } = await supabase
            .from("user_workspaces")
            .select(`
              *,
              profile:profiles(*),
              workspace:workspaces(*)
            `)
            .eq("user_id", userId)
            .eq("workspace_id", newUserWorkspace.workspace_id)
            .single()

          if (!error && data) {
            const userWorkspace = mapDbToUserWorkspace(data)

            if (!userWorkspaces.value[userId]) {
              userWorkspaces.value[userId] = []
            }

            // Add if not already exists
            const exists = userWorkspaces.value[userId].some(uw => uw.workspaceId === userWorkspace.workspaceId)

            if (!exists) {
              userWorkspaces.value[userId].push(userWorkspace)
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "user_workspaces",
        },
        (payload) => {
          const oldUserWorkspace = payload.old as any
          const userId = oldUserWorkspace.user_id
          const workspaceId = oldUserWorkspace.workspace_id

          if (userWorkspaces.value[userId]) {
            userWorkspaces.value[userId] = userWorkspaces.value[userId].filter(
              (uw) => uw.workspaceId !== workspaceId
            )
          }
        }
      )
      .subscribe()
  }

  function unsubscribeFromRealtimeUpdates() {
    if (membersSubscription) {
      membersSubscription.unsubscribe()
      membersSubscription = null
    }

    if (userWorkspacesSubscription) {
      userWorkspacesSubscription.unsubscribe()
      userWorkspacesSubscription = null
    }
  }

  useUserLoginCallback(init)

  async function addWorkspace (props: Partial<Workspace>) {
    isSaving.value = true

    const workspace = {
      name: t("stores.workspaces.newWorkspace"),
      type: "workspace",
      avatar: { type: "icon", icon: "sym_o_deployed_code" } as IconAvatar,
      vars: {},
      indexContent: DefaultWsIndexContent,
      parentId: null,
      ...props,
    } as Workspace

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    const result = await insertItem(workspace)

    // Refresh both user workspaces AND workspace members immediately after creation
    // This ensures admin/owner functions work without page reload
    if (result) {
      // Use a small delay to ensure database triggers have completed
      setTimeout(async () => {
        try {
          // Refresh both user workspaces and workspace members
          await Promise.all([
            fetchUserWorkspaces(),
            fetchWorkspaceMembers()
          ])
        } catch (error) {
          console.error('Failed to refresh workspace data after creation:', error)
        }
      }, 100)
    }

    return result
  }

  const update = async (id: string, changes:Workspace<DbWorkspaceUpdate>) => {
    isSaving.value = true

    const result = await supabase
      .from("workspaces")
      .update(mapWorkspaceToDb(changes) as DbWorkspaceUpdate)
      .eq("id", id)
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    return result
  }

  const throttledUpdate = throttle(
    (workspace: Workspace<DbWorkspaceUpdate>) => update(workspace.id, workspace),
    2000
  )

  async function updateItem (
    id: string,
    changes:Workspace<DbWorkspaceUpdate>,
    throttle = false
  ) {
    if (throttle) {
      throttledUpdate(changes)
    } else {
      const { data, error } = await update(id, changes)

      if (error) {
        console.error("❌ Failed to update workspace:", error.message)

        return null
      }

      return data
    }
  }

  async function insertItem (workspace: Workspace) {
    isSaving.value = true

    const { data, error } = await supabase
      .from("workspaces")
      .insert(mapWorkspaceToDb(workspace) as DbWorkspaceInsert)
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("❌ Failed to put workspace:", error.message)

      return null
    }

    return data
  }

  async function putItem (workspace: Workspace) {
    if (workspace.id) {
      return await updateItem(workspace.id, workspace, true)
    }

    return await insertItem(workspace)
  }

  async function deleteItem (id: string) {
    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("❌ Failed to delete workspace:", error.message)
      throw error
    }

    return true
  }

  async function addWorkspaceMember (
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberRole
  ) {
    const { data, error } = await supabase
      .from("workspace_members")
      .insert({ workspace_id: workspaceId, user_id: userId, role })
      .select("*, profile:profiles(*)")
      .single()

    if (error) {
      console.error("❌ Failed to add workspace member:", error.message)
      throw error
    }

    // Real-time subscriptions will handle updating the local state automatically
    // No need to manually update workspaceMembers or fetch userWorkspaces
    return mapDbToWorkspaceMember(data as DbWorkspaceMember)
  }

  async function removeWorkspaceMember (workspaceId: string, userId: string) {
    const { error } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)

    if (error) {
      console.error("❌ Failed to remove workspace member:", error.message)
      throw error
    }

    // Real-time subscriptions will handle updating the local state automatically
    // No need to manually update workspaceMembers or userWorkspaces
  }

  async function updateWorkspaceMember (
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberRole
  ) {
    const { data, error } = await supabase
      .from("workspace_members")
      .update({ role })
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .select("*, profile:profiles(*)")
      .single()

    if (error) {
      console.error("❌ Failed to update workspace member:", error.message)
      throw error
    }

    workspaceMembers.value[workspaceId] = workspaceMembers.value[workspaceId].map((member) =>
      member.userId === userId ? mapDbToWorkspaceMember(data as DbWorkspaceMember) : member
    )
  }

  async function fetchWorkspaceMembers () {
    const { data, error } = await supabase
      .from("workspace_members")
      .select("*, profile:profiles(*)")

    if (error) {
      console.error("❌ Failed to get workspace members:", error.message)
      throw error
    }

    workspaceMembers.value = data.reduce((acc, member) => {
      acc[member.workspace_id] = [...(acc[member.workspace_id] || []), mapDbToWorkspaceMember(member)]

      return acc
    }, {} as Record<string, WorkspaceMember[]>)

    return workspaceMembers.value
  }

  async function fetchUserWorkspaces (userId?: string) {
    const query = supabase
      .from("user_workspaces")
      .select(`
        *,
        profile:profiles(*),
        workspace:workspaces(*)
      `)

    if (userId) {
      query.eq("user_id", userId)
    }

    const { data, error } = await query

    if (error) {
      console.error("❌ Failed to get user workspaces:", error.message)
      throw error
    }

    const processedData = data.map(mapDbToUserWorkspace)

    if (userId) {
      // Update specific user's workspaces
      userWorkspaces.value[userId] = processedData
    } else {
      // Group by user_id for all users
      userWorkspaces.value = processedData.reduce((acc, userWorkspace) => {
        acc[userWorkspace.userId] = [...(acc[userWorkspace.userId] || []), userWorkspace]

        return acc
      }, {} as Record<string, UserWorkspace[]>)
    }

    return userWorkspaces.value
  }

  async function getUserWorkspacesByUser (userId: string) {
    if (!userWorkspaces.value[userId]) {
      await fetchUserWorkspaces(userId)
    }

    return userWorkspaces.value[userId] || []
  }

  async function getUserWorkspacesByWorkspace (workspaceId: string) {
    // Find all user-workspace relationships for a specific workspace
    const allUserWorkspaces = Object.values(userWorkspaces.value).flat()

    return allUserWorkspaces.filter(uw => uw.workspaceId === workspaceId)
  }

  function isUserInWorkspace (userId: string, workspaceId: string): boolean {
    const userWorkspaceList = userWorkspaces.value[userId] || []

    return userWorkspaceList.some(uw => uw.workspaceId === workspaceId)
  }

  function getUserAccessibleWorkspaces (userId: string): UserWorkspace[] {
    return userWorkspaces.value[userId] || []
  }

  function isUserWorkspaceRole (workspaceId: string, userId: string) {
    // First check if we have workspace members data for this workspace
    if (!workspaceMembers.value[workspaceId]) {
      return null
    }

    const member = workspaceMembers.value[workspaceId].find(
      (member) => member.userId === userId
    )

    if (member) {
      return member.role as WorkspaceMemberRole
    }

    return null
  }

  // Debug helper function to check workspace membership data
  function debugWorkspaceMembership(workspaceId: string, userId: string) {
    if (process.env.NODE_ENV === 'development') {
      console.log("🔍 Debug workspace membership:", {
        workspaceId,
        userId,
        hasWorkspaceMembers: !!workspaceMembers.value[workspaceId],
        membersCount: workspaceMembers.value[workspaceId]?.length || 0,
        members: workspaceMembers.value[workspaceId],
        userRole: isUserWorkspaceRole(workspaceId, userId)
      })
    }
  }

  async function addFileItem (workspaceId: string, file: ApiResultItem) {
    return await storedItems.createAndUpload({ workspaceId }, file)
  }

  async function updateFileItem (fileId: string, file: Omit<ApiResultItem, "type"> & { type?:ApiResultItem['type'] }) {
    return await storedItems.update(fileId, file)
  }

  async function removeFileItem (storedItem: StoredItem) {
    return await storedItems.remove(storedItem)
  }

  function fetchFiles (workspaceId: string) {
    const isLoading = ref(true)
    const files = ref<StoredItem[]>([])

    // Start async fetch, update refs when done
    storedItems.fetchAll({ workspaceId })
      .then(result => {
        files.value = result
      })
      .finally(() => {
        isLoading.value = false
      })

    return { files, isLoading }
  }

  return {
    isLoaded: computed(() => isLoaded.value && isLoadedMembers.value && isLoadedUserWorkspaces.value),
    workspaces,
    workspaceMembers,
    userWorkspaces,
    addWorkspace,
    updateItem,
    putItem,
    deleteItem,
    addWorkspaceMember,
    removeWorkspaceMember,
    updateWorkspaceMember,
    getWorkspaceMembers: fetchWorkspaceMembers,
    getUserWorkspaces: fetchUserWorkspaces,
    getUserWorkspacesByUser,
    getUserWorkspacesByWorkspace,
    isUserInWorkspace,
    getUserAccessibleWorkspaces,
    isUserWorkspaceRole,
    ...(process.env.NODE_ENV === 'development' && { debugWorkspaceMembership }),
    isSaving,
    hasChanges,
    // Cleanup function for subscriptions
    $dispose: unsubscribeFromRealtimeUpdates,
    fetchFiles,
    addFileItem,
    removeFileItem,
    updateFileItem
  }
})
