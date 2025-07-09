import { throttle } from "lodash"
import { defineStore } from "pinia"
import { readonly, ref, watch } from "vue"

import { useUserStore } from "@/shared/store"

import { useChatsWithSubscription } from "@/features/chats/composables/useChatsWithSubscription"

import { supabase } from "@/services/data/supabase/client"
import { Chat, DbChatInsert, mapChatToDb, mapDbToChat } from "@/services/data/types/chat"

/**
 * Store for managing user-to-user chats in the application
 *
 * This store provides functionality for:
 * - Creating, reading, updating, and deleting chats
 * - Managing chat membership
 * - Searching chat content
 * - Handling private chats between users
 *
 * Chats are user-to-user communication channels, separate from AI dialogs,
 * that enable collaboration within workspaces.
 *
 * @dependencies
 * - {@link useChatsWithSubscription} - For real-time chat data
 * - {@link useUserStore} - For current user information
 *
 * @database
 * - Table: "chats" - Stores chat metadata
 * - Table: "messages" - Stores chat messages (separate from dialog messages)
 * - Uses RPC function: "start_private_chat_with" for private chat management
 */
export const useChatsStore = defineStore("chats", () => {
  const { chats, isLoaded } = useChatsWithSubscription()
  const userStore = useUserStore()
  const isSaving = ref(false)
  const hasChanges = ref(false)

  watch(chats, () => {
    hasChanges.value = true
  }, { deep: true })

  /**
   * Creates a new chat in the database
   *
   * This method:
   * 1. Inserts a new chat record with the provided data
   * 2. Returns the created chat data from the database
   * 3. Handles and logs any errors that occur
   *
   * The database will automatically:
   * - Generate an ID for the chat
   * - Set created_at and updated_at timestamps
   * - Set the owner_id to the current user
   *
   * @param chat - Chat data for the new chat (excluding auto-generated fields)
   * @returns Promise resolving to the created chat data, or undefined if an error occurred
   * @example
   * // Create a basic chat
   * const newChat = await add({
   *   name: "New Discussion",
   *   workspaceId: "workspace-123",
   *   type: "group"
   * });
   */
  const add = async (
    chat: Chat<DbChatInsert>
  ): Promise<Chat> => {
    isSaving.value = true
    console.log("addChat", chat)
    const { data, error } = await supabase
      .from("chats")
      .insert(mapChatToDb(chat))
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("error", error)
      throw error
    }

    return mapDbToChat(data)
  }

  /**
   * Updates a chat in the database
   *
   * This method:
   * 1. Updates the specified chat with the provided data
   * 2. Returns the updated chat data from the database
   * 3. Handles and logs any errors that occur
   *
   * @param id - The ID of the chat to update
   * @param chat - Partial chat object containing the fields to update
   * @returns Promise resolving to the updated chat data, or undefined if an error occurred
   * @example
   * // Update a chat's name
   * const updatedChat = await update("chat-123", { name: "New Chat Name" });
   *
   * // Update multiple properties
   * const updatedChat = await update("chat-123", {
   *   name: "New Chat Name",
   *   last_message_at: new Date().toISOString()
   * });
   */
  const update = async (id: string, chat: Partial<Chat>): Promise<Chat | undefined> => {
    isSaving.value = true

    const { data, error } = await supabase
      .from("chats")
      .update(mapChatToDb(chat))
      .eq("id", id)
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("error", error)
    }

    return mapDbToChat(data)
  }

  /**
   * Deletes a chat from the database
   *
   * This method:
   * 1. Deletes the specified chat from the database
   * 2. Throws an error if the deletion fails
   *
   * Note: This operation is permanent and cannot be undone.
   * The database should have cascade delete set up to remove
   * associated messages and other data.
   *
   * @param id - The ID of the chat to delete
   * @throws Error if the deletion fails
   * @example
   * try {
   *   await remove("chat-123");
   *   console.log("Chat deleted successfully");
   * } catch (error) {
   *   console.error("Failed to delete chat:", error);
   * }
   */
  const remove = async (id: string): Promise<void> => {
    const { error } = await supabase.from("chats").delete().eq("id", id)

    if (error) {
      console.error("error", error)
      throw error
    }
  }

  /**
   * Searches for messages containing the specified query text
   *
   * This method:
   * 1. Performs a full-text search on message content
   * 2. Optionally filters results by workspace
   * 3. Returns matching messages with their associated chat information
   *
   * @param query - The text to search for in message content
   * @param workspaceId - Optional workspace ID to limit search scope, or null to search all workspaces
   * @returns Promise resolving to an array of matching messages with chat information
   * @example
   * // Search across all workspaces
   * const results = await search("important topic", null);
   *
   * // Search within a specific workspace
   * const results = await search("project discussion", "workspace-123");
   */
  const search = async (query: string, workspaceId: string | null): Promise<any[]> => {
    // Build the query with nested selection for chat information
    const queryBuilder = supabase.from("messages").select(`
        id,
        chat_id,
        content,
        chat:chats (
          workspaceId,
          name
        )
      `)

    // Add workspace filter if provided
    if (workspaceId) {
      queryBuilder.eq("chats.workspaceId", workspaceId)
    }

    // Execute the full-text search
    const { data, error } = await queryBuilder.textSearch("content", query)
    console.log("-- search chats error", error)

    return data || []
  }

  /**
   * Throttled update function to prevent too many database calls
   * Limits updates to once per second per chat
   */
  const throttleUpdate = throttle(update, 1000)

  /**
   * Creates or updates a chat based on whether it has an ID
   *
   * This method acts as a smart upsert operation:
   * - If the chat has an ID, it updates the existing chat with throttling
   * - If the chat doesn't have an ID, it creates a new chat
   *
   * The throttling helps prevent excessive database updates when
   * a component is rapidly changing chat properties.
   *
   * @param chat - The chat data to create or update
   * @example
   * // Update an existing chat (throttled)
   * putItem({ id: "chat-123", name: "Updated Name" });
   *
   * // Create a new chat
   * putItem({ name: "New Chat", workspaceId: "workspace-123", type: "group" });
   */
  const putItem = async (chat: Partial<Chat>): Promise<void> => {
    if (chat.id) {
      // If chat has an ID, update it with throttling
      throttleUpdate(chat.id, chat)
    } else {
      // If chat doesn't have an ID, create a new one
      await add(
        chat as Omit<
          Chat,
          "id" | "created_at" | "updated_at" | "owner_id"
        >
      )
    }
  }

  /**
   * Starts or retrieves a private chat with another user
   *
   * This method:
   * 1. Calls a database function to find an existing private chat between users
   * 2. If no chat exists, creates a new private chat between the users
   * 3. Returns the chat ID of the existing or newly created chat
   *
   * The database function handles the logic of finding or creating the chat,
   * ensuring that only one private chat exists between any two users.
   *
   * @param targetUserId - The ID of the user to start a private chat with
   * @returns Promise resolving to the ID of the private chat
   * @throws Error if the operation fails
   * @example
   * try {
   *   const chatId = await startPrivateChatWith("user-123");
   *   // Navigate to the private chat
   *   router.push(`/chats/${chatId}`);
   * } catch (error) {
   *   console.error("Failed to start private chat:", error);
   * }
   */
  const startPrivateChatWith = async (targetUserId: string): Promise<string> => {
    const { data: chatId, error } = await supabase.rpc(
      "start_private_chat_with",
      {
        target_user_id: targetUserId,
        current_user_id: userStore.currentUserId,
      }
    )

    if (error) {
      console.error("error", error)
      throw error
    }

    return chatId
  }

  const markAsRead = async (chatId: string) => {
    const { error } = await supabase.rpc('mark_chat_as_read', {
      p_chat_id: chatId
    })

    if (error) {
      console.error("❌ Failed to mark chat as read:", error.message)
      throw error
    }

    const chat = chats.value.find(chat => chat.id === chatId)

    if (chat) {
      chat.unreadCount = 0
    }
  }

  const incrementUnreadCount = (chatId: string) => {
    const chat = chats.value.find(c => c.id === chatId)

    if (chat) {
      if (typeof chat.unreadCount === "number") {
        chat.unreadCount += 1
      } else {
        chat.unreadCount = 1
      }
    }
  }

  return {
    chats: readonly(chats),
    isLoaded,
    add,
    update,
    remove,
    search,
    putItem,
    startPrivateChatWith,
    isSaving,
    hasChanges,
    markAsRead,
    incrementUnreadCount,
  }
})
