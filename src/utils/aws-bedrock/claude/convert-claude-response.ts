import { StandardResponse, ToolNameMapping } from '../types'
import { mapClaudeStopReason } from '../utils'

export function convertClaudeResponse(
  responseBody: any,
  toolMapping: ToolNameMapping
): Partial<StandardResponse> {
  const content = responseBody.content?.map((item: any) => {
    if (item.type === 'text') {
      return { type: 'text' as const, text: item.text }
    }

    if (item.type === 'tool_use') {
      const baseToolName = item.name
      const fullToolName = toolMapping[baseToolName] || baseToolName

      return {
        type: 'tool-call' as const,
        toolCallId: item.id,
        toolName: fullToolName,
        input: JSON.stringify(item.input)
      }
    }

    return item
  }) || []

  const finishReason = mapClaudeStopReason(responseBody.stop_reason)
  const inputTokens = responseBody.usage?.input_tokens || 0
  const outputTokens = responseBody.usage?.output_tokens || 0

  return {
    content,
    finishReason,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    }
  }
}
