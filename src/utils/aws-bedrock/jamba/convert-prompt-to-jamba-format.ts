import { getMaxOutputTokens } from '../utils'
import {
  convertJambaMessage,
  createJambaSystemBlocks,
  createJambaToolConfig,
  prepareJambaPrompt
} from './helper-function'

export function convertToJambaFormat(
  prompt: any[],
  settings: any
): { body: any; toolMapping: { [key: string]: string }; useConverseApi: boolean } {
  const result = convertToJambaConverseFormat(prompt, settings)
  return result
}

function convertToJambaConverseFormat(
  prompt: any[],
  settings: any
): { body: any; toolMapping: { [key: string]: string }; useConverseApi: true } {
  const finalPrompt = prepareJambaPrompt(prompt)
  const messages = finalPrompt.filter((msg: any) => msg.role !== 'system').map(convertJambaMessage)
  const { toolConfig, toolMapping } = createJambaToolConfig(settings.tools || [])

  const body: any = {
    messages,
    inferenceConfig: {
      maxTokens: getMaxOutputTokens(settings, 4096),
      temperature: settings.temperature !== undefined ? settings.temperature : 0.7,
      topP: settings.topP !== undefined ? settings.topP : 1.0
    }
  }

  if (toolConfig) {
    body.toolConfig = toolConfig
  }

  const systemBlocks = createJambaSystemBlocks(finalPrompt)
  if (systemBlocks.length > 0) {
    body.system = systemBlocks
  }

  return {
    body,
    toolMapping,
    useConverseApi: true
  }
}
