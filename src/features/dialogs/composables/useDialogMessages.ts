import { storeToRefs } from "pinia"
import { computed, Ref } from "vue"

import { ApiResultItem } from "@/shared/types"

import { useDialogsStore, useDialogMessagesStore } from "@/features/dialogs/store"
import { useWorkspacesStore } from "@/features/workspaces/store"

import { DialogMessageNested, DialogMessageNestedUpdate, DbDialogMessageUpdate } from "@/services/data/types/dialogMessage"
import { DbMessageContentUpdate } from "@/services/data/types/messageContents"
import { DbStoredItemUpdate, StoredItem } from "@/services/data/types/storedItem"

import { getBranchList, getDialogItemList, TreeListItem } from "./utils/dialogTreeUtils"

export const useDialogMessages = (dialogId: Ref<string>) => {
  const { dialogs } = storeToRefs(useDialogsStore())
  const {
    addDialogMessage, updateDialogMessageNested, upsertSingleEntity, switchActiveDialogMessage, deleteDialogMessage,
    deleteStoredItem, fetchDialogMessages, addApiResult
  } = useDialogMessagesStore()
  const { dialogMessages: allDialogMessages } = storeToRefs(useDialogMessagesStore())
  const { workspaces } = storeToRefs(useWorkspacesStore())
  const dialog = computed(() => dialogs.value[dialogId.value])
  const workspaceId = computed(() => dialog.value?.workspaceId || null)
  const workspace = computed(() => workspaces.value.find(ws => ws.id === dialog.value?.workspaceId))

  const fetchMessages = async () => {
    return await fetchDialogMessages(dialogId.value)
  }

  const dialogMessages = computed<DialogMessageNested[]>(
    () => allDialogMessages.value[dialogId.value] || []
  )

  const messageMap = computed<Record<string, DialogMessageNested>>(() =>
    Object.fromEntries(dialogMessages.value.map((m) => [m.id, m]))
  )

  const branchList = computed(() => getBranchList(messageMap.value))
  const dialogItems = computed<TreeListItem<DialogMessageNested>[]>(() => getDialogItemList(null, messageMap.value, branchList.value, []))

  const lastMessageId = computed(() => dialogItems.value.length > 0 ? dialogItems.value[dialogItems.value.length - 1].message.id : null)
  const lastMessage = computed(() => dialogItems.value.length > 0 ? dialogItems.value[dialogItems.value.length - 1].message : null)

  const addMessage = async (parentId: string | null, message: DialogMessageNestedUpdate) => {
    const newMessage = await addDialogMessage(
      dialog.value.id,
      parentId,
      {
        ...message,
        isActive: true,
      }
    )

    return newMessage
  }

  const updateMessage = async (messageId: string,
    message: DialogMessageNested<DbDialogMessageUpdate, DbMessageContentUpdate, DbStoredItemUpdate>,
    cacheOnly = false) => {
    await updateDialogMessageNested(dialog.value.id, messageId, message, cacheOnly)
  }

  const switchActiveMessage = async (messageId: string) => {
    for (const branch of branchList.value.values()) {
      if (branch.includes(messageId)) {
        await switchActiveDialogMessage(dialog.value.id, messageId, branch)

        return true
      }
    }

    return false
  }

  function getMessageContents (from: number = 1, to: number = -1) {
    return dialogItems.value
      .slice(from, to)
      .map((item) => item.message.messageContents)
      .flat()
  }

  async function createBranch(message: DialogMessageNested) {
    const { parentId, id: _, ...messageRaw } = message

    // create raw message without any id
    const { id } = await addMessage(parentId, {
      ...messageRaw,
      messageContents: messageRaw.messageContents.map((c) => {
        const { id: _, ...contentRaw } = c

        return contentRaw
      }),
      status: "inputing",
    })

    await switchActiveMessage(id)
  }

  const deleteBranch = async (messageId: string) => {
    await deleteDialogMessage(dialogId.value, messageId)
    // TODO: set active message to next sibling
  }

  const deleteStoredItemWithFile = async (messageId: string, storedItem: StoredItem) => {
    await deleteStoredItem(dialogId.value, messageId, storedItem)
  }

  const addApiResultStoredItem = async (messageId: string, messageContentId: string, item: ApiResultItem) => {
    return await addApiResult(dialogId.value, messageId, messageContentId, item)
  }

  function switchBranch (item: TreeListItem<DialogMessageNested>, index: number) {
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
    deleteStoredItemWithFile,
    fetchMessages,
    upsertSingleEntity,
    addApiResultStoredItem,
  }
}
