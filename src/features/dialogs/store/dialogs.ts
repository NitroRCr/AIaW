import { defineStore } from "pinia"
import { reactive, ref } from "vue"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/data/supabase/client"
import { DbDialogInsert, Dialog, mapDbToDialog, mapDialogToDb } from "@/services/data/types/dialogs"

/**
 * Store for managing dialogs in the application
 *
 * This store handles dialog creation, deletion, updates, and search functionality.
 * It maintains a reactive collection of dialogs and provides methods for CRUD operations.
 * The store automatically initializes when a user logs in and maintains dialog state
 * throughout the application lifecycle.
 *
 * @dependencies
 * - {@link useDialogMessagesStore} - For managing messages within dialogs
 * - {@link useUserLoginCallback} - For initialization after login
 * - {@link supabase} - For database operations
 *
 * @database
 * - Table: "dialogs" - Stores dialog metadata (id, name, workspaceId, assistant_id, etc.)
 * - Related to: "dialog_messages" table (managed by dialogMessagesStore)
 * - Related to: "message_contents" table (used for search functionality)
 *
 * @example
 * ```typescript
 * const dialogsStore = useDialogsStore()
 *
 * // Add a new dialog
 * const dialog = await dialogsStore.addDialog({
 *   workspaceId: 'workspace-123',
 *   name: 'My Dialog',
 *   assistant_id: 'assistant-456'
 * })
 *
 * // Search dialogs
 * const results = await dialogsStore.searchDialogs('search term', 'workspace-123')
 * ```
 */
export const useDialogsStore = defineStore("dialogs", () => {
  /** Reactive collection of dialogs indexed by dialog ID */
  const dialogs = reactive<Record<string, Dialog>>({})
  /** Flag indicating whether the initial data load has completed */
  const isLoaded = ref(false)

  /**
   * Fetches all dialogs from the database and populates the store
   *
   * Retrieves dialogs ordered by creation date (ascending) and updates
   * the reactive dialogs collection. Sets isLoaded to true upon completion.
   *
   * @throws {Error} If database query fails
   * @returns {Promise<void>}
   */
  async function fetchDialogs (): Promise<void> {
    const { data, error } = await supabase
      .from("dialogs")
      .select("*")
      .order("created_at", { ascending: true })

    if (error) {
      console.error(error)
    }

    console.log("[DEBUG] Fetch dialogs", data)

    Object.assign(
      dialogs,
      data.reduce((acc, dialog) => {
        acc[dialog.id] = mapDbToDialog(dialog)

        return acc
      }, {})
    )
    isLoaded.value = true
  }

  /**
   * Removes a dialog from both the database and local store
   *
   * Permanently deletes the specified dialog. Note that related dialog messages
   * are handled separately by the dialogMessagesStore.
   *
   * @param {string} dialogId - The unique identifier of the dialog to remove
   * @throws {Error} If database deletion fails
   * @returns {Promise<void>}
   */
  async function removeDialog (dialogId: string) {
    const { error } = await supabase.from("dialogs").delete().eq("id", dialogId)

    if (error) {
      console.error(error)
      throw error
    }

    delete dialogs[dialogId]
    // dialogMessages are now managed in dialogMessagesStore
  }

  /**
   * Creates a new dialog in the database and adds it to the store
   *
   * @param {DialogInsert} dialog - The dialog data to insert
   * @throws {Error} If database insertion fails
   * @returns {Promise<Dialog>} The created dialog with generated ID
   */
  async function addDialog (
    dialog: Dialog<DbDialogInsert>,
  ) {
    const { data, error } = await supabase
      .from("dialogs")
      .insert(mapDialogToDb(dialog))
      .select()
      .single()

    if (error) {
      console.error(error)
      throw error
    }

    dialogs[data.id] = mapDbToDialog(data)

    return dialogs[data.id]
  }

  /**
   * Updates an existing dialog in the database and local store
   *
   * @param {Partial<Dialog>} dialog - The dialog data to update (must include id)
   * @throws {Error} If database update fails or dialog ID is missing
   * @returns {Promise<void>}
   */
  async function updateDialog (dialog: Partial<Dialog>) {
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

    dialogs[dialog.id] = mapDbToDialog(data)
  }

  /**
   * Initializes the store by clearing existing data and fetching fresh data
   *
   * This function is automatically called when a user logs in via useUserLoginCallback.
   * It resets the store state and repopulates it with current data from the database.
   *
   * @returns {Promise<void>}
   */
  const init = async () => {
    isLoaded.value = false
    Object.assign(dialogs, {})
    await fetchDialogs()
    isLoaded.value = true
  }

  useUserLoginCallback(init)

  /**
   * Searches for dialogs containing specific text content
   *
   * Performs a full-text search across message contents within dialogs.
   * Can be filtered by workspace ID to limit search scope.
   *
   * @param {string} query - The search term to look for in message contents
   * @param {string | null} [workspaceId=null] - Optional workspace ID to filter results
   * @returns {Promise<any[]>} Array of search results with message and dialog information
   *
   * @example
   * ```typescript
   * // Search all dialogs
   * const allResults = await searchDialogs('important topic')
   *
   * // Search within specific workspace
   * const workspaceResults = await searchDialogs('important topic', 'workspace-123')
   * ```
   */
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
      queryBuilder.eq("dialog_message.dialogs.workspaceId", workspaceId)
    }

    const { data, error } = await queryBuilder.textSearch("text", query)
    console.log("-- searchDialogs error", error)

    return data.map(d => ({
      workspaceId: d.dialog_message.dialog.workspace_id,
      dialogId: d.dialog_message.dialog_id,
      title: d.dialog_message.dialog.name,
      route: [],
      text: d.text,
    }))
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
