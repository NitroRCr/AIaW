import { throttle } from "lodash"
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import { IconAvatar } from "@/shared/types"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"
import { DefaultWsIndexContent } from "@/features/dialogs/utils"
import { useWorkspacesWithSubscription } from "@/features/workspaces/composables/useWorkspacesWithSubscription"

import { supabase } from "@/services/data/supabase/client"
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
  const isLoadedMembers = ref(false)
  const isLoadedUserWorkspaces = ref(false)
  const workspaceMembers = ref<Record<string, WorkspaceMember[]>>({})
  const userWorkspaces = ref<Record<string, UserWorkspace[]>>({})
  const { t } = useI18n()
  const isSaving = ref(false)
  const hasChanges = ref(false)

  watch(workspaces, () => {
    hasChanges.value = true
  }, { deep: true })

  const init = async () => {
    isLoadedMembers.value = false
    isLoadedUserWorkspaces.value = false
    workspaceMembers.value = {}
    userWorkspaces.value = {}
    await Promise.all([
      fetchWorkspaceMembers(),
      fetchUserWorkspaces()
    ])
    isLoadedMembers.value = true
    isLoadedUserWorkspaces.value = true
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

    return insertItem(workspace)
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

    const member = mapDbToWorkspaceMember(data as DbWorkspaceMember)
    workspaceMembers.value[workspaceId] = [
      ...workspaceMembers.value[workspaceId],
      member,
    ]

    // Refresh user workspaces as they are auto-maintained by triggers
    await fetchUserWorkspaces(userId)

    return member
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

    workspaceMembers.value[workspaceId] = workspaceMembers.value[workspaceId].filter(
      (member) => member.userId !== userId
    )

    // Refresh user workspaces as they are auto-maintained by triggers
    await fetchUserWorkspaces(userId)
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
    const member = workspaceMembers.value[workspaceId]?.find(
      (member) => member.userId === userId
    )
    console.log("isUserWorkspaceRole", workspaceId, userId,
      workspaceMembers.value, workspaces, member)

    if (member) {
      return member.role as WorkspaceMemberRole
    }

    return null
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
    isSaving,
    hasChanges
  }
})
