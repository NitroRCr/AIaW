import { ModelSettings } from "@/shared/types"

import { Assistant } from "@/services/data/types/assistant"

export const getAssistantModelSettings = (
  assistant: Assistant,
  override: Partial<ModelSettings> = {}
) => {
  const settings: Partial<ModelSettings> = {}
  for (const key in assistant.modelSettings) {
    const val = assistant.modelSettings[key]

    if (val || val === 0) {
      settings[key] = val
    }
  }

  return { ...settings, ...override }
}
