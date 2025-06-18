import { storeToRefs } from "pinia"
import { computed, readonly, Ref } from "vue"

import { useUserStore } from "@/shared/store"

import { useIsWorkspaceAdmin } from "@/features/workspaces/composables/useIsWorkspaceAdmin"

import { ChatMapped } from "@/services/supabase/types"

export const useIsChatAdmin = (chat: Ref<ChatMapped>) => {
  const { currentUserId } = storeToRefs(useUserStore())
  const workspaceId = computed(() => chat.value?.workspace_id)
  const { isAdmin: isWorkspaceAdmin } = useIsWorkspaceAdmin(workspaceId)
  const isAdmin = computed(
    () => isWorkspaceAdmin.value || chat.value?.owner_id === currentUserId.value
  )

  return { isAdmin: readonly(isAdmin) }
}
