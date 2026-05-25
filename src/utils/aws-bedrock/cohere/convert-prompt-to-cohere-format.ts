import { getMaxOutputTokens } from '../utils'
import {
  convertCohereMessage,
  createCohereSystemBlocks,
  createCohereToolConfig,
  prepareCoherePrompt
} from './helper-function'

export function convertToCohereFormat(
  prompt: any[],
  settings: any
): { body: any; toolMapping: { [key: string]: string }; useConverseApi: boolean } {
  return convertToCohereConverseFormat(prompt, settings)
}

function convertToCohereConverseFormat(
  prompt: any[],
  settings: any
): { body: any; toolMapping: { [key: string]: string }; useConverseApi: true } {
  const finalPrompt = prepareCoherePrompt(prompt)
  const messages = finalPrompt.map(convertCohereMessage)
  const { toolConfig, toolMapping } = createCohereToolConfig(settings.tools || [])

  const body: any = {
    messages,
    inferenceConfig: {
      maxTokens: getMaxOutputTokens(settings, 4096),
      temperature: settings.temperature !== undefined ? settings.temperature : 0.3,
      topP: settings.topP !== undefined ? Math.min(settings.topP, 0.99) : 0.99
    }
  }

  if (toolConfig) {
    body.toolConfig = toolConfig
  }

  const systemBlocks = createCohereSystemBlocks(finalPrompt)
  if (systemBlocks.length > 0) {
    body.system = systemBlocks
  }

  return {
    body,
    toolMapping,
    useConverseApi: true
  }
}
