import { useQuasar } from "quasar"
import { useI18n } from "vue-i18n"

import { useUserDataStore, useUserPerfsStore } from "@/shared/store"
import { defaultAvatar } from "@/shared/utils/functions"
import { dialogOptions } from "@/shared/utils/values"

import { useAssistantsStore } from "@/features/assistants/store"
import { useCheckLogin } from "@/features/auth/composables"
import SelectWorkspaceDialog from "@/features/workspaces/components/SelectWorkspaceDialog.vue"
import { useWorkspacesStore } from "@/features/workspaces/store"

export function useWorkspaceActions () {
  const workspacesStore = useWorkspacesStore()
  const assistantsStore = useAssistantsStore()
  const userDataStore = useUserDataStore()
  const userPerfsStore = useUserPerfsStore()
  const $q = useQuasar()
  const { t } = useI18n()
  const { ensureLogin } = useCheckLogin()

  function addWorkspace (parentId = null) {
    ensureLogin()

    $q.dialog({
      title: t("workspace.newWorkspace"),
      prompt: {
        model: "",
        type: "text",
        isValid: (v) => !!v.trim(),
        label: t("workspace.name"),
      },
      cancel: true,
      ok: t("workspace.create"),
      ...dialogOptions,
    }).onOk(async (name) => {
      const workspace = await workspacesStore.addWorkspace({
        name: name.trim(),
        parent_id: parentId,
        type: "workspace",
        is_public: true,
      })
      const assistant = await assistantsStore.add({
        name: t("workspace.defaultAssistant"),
        workspace_id: workspace.id,
        avatar: defaultAvatar("AI"),
        provider: userPerfsStore.data.provider,
        model: userPerfsStore.data.model,
      })
      userDataStore.data.defaultAssistantIds[workspace.id] = assistant.id
    })
  }

  function addFolder (parentId = null) {
    ensureLogin()

    $q.dialog({
      title: t("workspace.newFolder"),
      prompt: {
        model: "",
        type: "text",
        isValid: (v) => !!v.trim(),
        label: t("workspace.name"),
      },
      cancel: true,
      ok: t("workspace.create"),
      ...dialogOptions,
    }).onOk((name) => {
      workspacesStore.addWorkspace({
        name: name.trim(),
        parent_id: parentId,
        type: "folder",
      })
    })
  }

  function moveItem ({ id }, exclude?: string[]) {
    $q.dialog({
      component: SelectWorkspaceDialog,
      componentProps: {
        accept: "folder",
        exclude,
      },
    }).onOk((parentId) => {
      workspacesStore.updateItem(id, { parent_id: parentId })
    })
  }

  function deleteItem ({ id, type, name }) {
    $q.dialog({
      title:
        type === "workspace"
          ? t("workspace.deleteWorkspace")
          : t("workspace.deleteFolder"),
      message:
        type === "workspace"
          ? t("workspace.confirmDeleteWorkspace", { name })
          : t("workspace.confirmDeleteFolder", { name }),
      cancel: true,
      ok: {
        label: t("workspace.delete"),
        color: "err",
        flat: true,
      },
      ...dialogOptions,
    }).onOk(() => {
      workspacesStore.deleteItem(id)
    })
  }

  return { addWorkspace, addFolder, moveItem, deleteItem }
}
