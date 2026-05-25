import type { LanguageModelV2FinishReason } from '@ai-sdk/provider'

export function extractBaseToolName(fullName: string): string {
  if (fullName.includes('-')) {
    return fullName.split('-').pop() || fullName
  }
  return fullName
}

export function mapClaudeStopReason(reason: string): LanguageModelV2FinishReason {
  switch (reason) {
    case 'end_turn': return 'stop'
    case 'max_tokens': return 'length'
    case 'stop_sequence': return 'stop'
    case 'tool_use': return 'tool-calls'
    default: return 'stop'
  }
}

export function getMaxOutputTokens(settings: any, fallback: number): number {
  return settings.maxOutputTokens ?? settings.maxTokens ?? fallback
}

const BedrockInferenceProfilePrefixes = ['us', 'eu', 'apac', 'global', 'jp', 'au']

export function getBaseModelId(modelId: string): string {
  const [prefix, ...rest] = modelId.split('.')
  if (rest.length > 0 && BedrockInferenceProfilePrefixes.includes(prefix)) {
    return rest.join('.')
  }
  return modelId
}

export function modelIdStartsWith(modelId: string, prefix: string): boolean {
  return getBaseModelId(modelId).startsWith(prefix)
}

export function convertAsyncGeneratorToReadableStream<T>(
  generator: AsyncGenerator<T>
): ReadableStream<T> {
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          controller.enqueue(chunk)
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    }
  })
}
