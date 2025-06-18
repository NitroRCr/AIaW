// @/shared/store/utils/createKeyValueDbStore.ts

import { isEqual, throttle, cloneDeep } from "lodash"
import { defineStore } from "pinia"
import { reactive, ref, watch } from "vue"

import { useUserStore } from "@/shared/store/user"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/data/supabase/client"
import { CODE_NO_RECORD_FOUND } from "@/services/data/supabase/consts"

/**
 * Factory function that creates a key-value store with Supabase persistence
 *
 * This function creates a Pinia store that automatically syncs with the Supabase
 * "user_data" table. It provides reactivity, persistence, and throttled updates
 * to minimize database operations.
 *
 * @dependencies
 * - {@link useUserStore} - For user identification in the database
 * - {@link useUserLoginCallback} - For initialization after login
 *
 * @database
 * - Table: "user_data" - Stores user-specific key-value data
 *
 * @example
 * ```typescript
 * // Creating a preferences store
 * export const usePrefsStore = createKeyValueDbStore("prefs", {
 *   theme: "light",
 *   language: "en"
 * });
 *
 * // Using the store
 * const prefsStore = usePrefsStore();
 * prefsStore.data.theme = "dark"; // Automatically synced to database
 * ```
 *
 * @param storeId - Unique identifier for this store, used as the key in the database
 * @param defaultValue - Default values for the store
 * @returns A configured Pinia store with automatic persistence
 */
export function createKeyValueDbStore<T extends object> (
  storeId: string,
  defaultValue: T
) {
  return defineStore(storeId, () => {
    const data = reactive<T>(cloneDeep(defaultValue))
    const ready = ref(false)
    const userStore = useUserStore()
    const lastSnapshot = ref(cloneDeep(data))

    const fetchData = async () => {
      const { data: dbData, error } = await supabase
        .from("user_data")
        .select("*")
        .eq("key", storeId)
        .single()

      if (error) {
        if (error.code === CODE_NO_RECORD_FOUND) {
          await addData(defaultValue)
        } else {
          console.error(error)

          return
        }
      } else {
        Object.assign(data, dbData.value as T)
      }

      ready.value = true
    }

    const init = async () => {
      Object.assign(data, defaultValue)
      await fetchData()
    }

    useUserLoginCallback(init)

    const addData = async (value: T) => {
      const { data: dbData } = await supabase
        .from("user_data")
        .insert({ user_id: userStore.currentUserId, key: storeId, value })
        .select()
        .single()

      if (dbData) Object.assign(data, dbData.value as T)
    }

    const updateData = async (value: T) => {
      const { data: dbData, error } = await supabase
        .from("user_data")
        .upsert({ key: storeId, value })
        .eq("key", storeId)
        .eq("user_id", userStore.currentUserId)
        .select()
        .single()

      if (dbData) Object.assign(data, dbData.value as T)

      if (error) console.error(error)
    }

    const restore = () => {
      Object.assign(data, defaultValue)
      updateData(data as T)
    }

    const throttledUpdate = throttle((data: T) => {
      updateData(data)
    }, 2000)

    // Auto save data to database
    watch(
      data,
      () => {
        if (!ready.value) return

        if (!isEqual(data, lastSnapshot.value)) {
          throttledUpdate(data as T)
          lastSnapshot.value = cloneDeep(data)
        }
      },
      { deep: true }
    )

    return { data, ready, restore }
  })
}
