export function convertLlamaResponse(responseBody: any): any {
  let generatedText = responseBody.generation || ''

  generatedText = generatedText
    .replace(/<\|start_header_id\|>.*?<\|end_header_id\|>\s*/gs, '')
    .replace(/.*<\|end_header_id\|>\s*/g, '')
    .replace(/<\|eot_id\|>/g, '')
    .trim()

  let toolCallMatch = null

  toolCallMatch = generatedText.match(/\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"parameters"\s*:\s*(\{[^}]*\}|\{.*?\})\s*\}/s)

  if (!toolCallMatch) {
    toolCallMatch = generatedText.match(/\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[^}]*\}|\{.*?\})\s*\}/s)
  }

  if (!toolCallMatch) {
    const jsonMatch = generatedText.match(/\{[^}]*"tool"[^}]*\}/s)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        if (parsed.tool) {
          toolCallMatch = [
            jsonMatch[0],
            parsed.tool,
            JSON.stringify(parsed.parameters || parsed.args || {})
          ]
        }
      } catch (e) {
        void e
      }
    }
  }

  if (!toolCallMatch) {
    const multiLineMatch = generatedText.match(/\{\s*"tool"\s*:\s*"([^"]+)"[\s\S]*?"parameters"\s*:\s*(\{[\s\S]*?\})\s*\}/m)
    if (multiLineMatch) {
      toolCallMatch = multiLineMatch
    }
  }

  let content: any[]
  if (toolCallMatch) {
    const toolName = toolCallMatch[1]
    let toolParams
    try {
      toolParams = JSON.parse(toolCallMatch[2])
    } catch (e) {
      toolParams = {}
    }

    content = [{
      type: 'tool-call' as const,
      toolCallId: `call_${Date.now()}`,
      toolName,
      args: toolParams
    }]
  } else {
    content = [{ type: 'text' as const, text: generatedText }]
  }

  const finishReason = responseBody.stop_reason === 'stop' ? 'stop' : 'length'
  const inputTokens = responseBody.prompt_token_count || 0
  const outputTokens = responseBody.generation_token_count || 0

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
