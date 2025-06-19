import { storeToRefs } from "pinia"
import { computed, readonly, Ref } from "vue"

import { useUserStore } from "@/shared/store"

import { useIsWorkspaceAdmin } from "@/features/workspaces/composables/useIsWorkspaceAdmin"

import { Chat } from "@/services/data/types/chat"

export const useIsChatAdmin = (chat: Ref<Chat>) => {
  const { currentUserId } = storeToRefs(useUserStore())
  const workspaceId = computed(() => chat.value?.workspaceId)
  const { isAdmin: isWorkspaceAdmin } = useIsWorkspaceAdmin(workspaceId)
  const isAdmin = computed(
    () => isWorkspaceAdmin.value || chat.value?.ownerId === currentUserId.value
  )

  return { isAdmin: readonly(isAdmin) }
}
