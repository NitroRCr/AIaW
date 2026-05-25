/* eslint-disable yield-star-spacing */
import type { LanguageModelV2StreamPart } from '@ai-sdk/provider'

export async function* processCohereStream(
  stream: any,
  toolMapping: { [key: string]: string } = {}
): AsyncGenerator<LanguageModelV2StreamPart> {
  const state = {
    currentTextId: 'text-0',
    currentToolCallId: '',
    currentToolName: '',
    hasTextStarted: false,
    accumulatedToolInput: '',
    hasEmittedFinish: false,
    lastStopReason: undefined as string | undefined,
    chunkCount: 0
  }

  for await (const event of stream) {
    state.chunkCount++

    let chunk: any

    if (event.chunk?.bytes) {
      try {
        const decoded = new TextDecoder().decode(event.chunk.bytes)
        chunk = JSON.parse(decoded)
      } catch (e) {
        continue
      }
    } else if (event.chunk) {
      chunk = event.chunk
    } else {
      chunk = event
    }

    yield* processConverseChunk(chunk, state, toolMapping)
  }

  if (state.hasTextStarted) {
    yield { type: 'text-end', id: state.currentTextId }
  }

  if (state.currentToolCallId) {
    yield { type: 'tool-input-end', id: state.currentToolCallId }
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

function* processConverseChunk(
  chunk: any,
  state: any,
  toolMapping: { [key: string]: string }
): Generator<LanguageModelV2StreamPart> {
  if (chunk.messageStart) {
    return
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
    return
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
    return
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
    return
  }

  if (chunk.messageStop) {
    const stopReason = chunk.messageStop.stopReason
    state.lastStopReason = stopReason
    return
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
      } else if (state.lastStopReason === 'end_turn' || state.lastStopReason === 'stop_sequence') {
        finishReason = 'stop'
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
  }
}
