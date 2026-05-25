export async function* processLlamaStream(
  stream: any,
  state: any
): AsyncGenerator<any> {
  let accumulatedText = ''

  for await (const event of stream) {
    if (!event.chunk) continue

    const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes))
    const textDelta = chunk.generation || ''

    if (textDelta) {
      accumulatedText += textDelta

      if (!state.hasTextStarted) {
        yield { type: 'text-start', id: state.currentTextId }
        state.hasTextStarted = true
      }
      yield { type: 'text-delta', id: state.currentTextId, delta: textDelta }
    }

    if (chunk.stop_reason && !state.hasEmittedFinish) {
      if (state.hasTextStarted) {
        yield { type: 'text-end', id: state.currentTextId }
      }

      const cleaned = accumulatedText
        .replace(/<\|start_header_id\|>.*?<\|end_header_id\|>\s*/gs, '')
        .replace(/.*<\|end_header_id\|>\s*/g, '')
        .replace(/<\|eot_id\|>/g, '')
        .trim()

      let toolCallMatch = cleaned.match(/\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"parameters"\s*:\s*(\{[^}]*\}|\{.*?\})\s*\}/s)

      if (!toolCallMatch) {
        toolCallMatch = cleaned.match(/\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*(\{[^}]*\}|\{.*?\})\s*\}/s)
      }

      if (toolCallMatch) {
        const toolName = toolCallMatch[1]
        let toolParams
        try {
          toolParams = JSON.parse(toolCallMatch[2])
        } catch (e) {
          toolParams = {}
        }

        const toolCallId = `call_${Date.now()}`

        yield { type: 'tool-input-start', id: toolCallId, toolName }
        yield { type: 'tool-input-delta', id: toolCallId, delta: JSON.stringify(toolParams) }
        yield { type: 'tool-input-end', id: toolCallId }
        yield {
          type: 'tool-call',
          toolCallId,
          toolName,
          input: JSON.stringify(toolParams)
        }
      }

      yield {
        type: 'finish',
        finishReason: chunk.stop_reason === 'stop' ? 'stop' : 'length',
        usage: {
          inputTokens: chunk.prompt_token_count || 0,
          outputTokens: chunk.generation_token_count || 0,
          totalTokens: (chunk.prompt_token_count || 0) + (chunk.generation_token_count || 0)
        }
      }
      state.hasEmittedFinish = true
    }
  }
}
