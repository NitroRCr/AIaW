import { storeToRefs } from "pinia"
import { computed, ref, watch } from "vue"

import { useUserSettingsStore } from "@/features/settings/store"

import { DbUserSettingsInsert, UserSettings } from "@/services/data/types/userSettings"

const useSettingsByTag = (tags: string[]) => {
  const { settings: allSettings } = storeToRefs(useUserSettingsStore())
  const settings = ref<Record<string, UserSettings<DbUserSettingsInsert>>>({})
  const storeSettings = computed(() => allSettings.value.filter(setting =>
    tags.every(tag => (setting.tags as string[] | null)?.includes(tag))
  ))

  watch(storeSettings, (newSettings) => {
    settings.value = newSettings.reduce((acc, setting) => {
      acc[setting.key] = setting

      return acc
    }, {} as Record<string, UserSettings<DbUserSettingsInsert>>)
  }, { immediate: true })

  const upsert = (key: string, value: any, extraTags: string[] = []) => {
    const setting = settings.value[key]

    if (setting) {
      setting.value = value
    } else {
      settings.value[key] = { key, value, tags: Array.from(new Set([...tags, ...extraTags])) } as UserSettings<DbUserSettingsInsert>
    }

    useUserSettingsStore().upsertItem(settings.value[key])
  }

  return { settings, upsert }
}

export { useSettingsByTag }
