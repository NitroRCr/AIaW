import { StandardResponse, ToolNameMapping } from '../types'

export function convertJambaResponse(
  responseBody: any,
  toolMapping: ToolNameMapping = {}
): Partial<StandardResponse> {
  if (!responseBody.output?.message) {
    return {
      content: [],
      finishReason: 'error',
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      }
    }
  }

  const output = responseBody.output.message

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

      return {
        type: 'tool-call' as const,
        toolCallId: item.toolUse.toolUseId,
        toolName: finalToolName,
        input: inputString
      }
    }

    return null
  }).filter(Boolean) || []

  const inputTokens = responseBody.usage?.inputTokens || 0
  const outputTokens = responseBody.usage?.outputTokens || 0

  const stopReason = responseBody.stopReason

  let finishReason: 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'error' = 'stop'

  if (stopReason === 'tool_use') {
    finishReason = 'tool-calls'
  } else if (stopReason === 'max_tokens') {
    finishReason = 'length'
  } else if (stopReason === 'end_turn' || stopReason === 'stop_sequence') {
    finishReason = 'stop'
  } else if (stopReason === 'content_filtered') {
    finishReason = 'content-filter'
  } else if (stopReason === 'malformed_model_output' || stopReason === 'malformed_tool_use') {
    finishReason = 'error'
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
