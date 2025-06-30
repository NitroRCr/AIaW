import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"

import { defaultWorkspaceId, getDefaultAssistant, getDefaultProviderData } from "@/shared/consts"
import { useUserPerfsStore, useUserStore } from "@/shared/store"
import { localData } from "@/shared/utils/localData"

import { useAssistantsStore } from "@/features/assistants/store"
import { useWorkspacesStore } from "@/features/workspaces/store"

export function useOnboarding () {
  const $q = useQuasar()
  const assistantsStore = useAssistantsStore()
  const userStore = useUserStore()
  const { data: userPerf } = storeToRefs(useUserPerfsStore())
  // eslint-disable-next-line no-unused-vars
  const workspaceStore = useWorkspacesStore()
  const { isLoggedIn } = storeToRefs(useUserStore())

  const onboarding = async () => {
    if (!isLoggedIn.value) {
      return
    }

    const noAssistants = assistantsStore.assistants.length === 0
    const noWorkspaces = workspaceStore.workspaces.length === 0 || !workspaceStore.workspaces.find((w) => w.id === defaultWorkspaceId)

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

        $q.notify({
          message: "Onboarding completed. You can start using the app now.",
          color: "positive",
          position: "top",
        })
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
