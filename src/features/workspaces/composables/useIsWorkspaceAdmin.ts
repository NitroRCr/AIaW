import { computed, readonly, Ref, ref, watch } from "vue"

import { useUserStore } from "@/shared/store"

import { useWorkspacesStore } from "@/features/workspaces/store"

export const useIsWorkspaceAdmin = (workspaceId: Ref<string | null>) => {
  const store = useWorkspacesStore()

  const { currentUserId } = useUserStore()
  const isAdmin = ref<null | boolean>(null)

  watch(
    [() => workspaceId.value, () => currentUserId],
    async ([id, userId]) => {
      await store.getWorkspaceMembers(id)

      if (!id || !userId) {
        isAdmin.value = null

        return
      }

      isAdmin.value = null
      isAdmin.value = ["admin", "owner"].includes(
        await store.isUserWorkspaceAdmin(id, userId)
      )
    },
    { immediate: true }
  )

  return {
    isAdmin: readonly(isAdmin),
    isLoaded: computed(() => isAdmin.value !== null),
  }
}
