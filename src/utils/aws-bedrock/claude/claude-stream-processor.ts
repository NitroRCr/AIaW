import type { LanguageModelV2StreamPart } from '@ai-sdk/provider'
import { coerceToolInput } from './tool-coercion'
import { ToolNameMapping } from '../types'
import { mapClaudeStopReason } from '../utils'

export async function* processClaudeStream(
  stream: any,
  toolMapping: ToolNameMapping,
  toolSchemas: any[],
  state: any
): AsyncGenerator<LanguageModelV2StreamPart> {
  for await (const event of stream) {
    if (!event.chunk) continue

    const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes))

    if (chunk.type === 'message_start') {
      const usage = chunk.message?.usage
      state.inputTokens = usage?.input_tokens || state.inputTokens
      state.outputTokens = usage?.output_tokens || state.outputTokens
    } else if (chunk.type === 'content_block_start') {
      if (chunk.content_block?.type === 'text') {
        state.currentTextId = `text-${chunk.index}`
        yield { type: 'text-start', id: state.currentTextId }
        state.hasTextStarted = true
      } else if (chunk.content_block?.type === 'tool_use') {
        state.currentToolCallId = chunk.content_block.id
        const baseToolName = chunk.content_block.name
        state.currentToolName = toolMapping[baseToolName] || baseToolName
        state.accumulatedToolInput = ''
        state.toolCallCount++

        yield {
          type: 'tool-input-start',
          id: state.currentToolCallId,
          toolName: state.currentToolName
        }
      }
    } else if (chunk.type === 'content_block_delta') {
      if (chunk.delta?.type === 'text_delta') {
        const textDelta = chunk.delta.text || ''

        if (!state.hasTextStarted) {
          yield { type: 'text-start', id: state.currentTextId }
          state.hasTextStarted = true
        }
        yield {
          type: 'text-delta',
          id: state.currentTextId,
          delta: textDelta
        }
      } else if (chunk.delta?.type === 'input_json_delta') {
        const jsonDelta = chunk.delta.partial_json || ''
        state.accumulatedToolInput += jsonDelta

        yield {
          type: 'tool-input-delta',
          id: state.currentToolCallId,
          delta: jsonDelta
        }
      }
    } else if (chunk.type === 'content_block_stop') {
      if (state.hasTextStarted) {
        yield { type: 'text-end', id: state.currentTextId }
        state.hasTextStarted = false
      } else if (state.currentToolCallId) {
        try {
          const rawInput = JSON.parse(state.accumulatedToolInput || '{}')
          const coercedInput = coerceToolInput(state.currentToolName, rawInput, toolSchemas)

          yield { type: 'tool-input-end', id: state.currentToolCallId }
          yield {
            type: 'tool-call',
            toolCallId: state.currentToolCallId,
            toolName: state.currentToolName,
            input: JSON.stringify(coercedInput)
          }
        } catch (e) {
          void e
        }

        state.accumulatedToolInput = ''
        state.currentToolCallId = ''
        state.currentToolName = ''
      }
    } else if (chunk.type === 'message_delta') {
      if (chunk.delta?.stop_reason) {
        state.lastStopReason = chunk.delta.stop_reason
      }

      if (chunk.usage) {
        state.inputTokens = chunk.usage.input_tokens || state.inputTokens
        state.outputTokens = chunk.usage.output_tokens || state.outputTokens
      }
    }
  }

  if (state.hasTextStarted) {
    yield { type: 'text-end', id: state.currentTextId }
  }

  if (!state.hasEmittedFinish) {
    const finalFinishReason = state.lastStopReason
      ? mapClaudeStopReason(state.lastStopReason)
      : 'stop'
    yield {
      type: 'finish',
      finishReason: finalFinishReason,
      usage: {
        inputTokens: state.inputTokens,
        outputTokens: state.outputTokens,
        totalTokens: state.inputTokens + state.outputTokens
      }
    }
  }
}
