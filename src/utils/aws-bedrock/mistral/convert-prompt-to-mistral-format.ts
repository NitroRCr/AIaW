import { getMaxOutputTokens } from '../utils'
import {
  convertMistralMessage,
  createMistralToolConfig,
  filterEmptyMistralMessages,
  prepareMistralPrompt,
  supportsMistralNativeToolConfig
} from './helper-function'

export function convertToMistralFormat(
  prompt: any[],
  settings: any,
  modelId = ''
): {
  body: any;
  toolMapping: { [key: string]: string };
  useConverseApi: boolean
} {
  const finalPrompt = prepareMistralPrompt(prompt)
  const { toolConfig, toolMapping, originalToSafeToolName } = createMistralToolConfig(settings.tools || [])
  const messages = filterEmptyMistralMessages(
    finalPrompt.map((msg: any) => convertMistralMessage(msg, originalToSafeToolName))
  )

  const body: any = {
    messages,
    inferenceConfig: {
      maxTokens: getMaxOutputTokens(settings, 2048),
      temperature: settings.temperature ?? 0.7,
      topP: settings.topP ?? 0.9
    }
  }

  if (toolConfig) {
    if (!supportsMistralNativeToolConfig(modelId)) {
      throw new Error(
        `Tool calling for AWS Bedrock model ${modelId} is not supported in AIaW yet. ` +
        'You can disable tools/plugins to chat with this model normally. ' +
        'Tool-calling support for this model is planned; for now, choose a Mistral Large or Magistral model for Bedrock tool use.'
      )
    }

    body.toolConfig = toolConfig
  }

  return {
    body,
    toolMapping,
    useConverseApi: true
  }
}
