import { StandardResponse, ToolNameMapping } from '../types'

export function convertNovaResponse(
  responseBody: any,
  toolMapping: ToolNameMapping = {}
): Partial<StandardResponse> {
  const output = responseBody.output?.message

  const content = output?.content?.map((item: any) => {
    if (item.text) {
      return { type: 'text' as const, text: item.text }
    }

    if (item.toolUse) {
      const mappedToolName = toolMapping[item.toolUse.name]
      const finalToolName = mappedToolName || item.toolUse.name

      const inputString = typeof item.toolUse.input === 'string'
        ? item.toolUse.input
        : JSON.stringify(item.toolUse.input)

      const toolCall = {
        type: 'tool-call' as const,
        toolCallId: item.toolUse.toolUseId,
        toolName: finalToolName,
        input: inputString
      }

      return toolCall
    }

    return null
  }).filter(Boolean) || []

  const inputTokens = responseBody.usage?.inputTokens || 0
  const outputTokens = responseBody.usage?.outputTokens || 0

  // Check stop reason
  const stopReason = output?.stopReason

  let finishReason: 'stop' | 'length' | 'tool-calls' | 'content-filter' = 'stop'

  if (stopReason === 'tool_use') {
    finishReason = 'tool-calls'
  } else if (stopReason === 'max_tokens') {
    finishReason = 'length'
  } else if (stopReason === 'end_turn') {
    finishReason = 'stop'
  }

  const result = {
    content,
    finishReason,
    usage: {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens
    }
  }

  return result
}
