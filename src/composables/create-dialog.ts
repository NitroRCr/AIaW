import { db } from 'src/utils/db'
import { genId } from 'src/utils/functions'
import { Dialog, Workspace } from 'src/utils/types'
import { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

export function useCreateDialog(workspace: Ref<Workspace>) {
  const router = useRouter()
  const { t } = useI18n()

  async function createDialog(props: Partial<Dialog> = {}) {
    const id = genId()
    const messageId = genId()
    await db.transaction('rw', db.dialogs, db.messages, () => {
      db.dialogs.add({
        id,
        workspaceId: workspace.value.id,
        name: t('createDialog.newDialog'),
        msgTree: { $root: [messageId], [messageId]: [] },
        msgRoute: [],
        msgBranchState: {},
        assistantId: workspace.value.defaultAssistantId,
        inputVars: {},
        ...props
      })
      db.messages.add({
        id: messageId,
        dialogId: id,
        type: 'user',
        contents: [{
          type: 'user-message',
          text: '',
          items: []
        }],
        status: 'inputing'
      })
    })
    router.push(`/workspaces/${workspace.value.id}/dialogs/${id}`)
  }
  return { createDialog }
}
