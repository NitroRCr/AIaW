import { storeToRefs } from "pinia"
import { computed, Ref, watch } from "vue"

import { useStorage } from "@/shared/composables/storage/useStorage"
import { FILES_BUCKET } from "@/shared/composables/storage/utils"

import { useDialogMessagesStore } from "@/features/dialogs/store/dialogMessages"
import { useDialogsStore } from "@/features/dialogs/store/dialogs"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { DialogMessageInput, DialogMessageMapped, StoredItemMapped } from "@/services/supabase/types"

import { getBranchList, getDialogItemList, TreeListItem } from "./utils/dialogTreeUtils"

export const useDialogMessages = (dialogId: Ref<string>) => {
  const { dialogs } = storeToRefs(useDialogsStore())
  const { addDialogMessage, updateDialogMessage, switchActiveDialogMessage, removeDialogMessage, removeStoredItem, fetchDialogMessages } = useDialogMessagesStore()
  const { dialogMessages: allDialogMessages } = storeToRefs(useDialogMessagesStore())
  const { workspaces } = storeToRefs(useWorkspacesStore())
  const { deleteFile } = useStorage(FILES_BUCKET)
  const dialog = computed(() => dialogs.value[dialogId.value])
  const workspaceId = computed(() => dialog.value.workspace_id)
  const workspace = computed(() => workspaces.value.find(ws => ws.id === dialog.value.workspace_id))

  const fetchMessages = async () => {
    await fetchDialogMessages(dialogId.value)
  }

  const dialogMessages = computed(
    () => allDialogMessages.value[dialogId.value] || []
  )

  // watch(dialogMessages, () => {
  //   console.log("-----useDialogMessages dialogMessages", dialogMessages.value)
  // })

  const messageMap = computed<Record<string, DialogMessageMapped>>(() =>
    Object.fromEntries(dialogMessages.value.map((m) => [m.id, m]))
  )

  const branchList = computed(() => getBranchList(messageMap.value))
  const dialogItems = computed<TreeListItem<DialogMessageMapped>[]>(() => getDialogItemList(null, messageMap.value, branchList.value, []))

  watch(dialogItems, () => {
    console.log("-----useDialogMessages dialogItems", dialogItems.value)
  })
  const lastMessageId = computed(() => dialogItems.value.length > 0 ? dialogItems.value[dialogItems.value.length - 1].message.id : null)
  const lastMessage = computed(() => dialogItems.value.length > 0 ? dialogItems.value[dialogItems.value.length - 1].message : null)

  const addMessage = async (parentId: string | null, message: DialogMessageInput) => {
    const newMessage = await addDialogMessage(
      dialog.value.id,
      parentId,
      {
        ...message,
        is_active: true,
      }
    )

    return newMessage
  }

  const updateMessage = async (messageId: string, message: Partial<DialogMessageInput>) => {
    await updateDialogMessage(dialog.value.id, messageId, message)
  }

  const switchActiveMessage = async (messageId: string) => {
    for (const branch of branchList.value.values()) {
      // console.log("-----switchActiveMessage", messageId, branch.includes(messageId))

      if (branch.includes(messageId)) {
        console.log("-----switchActiveMessage2222", messageId, branch)
        await switchActiveDialogMessage(dialog.value.id, messageId, branch)

        return true
      }
    }

    return false
  }

  function getMessageContents (from: number = 1, to: number = -1) {
    return dialogItems.value
      .slice(from, to)
      .map((item) => item.message.message_contents)
      .flat()
  }

  async function createBranch(message: DialogMessageMapped) {
    const { type, message_contents, parent_id } = message

    console.log("-----createBranch", message)
    const { id } = await addMessage(parent_id, {
      type,
      message_contents,
      status: "inputing",
    })

    await switchActiveMessage(id)
  }

  const deleteBranch = async (messageId: string) => {
    await removeDialogMessage(dialogId.value, messageId)
    // TODO: set active message to next sibling
  }

  const deleteStoredItem = async (stored_item: StoredItemMapped) => {
    console.log("-----deleteStoredItem", stored_item)
    await deleteFile(stored_item.file_url)
    await removeStoredItem(stored_item)
  }

  function switchBranch (item: TreeListItem<DialogMessageMapped>, index: number) {
    console.log("----switchBranch", item, index)
    switchActiveMessage(item.siblingMessageIds[index - 1])
  }

  return {
    dialogMessages,
    messageMap,
    dialog,
    workspaceId,
    workspace,
    lastMessageId,
    lastMessage,
    dialogItems,
    addMessage,
    updateMessage,
    switchActiveMessage,
    getMessageContents,
    createBranch,
    deleteBranch,
    switchBranch,
    deleteStoredItem,
    fetchMessages
  }
}
