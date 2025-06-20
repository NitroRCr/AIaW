import { useI18n } from "vue-i18n"
import { useRouter } from "vue-router"

import { useUserDataStore } from "@/shared/store"

import { useDialogMessagesStore, useDialogsStore } from "@/features/dialogs/store"

import { DbDialogMessageUpdate, DialogMessage } from "@/services/data/types/dialogMessage"
import { Dialog } from "@/services/data/types/dialogs"

export function useCreateDialog (workspaceId: string) {
  const router = useRouter()
  const dialogsStore = useDialogsStore()
  const { t } = useI18n()

  async function createDialog (props: Partial<Dialog> = {}, message?: DialogMessage<DbDialogMessageUpdate>) {
    const userStore = useUserDataStore()
    const dialogMessagesStore = useDialogMessagesStore()

    return await dialogsStore.addDialog(
      {
        workspaceId,
        name: t("createDialog.newDialog"),
        assistantId: userStore.data.defaultAssistantIds[workspaceId] || null,
        inputVars: {},
        ...props,
      }
    ).then(async (dialog) => {
      await dialogMessagesStore.addDialogMessage(
        dialog.id,
        null as string,
        message || {
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

      return dialog
    }).then(async (dialog) => {
      router.push(`/workspaces/${workspaceId}/dialogs/${dialog.id}`)

      return dialog
    })
  }

  return { createDialog }
}
