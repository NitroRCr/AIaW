// src/shared/store/utils/createUserDataStore.ts

import { isEqual, throttle, cloneDeep } from "lodash"
import { defineStore } from "pinia"
import { reactive, ref, watch } from "vue"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/supabase/client"
import { CODE_NO_RECORD_FOUND } from "@/services/supabase/consts"

import { useUserStore } from "../user"

export function createUserDataStore<T extends object> (
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
