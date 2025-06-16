/* eslint-disable camelcase */
import { throttle } from "lodash"
import { defineStore } from "pinia"
import { defaultModelSettings } from "@/features/assistants/consts"
import { useUserLoginCallback } from "@/features/auth/composables/useUserLoginCallback"
import { supabase } from "@/services/supabase/client"
import { defaultAvatar, defaultTextAvatar } from "@/shared/utils/functions"
import { AssistantDefaultPrompt } from "@/features/dialogs/utils/templates"
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { AssistantMapped, Assistant } from "@/services/supabase/types"

function mapAssistantTypes (item: Assistant): AssistantMapped {
  const { avatar, ...rest } = item

  return {
    avatar: avatar ?? defaultTextAvatar(item.name),
    ...rest,
  } as AssistantMapped
}

export const useAssistantsStore = defineStore("assistants", () => {
  const assistants = ref<AssistantMapped[]>([])
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

    console.log("[DEBUG] Fetch assistants", data)

    assistants.value = data.map(mapAssistantTypes)

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
      .insert({
        name: t("stores.assistants.newAssistant"),
        avatar: defaultAvatar("AI"),
        workspace_id: null,
        prompt: "",
        prompt_template: AssistantDefaultPrompt,
        prompt_vars: [],
        provider: null,
        model: null,
        model_settings: { ...defaultModelSettings },
        plugins: {},
        prompt_role: "system",
        stream: true,
        ...props,
      })
      .select()
      .single()

    setTimeout(() => {
      isSaving.value = false
      hasChanges.value = false
    })

    if (error) {
      console.error("Error adding assistant:", error)
    }

    assistants.value.push(mapAssistantTypes(data))

    return data
  }

  async function update (id: string, changes) {
    isSaving.value = true

    const { data, error } = await supabase
      .from("user_assistants")
      .update(changes)
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

    assistants.value = assistants.value.map((a) =>
      a.id === id ? mapAssistantTypes(data) : a
    )

    return data
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
