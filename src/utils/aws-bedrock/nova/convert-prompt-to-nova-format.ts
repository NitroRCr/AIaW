import { getMaxOutputTokens } from '../utils'
import { convertNovaMessage, createNovaToolConfig } from './helper-function'

export function convertToNovaFormat(prompt: any[], settings: any): { body: any; toolMapping: { [key: string]: string }; useConverseApi: boolean } {
  const messages = prompt.map(convertNovaMessage)
  const { toolConfig, toolMapping } = createNovaToolConfig(settings.tools || [])

  const body: any = {
    messages,
    inferenceConfig: {
      maxTokens: getMaxOutputTokens(settings, 2048),
      temperature: 0
    }
  }

  if (toolConfig) {
    body.toolConfig = toolConfig
  }

  return {
    body,
    toolMapping,
    useConverseApi: Boolean(toolConfig)
  }
}
