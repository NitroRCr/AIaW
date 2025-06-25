import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"
import { onMounted, watch } from "vue"
import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useUserStore } from "@/shared/store"
import { defaultAvatar } from "@/shared/utils/functions"
import { localData } from "@/shared/utils/localData"
import { dialogOptions } from "@/shared/utils/values"

import { defaultModelSettings } from "@/features/assistants/consts"
import { useAssistantsStore } from "@/features/assistants/store"
import AuthDialog from "@/features/auth/components/AuthDialog.vue"
import { AssistantDefaultPrompt } from "@/features/dialogs/utils/dialogTemplateDefinitions"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { Assistant } from "@/services/data/types/assistant"

const defaultAssistant = {
  name: "Cyber Assistant",
  avatar: defaultAvatar("AI"),
  prompt: "",
  promptTemplate: AssistantDefaultPrompt,
  promptVars: [],
  provider: null,
  model: null,
  modelSettings: { ...defaultModelSettings },
  plugins: {},
  promptRole: "system",
  stream: true,
  workspaceId: null, // Global Assistant
} as Assistant

// eslint-disable-next-line no-unused-vars
const defaultWorkspaceId = "00000000-0000-0000-0000-000000000000"

// eslint-disable-next-line no-unused-vars
const defaultProviderData = {
  name: "litellm",
  model: "gpt-4o",
}

export function useFirstVisit () {
  const $q = useQuasar()
  const router = useRouter()
  const { t } = useI18n()
  const assistantsStore = useAssistantsStore()
  // eslint-disable-next-line no-unused-vars
  const workspaceStore = useWorkspacesStore()
  const { isLoggedIn } = storeToRefs(useUserStore())

  // onboarding: if no assistants, add default assistant
  watch(
    () => isLoggedIn,
    async (val) => {
      if (val) {
        if (assistantsStore.assistants.length === 0) {
          await assistantsStore.add(defaultAssistant)
        }
      }
    }
  )

  onMounted(() => {
    if (location.pathname === "/set-provider") {
      localData.visited = true

      return
    }

    if (!localData.visited) {
      $q.dialog({
        title: t("firstVisit.title"),
        message: t("firstVisit.messageWithLogin"),
        html: true,

        persistent: true,
        ok: {
          label: t("firstVisit.ok"),
          noCaps: true,
          flat: true,
        },
        ...dialogOptions,
      })
        .onCancel(() => {
          router.push("/settings")
          localData.visited = true
        })
        .onOk(() => {
          $q.dialog({
            component: AuthDialog,
          }).onOk(() => {
            localData.visited = true
            router.push("/settings")
          })
        })
    }
  })
}
