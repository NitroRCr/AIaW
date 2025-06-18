import { defineStore } from "pinia"
import { reactive, ref } from "vue"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/supabase/client"
import {
  DialogInput,
  DialogMapped,
  DialogMessageInput,
} from "@/services/supabase/types"

import { useDialogMessagesStore } from "./dialogMessages"

export const useDialogsStore = defineStore("dialogs", () => {
  const dialogs = reactive<Record<string, DialogMapped>>({})
  const isLoaded = ref(false)
  const dialogMessagesStore = useDialogMessagesStore()

  async function fetchDialogs () {
    const { data, error } = await supabase
      .from("dialogs")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      console.error(error)
    }

    Object.assign(
      dialogs,
      data.reduce((acc, dialog) => {
        acc[dialog.id] = dialog

        return acc
      }, {})
    )
    isLoaded.value = true
  }

  async function removeDialog (dialogId: string) {
    const { error } = await supabase.from("dialogs").delete().eq("id", dialogId)

    if (error) {
      console.error(error)
      throw error
    }

    delete dialogs[dialogId]
    // dialogMessages are now managed in dialogMessagesStore
  }

  async function addDialog (
    dialog: DialogInput,
    initialMessage?: DialogMessageInput
  ) {
    const { data, error } = await supabase
      .from("dialogs")
      .insert(dialog)
      .select()
      .single()

    if (error) {
      console.error(error)
      throw error
    }

    dialogs[data.id] = data as DialogMapped

    if (initialMessage) {
      await dialogMessagesStore.addDialogMessage(
        data.id,
        null,
        initialMessage,
      )
    }

    return data
  }

  async function updateDialog (dialog: Partial<DialogMapped>) {
    const { data, error } = await supabase
      .from("dialogs")
      .update(dialog)
      .eq("id", dialog.id)
      .select()
      .single()

    if (error) {
      console.error(error)
      throw error
    }

    dialogs[dialog.id] = data as DialogMapped
  }

  const init = async () => {
    isLoaded.value = false
    Object.assign(dialogs, {})
    await fetchDialogs()
    isLoaded.value = true
  }

  useUserLoginCallback(init)

  async function searchDialogs (
    query: string,
    workspaceId: string | null = null
  ) {
    const queryBuilder = supabase.from("message_contents").select(`
      message_id,
      text,
      dialog_message:dialog_messages(
        dialog_id,
        dialog:dialogs(
          workspace_id,
          name
        )
      )
    `)

    if (workspaceId) {
      queryBuilder.eq("dialog_message.dialogs.workspace_id", workspaceId)
    }

    const { data, error } = await queryBuilder.textSearch("text", query)
    console.log("-- searchDialogs error", error)

    return data
  }

  return {
    init,
    isLoaded,
    dialogs,
    addDialog,
    removeDialog,
    updateDialog,
    fetchDialogs,
    searchDialogs,
  }
})
