/* eslint-disable camelcase */
import { throttle } from "lodash"
import { defineStore } from "pinia"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"

import { defaultAvatar } from "@/shared/utils/functions"

import { defaultModelSettings } from "@/features/assistants/consts"
import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"
import { AssistantDefaultPrompt } from "@/features/dialogs/utils/dialogTemplateDefinitions"

import { supabase } from "@/services/data/supabase/client"
import { Assistant, DbAssistantUpdate, mapAssistantToDb, mapDbToAssistant } from "@/services/data/types/assistant"

/**
 * Store for managing AI assistants in the application
 *
 * This store handles:
 * - Fetching, creating, updating, and deleting assistants
 * - Managing assistant configurations (prompts, models, settings)
 * - Tracking assistant state across the application
 *
 * Assistants are AI configurations that can be used in dialogs to provide
 * specific capabilities or personalities for different use cases.
 *
 * @dependencies
 * - {@link useUserLoginCallback} - For initialization after user login
 * - {@link useI18n} - For internationalization of default assistant names
 *
 * @database
 * - Table: "user_assistants" - Stores assistant configurations
 *
 * @related
 * - Used by {@link usePluginsStore} for managing assistant-plugin associations
 * - Used by {@link useDialogInput} for setting up conversation contexts
 */
export const useAssistantsStore = defineStore("assistants", () => {
  const assistants = ref<Assistant[]>([])
  const isLoaded = ref(false)
  const isSaving = ref(false)
  const hasChanges = ref(false)

  watch(assistants, () => {
    hasChanges.value = true
  }, { deep: true })
  const fetchAssistants = async () => {
    isLoaded.value = false

    const { data, error } = await supabase.from("user_assistants").select("*")

    if (error) {
      console.error("Error fetching assistants:", error)
    }

    assistants.value = data.map(mapDbToAssistant)

    setTimeout(() => {
      isLoaded.value = true
      hasChanges.value = false
    })
  }

  const init = async () => {
    assistants.value = []
    isLoaded.value = false
    await fetchAssistants()
  }

  useUserLoginCallback(init)

  const { t } = useI18n()

  async function add (props: Partial<Assistant> = {}) {
    isSaving.value = true

    const { data, error } = await supabase
      .from("user_assistants")
      .insert(mapAssistantToDb({
        name: t("stores.assistants.newAssistant"),
        avatar: defaultAvatar("AI"),
        workspaceId: null,
        prompt: "",
        promptTemplate: AssistantDefaultPrompt,
        promptVars: [],
        provider: null,
        model: null,
        modelSettings: { ...defaultModelSettings },
        plugins: {},
        promptRole: "system",
        stream: true,
        ...props,
      }))
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("Error adding assistant:", error)
    }

    assistants.value.push(mapDbToAssistant(data))

    return data
  }

  async function update (id: string, changes: Assistant<DbAssistantUpdate>) {
    isSaving.value = true

    const { data, error } = await supabase
      .from("user_assistants")
      .update(mapAssistantToDb(changes))
      .eq("id", id)
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("Error updating assistant:", error)

      return null
    }

    const result = mapDbToAssistant(data)
    assistants.value = assistants.value.map((a) =>
      a.id === id ? result : a
    )

    return result
  }

  const throttledUpdate = throttle(async (assistant: Assistant) => {
    await update(assistant.id, assistant)
  }, 2000)

  async function put (assistant: Assistant) {
    if (assistant.id) {
      return throttledUpdate(assistant)
    }

    return add(assistant)
  }

  async function delete_ (id: string) {
    isSaving.value = true

    const { error } = await supabase
      .from("user_assistants")
      .delete()
      .eq("id", id)
      .select()
      .single()

    isSaving.value = false

    if (error) {
      console.error("Error deleting assistant:", error)

      return null
    }

    assistants.value = assistants.value.filter((a) => a.id !== id)
  }

  return {
    init,
    assistants,
    add,
    update,
    put,
    delete: delete_,
    isLoaded,
    isSaving,
    hasChanges,
  }
})
