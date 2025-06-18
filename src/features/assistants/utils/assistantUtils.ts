import { ModelSettings } from "@/shared/utils/types"

import { AssistantMapped } from "@/services/supabase/types"

export const getAssistantModelSettings = (
  assistant: AssistantMapped,
  override: Partial<ModelSettings> = {}
) => {
  const settings: Partial<ModelSettings> = {}
  for (const key in assistant.model_settings) {
    const val = assistant.model_settings[key]

    if (val || val === 0) {
      settings[key] = val
    }
  }

  return { ...settings, ...override }
}
