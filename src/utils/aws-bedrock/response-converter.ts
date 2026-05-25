import type { StandardResponse, ToolNameMapping } from './types'
import { convertClaudeResponse } from './claude/convert-claude-response'
import { convertLlamaResponse } from './llama/convert-llama-response'
import { convertNovaResponse } from './nova/convert-nova-response'
import { convertJambaResponse } from './jamba/convert-jamba-response'
import { convertMistralResponse } from './mistral/convert-mistral-response'
import { modelIdStartsWith } from './utils'

export function convertBedrockResponse(
  modelId: string,
  responseBody: any,
  requestBody: any,
  toolMapping: ToolNameMapping = {}
): StandardResponse {
  let partial: Partial<StandardResponse>

  if (modelIdStartsWith(modelId, 'anthropic.')) {
    partial = convertClaudeResponse(responseBody, toolMapping)
  } else if (modelIdStartsWith(modelId, 'meta.llama')) {
    partial = convertLlamaResponse(responseBody)
  } else if (modelIdStartsWith(modelId, 'mistral.')) {
    partial = convertMistralResponse(responseBody, toolMapping)
  } else if (modelIdStartsWith(modelId, 'amazon.nova')) {
    partial = convertNovaResponse(responseBody, toolMapping)
  } else if (modelIdStartsWith(modelId, 'ai21.')) {
    partial = convertJambaResponse(responseBody, toolMapping)
  } else {
    throw new Error(`AWS Bedrock model ${modelId} is not currently supported.`)
  }

  return {
    content: partial.content || [],
    finishReason: partial.finishReason || 'stop',
    usage: partial.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    request: {
      body: JSON.stringify(requestBody)
    },
    response: {
      id: responseBody.id || `res_${Date.now()}`,
      timestamp: new Date()
    },
    warnings: []
  }
}
