import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useUserDataStore } from "@/shared/store"

import { useDialogMessagesStore, useDialogsStore } from "@/features/dialogs/store"

import { Dialog } from "@/services/data/types/dialogs"

export function useCreateDialog (workspaceId: string) {
  const router = useRouter()
  const dialogsStore = useDialogsStore()
  const { t } = useI18n()

  async function createDialog (props: Partial<Dialog> = {}) {
    const userStore = useUserDataStore()
    const dialogMessagesStore = useDialogMessagesStore()

    await dialogsStore.addDialog(
      {
        workspaceId,
        name: t("createDialog.newDialog"),
        assistantId: userStore.data.defaultAssistantIds[workspaceId] || null,
        inputVars: {},
        ...props,
      }
    ).then(async ({ id }) => {
      await dialogMessagesStore.addDialogMessage(
        id,
        null as string,
        {
          type: "user",
          messageContents: [
            {
              type: "user-message",
              text: "",
            },
          ],
          status: "inputing",
        }
      )

      return id
    }).then((id) => {
      router.push(`/workspaces/${workspaceId}/dialogs/${id}`)
    })
  }

  return { createDialog }
}
