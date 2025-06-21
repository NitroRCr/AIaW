import { createOpenAICompatible, OpenAICompatibleProviderSettings } from '@ai-sdk/openai-compatible'

import { CyberLiteLLMBaseURL } from "@/shared/utils/config"

/**
 * Creates an AI SDK compatible client for the LiteLLM proxy
 */
export function createLiteLLMClient(settings: OpenAICompatibleProviderSettings) {
  if (!CyberLiteLLMBaseURL) throw new Error("LiteLLM proxy not configured")

  return createOpenAICompatible({
    ...settings,
    baseURL: CyberLiteLLMBaseURL
  })
}
