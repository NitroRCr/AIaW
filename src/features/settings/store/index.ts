import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"

import { supabase } from "@/services/data/supabase/client"
import {
  DbUserSettingsInsert,
  mapDbToUserSettings,
  mapUserSettingsToDb,
  UserSettings
} from "@/services/data/types/userSettings"

export const useUserSettingsStore = defineStore("userSettings", () => {
  const settings = ref<UserSettings[]>([])
  const isLoaded = ref(false)
  const isSaving = ref(false)
  const hasChanges = ref(false)

  watch(settings, () => {
    hasChanges.value = true
  }, { deep: true })

  const init = async () => {
    isLoaded.value = false
    const { data, error } = await supabase
      .from("user_settings")
      .select("*")

    if (error) {
      console.error("❌ Failed to load settings:", error.message)
      throw error
    }

    settings.value = data.map(mapDbToUserSettings)
    isLoaded.value = true
  }

  useUserLoginCallback(init)

  const upsertItem = async <T extends DbUserSettingsInsert>(changes: UserSettings<T>) => {
    isSaving.value = true

    const result = await supabase
      .from("user_settings")
      .upsert(mapUserSettingsToDb(changes) as DbUserSettingsInsert)
      .select()
      .single()

    return result
  }

  async function deleteItem (id: string) {
    const { error } = await supabase
      .from("user_settings")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("❌ Failed to delete setting:", error.message)
      throw error
    }

    return true
  }

  const getSettingsByTag = (tags: string[]) => {
    return settings.value.filter(setting =>
      tags.every(tag => (setting.tags as string[] | null)?.includes(tag))
    )
  }

  return {
    isLoaded: computed(() => isLoaded.value),
    settings,
    upsertItem,
    deleteItem,
    getSettingsByTag,
    isSaving,
    hasChanges
  }
})
