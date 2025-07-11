import { defineStore } from "pinia"

import { useStorage } from "@/shared/composables/storage/useStorage"
import { ApiResultItem } from "@/shared/types"

import { supabase } from "@/services/data/supabase/client"
import {
  StoredItem,
  DbStoredItemInsert,
  DbStoredItemUpdate,
  mapDbToStoredItem,
  mapStoredItemToDb
} from "@/services/data/types/storedItem"

type OnlyOne<T, Keys extends keyof T = keyof T> =
  Keys extends keyof T
    ? { [K in Keys]: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>> }[Keys]
    : never

type SomeStoredItemId =
  OnlyOne<{ messageId: string; messageContentId: string; workspaceId: string }>

/**
 * Store for managing stored items (attachments, files, etc.)
 *
 * Supports add, update, remove, and fetch by any of message_content_id, workspace_id, or message_id.
 *
 * @database
 * - Table: "stored_items" - Stores attachments and generated files
 */
export const useStoredItemsStore = defineStore("storedItems", () => {
  const { uploadApiResultItem, deleteFile } = useStorage()

  // Fetch all stored items (optionally filter by workspace/message/message_content)
  async function fetchAll(someItemId:SomeStoredItemId) {
    let query = supabase.from("stored_items").select("*")

    if ("workspaceId" in someItemId) query = query.eq("workspace_id", someItemId.workspaceId)

    if ("messageId" in someItemId) query = query.eq("message_id", someItemId.messageId)

    if ("messageContentId" in someItemId) query = query.eq("message_content_id", someItemId.messageContentId)

    const { data, error } = await query

    if (error) {
      console.error("Failed to fetch stored items:", error)
    }

    return (data || []).map(mapDbToStoredItem)
  }

  // Add a new stored item
  async function add(item: StoredItem<DbStoredItemInsert>) {
    const { data, error } = await supabase
      .from("stored_items")
      .insert(mapStoredItemToDb(item))
      .select()
      .single()

    if (error) {
      console.error("Failed to add stored item:", error)
      throw error
    }

    return mapDbToStoredItem(data)
  }

  async function update(id: string, changes: Partial<StoredItem<DbStoredItemUpdate>>) {
    // Persist to database
    const { data, error } = await supabase
      .from("stored_items")
      .update(mapStoredItemToDb(changes))
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Failed to update stored item:", error)
      throw error
    }

    return mapDbToStoredItem(data)
  }

  // Remove a stored item
  async function remove(item: StoredItem) {
    if (item.fileUrl) {
      await deleteFile(item.fileUrl)
    }

    if (item.id) {
      const { error } = await supabase
        .from("stored_items")
        .delete()
        .eq("id", item.id)

      if (error) {
        console.error("Failed to remove stored item:", error)
        throw error
      }
    }

    return true
  }

  async function upsert(item: StoredItem<DbStoredItemInsert>) {
    const { data, error } = await supabase
      .from("stored_items")
      .upsert(mapStoredItemToDb(item))
      .select()
      .single()

    if (error) {
      console.error("Failed to upsert stored item:", error)
      throw error
    }

    return mapDbToStoredItem(data)
  }

  const createAndUpload = async (storedItemId: SomeStoredItemId, item: ApiResultItem) => {
    let storedItem: StoredItem<DbStoredItemInsert> | null = null

    if (item.type === "file") {
      const fileItem = await uploadApiResultItem(item)
      storedItem = {
        ...fileItem,
        ...storedItemId,
        name: item.name,
      }
    } else {
      const { contentText, type, name } = item

      storedItem = {
        contentText,
        type,
        name,
        ...storedItemId,
      }
    }

    // Text items store in DB, not in storage
    return await add(storedItem)
  }

  return {
    createAndUpload,
    fetchAll,
    add,
    update,
    remove,
    upsert,
  }
})
