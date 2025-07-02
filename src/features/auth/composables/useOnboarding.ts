import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"
import { useRouter } from "vue-router"

import { defaultWorkspaceId, getDefaultAssistant, getDefaultProviderData } from "@/shared/consts"
import { useUserPerfsStore, useUserStore } from "@/shared/store"
import { localData } from "@/shared/utils/localData"

import { useAssistantsStore } from "@/features/assistants/store"
import { useWorkspacesStore } from "@/features/workspaces/store"

export function useOnboarding () {
  const $q = useQuasar()
  const router = useRouter()
  const assistantsStore = useAssistantsStore()
  const userStore = useUserStore()
  const { data: userPerf } = storeToRefs(useUserPerfsStore())
  const workspaceStore = useWorkspacesStore()

  const onboarding = async () => {
    // Check if user is logged in first
    if (!userStore.currentUserId) {
      console.log("No user logged in, skipping onboarding")

      return
    }

    const noAssistants = assistantsStore.assistants.length === 0
    // Check user's accessible workspaces instead of all workspaces
    const userAccessibleWorkspaces = workspaceStore.getUserAccessibleWorkspaces(userStore.currentUserId)
    const noWorkspaces = userAccessibleWorkspaces.length === 0

    console.log("noAssistants", noAssistants)
    console.log("noWorkspaces", noWorkspaces)
    console.log("userAccessibleWorkspaces", userAccessibleWorkspaces)
    console.log("localData.visited", localData.visited)

    if (!localData.visited || (noAssistants && noWorkspaces)) {
      try {
        $q.loading.show({
          message: "Onboarding in progress...",
        })

        if (!userPerf.value.provider) {
          const { provider, model } = getDefaultProviderData()
          userPerf.value.provider = provider
          userPerf.value.model = model
        }

        if (noAssistants) {
          await assistantsStore.add(getDefaultAssistant())
        }

        if (noWorkspaces) {
          console.log("!!!!addWorkspaceMember", defaultWorkspaceId, userStore.currentUserId)
          const res = await workspaceStore.addWorkspaceMember(defaultWorkspaceId, userStore.currentUserId, "member")
          console.log("!!!!res", res)
        }

        // Mark as visited after successful onboarding
        localData.visited = true

        $q.notify({
          message: "Onboarding completed. You can start using the app now.",
          color: "positive",
          position: "top",
        })

        // Redirect to the workspace page after successful onboarding
        await router.push(`/workspaces/${defaultWorkspaceId}`)
      } catch (error) {
        console.error(error)
        $q.notify({
          message: "Onboarding failed. Ask support@cyber.ai",
          color: "negative",
          position: "top",
        })
      } finally {
        $q.loading.hide()
      }
    }
  }

  return {
    onboarding,
  }
}
