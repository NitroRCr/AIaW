/* eslint-disable yield-star-spacing */

import type { LanguageModelV2StreamPart, LanguageModelV2CallWarning } from '@ai-sdk/provider'
import type { ToolNameMapping } from './types'
import { processClaudeStream } from './claude/claude-stream-processor'
import { processLlamaStream } from './llama/llama-stream-processor'
import { processNovaConverseStream } from './nova/nova-stream-processor'
import { processJambaStream } from './jamba/jamba-stream-processor'
import { processMistralStream } from './mistral/mistral-stream-processor'
import { modelIdStartsWith } from './utils'

export async function* createBedrockStream(
  modelId: string,
  stream: any,
  toolMapping: ToolNameMapping = {},
  toolSchemas: any[] = []
): AsyncGenerator<LanguageModelV2StreamPart> {
  const currentTextId = 'text-0'
  const currentToolCallId = ''
  const currentToolName = ''
  const hasTextStarted = false
  const accumulatedToolInput = ''
  const hasEmittedFinish = false
  const toolCallCount = 0
  const inputTokens = 0
  const outputTokens = 0
  let lastStopReason: string | undefined
  const warnings: LanguageModelV2CallWarning[] = []

  yield {
    type: 'stream-start',
    warnings
  }

  if (modelIdStartsWith(modelId, 'anthropic.')) {
    yield* processClaudeStream(
      stream,
      toolMapping,
      toolSchemas,
      {
        currentTextId,
        currentToolCallId,
        currentToolName,
        hasTextStarted,
        accumulatedToolInput,
        hasEmittedFinish,
        toolCallCount,
        inputTokens,
        outputTokens,
        lastStopReason
      }
    )
    return
  }

  if (modelIdStartsWith(modelId, 'meta.llama')) {
    yield* processLlamaStream(stream, { currentTextId, hasTextStarted, hasEmittedFinish })
    return
  }

  if (modelIdStartsWith(modelId, 'mistral.')) {
    yield* processMistralStream(stream, toolMapping)
    return
  }

  if (modelIdStartsWith(modelId, 'amazon.nova')) {
    yield* processNovaConverseStream(stream, toolMapping)
    return
  }

  if (modelIdStartsWith(modelId, 'ai21.')) {
    yield* processJambaStream(stream, toolMapping)
    return
  }

  throw new Error(`AWS Bedrock model ${modelId} is not currently supported.`)
}
