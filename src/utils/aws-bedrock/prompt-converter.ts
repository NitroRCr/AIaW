import { convertToClaudeFormat } from './claude/convert-prompt-to-claude-format'

import { convertToJambaFormat } from './jamba/convert-prompt-to-jamba-format'
import { convertToLlamaFormat } from './llama/convert-prompt-to-llama-format'
import { convertToMistralFormat } from './mistral/convert-prompt-to-mistral-format'
import { convertToNovaFormat } from './nova/convert-prompt-to-nova-format'
import type { BedrockRequestBody } from './types'
import { modelIdStartsWith } from './utils'

export function convertPromptToBedrock(
  modelId: string,
  prompt: any[],
  settings: any
): BedrockRequestBody {
  if (modelIdStartsWith(modelId, 'anthropic.')) {
    const { body, toolMapping } = convertToClaudeFormat(prompt, settings)
    body._toolMapping = toolMapping
    return body
  }

  if (modelIdStartsWith(modelId, 'meta.llama')) {
    return convertToLlamaFormat(prompt, settings)
  }

  if (modelIdStartsWith(modelId, 'mistral.')) {
    return convertToMistralFormat(prompt, settings, modelId)
  }

  if (modelIdStartsWith(modelId, 'amazon.nova')) {
    const result = convertToNovaFormat(prompt, settings)

    result.body._toolMapping = result.toolMapping
    result.body._useConverseApi = result.useConverseApi

    return result.body
  }

  if (modelIdStartsWith(modelId, 'ai21.')) {
    return convertToJambaFormat(prompt, settings)
  }

  throw new Error(`AWS Bedrock model ${modelId} is not currently supported.`)
}
