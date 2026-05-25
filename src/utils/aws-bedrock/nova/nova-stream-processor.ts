import type { LanguageModelV2StreamPart } from '@ai-sdk/provider'

/**
 * Processes Amazon Nova Converse API streaming response
 *
 * - messageStart: Beginning of message
 * - contentBlockStart: Start of a content block (text or tool)
 * - contentBlockDelta: Incremental content (text or tool input)
 * - contentBlockStop: End of content block
 * - messageStop: End of message with stop reason
 * - metadata: Usage information
 */
export async function* processNovaConverseStream(
  stream: any,
  toolMapping: { [key: string]: string } = {}
  // toolSchemas: any[] = []
): AsyncGenerator<LanguageModelV2StreamPart> {
  const state = {
    currentTextId: 'text-0',
    currentToolCallId: '',
    currentToolName: '',
    hasTextStarted: false,
    accumulatedToolInput: '',
    hasEmittedFinish: false,
    lastStopReason: undefined as string | undefined
  }

  // let chunkCount = 0

  for await (const event of stream) {
    // chunkCount++

    const chunk = event.chunk ? JSON.parse(new TextDecoder().decode(event.chunk.bytes)) : event

    if (chunk.messageStart) {
      continue
    }

    if (chunk.contentBlockStart) {
      const start = chunk.contentBlockStart.start

      if (start && start.toolUse) {
        state.currentToolCallId = start.toolUse.toolUseId
        state.currentToolName = start.toolUse.name
        state.accumulatedToolInput = ''

        const originalToolName = toolMapping[state.currentToolName] || state.currentToolName

        yield {
          type: 'tool-input-start',
          id: state.currentToolCallId,
          toolName: originalToolName
        }
      }
      continue
    }

    if (chunk.contentBlockDelta) {
      const delta = chunk.contentBlockDelta.delta

      if (delta.text) {
        if (!state.hasTextStarted) {
          yield { type: 'text-start', id: state.currentTextId }
          state.hasTextStarted = true
        }

        yield {
          type: 'text-delta',
          id: state.currentTextId,
          delta: delta.text
        }
      }

      if (delta.toolUse) {
        const toolDelta = delta.toolUse.input || ''
        state.accumulatedToolInput += toolDelta

        yield {
          type: 'tool-input-delta',
          id: state.currentToolCallId,
          delta: toolDelta
        }
      }
      continue
    }

    if (chunk.contentBlockStop) {
      if (state.hasTextStarted) {
        yield { type: 'text-end', id: state.currentTextId }
        state.hasTextStarted = false
      } else if (state.currentToolCallId) {
        try {
          const parsedInput = JSON.parse(state.accumulatedToolInput || '{}')

          const originalToolName = toolMapping[state.currentToolName] || state.currentToolName

          yield { type: 'tool-input-end', id: state.currentToolCallId }

          yield {
            type: 'tool-call',
            toolCallId: state.currentToolCallId,
            toolName: originalToolName,
            input: JSON.stringify(parsedInput)
          }
        } catch (e) {
          yield { type: 'tool-input-end', id: state.currentToolCallId }

          yield {
            type: 'tool-call',
            toolCallId: state.currentToolCallId,
            toolName: toolMapping[state.currentToolName] || state.currentToolName,
            input: '{}'
          }
        }

        state.accumulatedToolInput = ''
        state.currentToolCallId = ''
        state.currentToolName = ''
      }
      continue
    }

    if (chunk.messageStop) {
      const stopReason = chunk.messageStop.stopReason
      state.lastStopReason = stopReason
      continue
    }

    if (chunk.metadata) {
      if (chunk.metadata.usage && !state.hasEmittedFinish) {
        const usage = chunk.metadata.usage

        let finishReason: 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'error' = 'stop'

        if (state.lastStopReason === 'tool_use') {
          finishReason = 'tool-calls'
        } else if (state.lastStopReason === 'max_tokens') {
          finishReason = 'length'
        } else if (state.lastStopReason === 'content_filtered') {
          finishReason = 'content-filter'
        }

        yield {
          type: 'finish',
          finishReason,
          usage: {
            inputTokens: usage.inputTokens || 0,
            outputTokens: usage.outputTokens || 0,
            totalTokens: usage.totalTokens || 0
          }
        }
        state.hasEmittedFinish = true
      }
      continue
    }
  }

  if (state.hasTextStarted) {
    yield { type: 'text-end', id: state.currentTextId }
  }

  if (!state.hasEmittedFinish) {
    let finishReason: 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'error' = 'stop'

    if (state.lastStopReason === 'tool_use') {
      finishReason = 'tool-calls'
    } else if (state.lastStopReason === 'max_tokens') {
      finishReason = 'length'
    } else if (state.lastStopReason === 'content_filtered') {
      finishReason = 'content-filter'
    }

    yield {
      type: 'finish',
      finishReason,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0
      }
    }
  }
}
