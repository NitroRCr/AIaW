import { processMessagesForClaude } from './message-processing'
import { processToolsForClaude } from './tool-schema'
import { ConvertedPrompt } from '../types'
import { getMaxOutputTokens } from '../utils'

/**
 * Converts AI SDK prompt to Claude Bedrock format
 *
 * Claude format structure:
 * {
 *   anthropic_version: 'bedrock-2023-05-31',
 *   max_tokens: number,
 *   messages: [{ role: 'user' | 'assistant', content: [...] }],
 *   system?: string,
 *   temperature?: number,
 *   top_p?: number,
 *   tools?: [{ name, description, input_schema }]
 * }
 *
 * @param prompt - AI SDK message array
 * @param settings - Generation settings (maxTokens, temperature, etc)
 * @returns Converted prompt with body and tool mapping
 */
export function convertToClaudeFormat(prompt: any[], settings: any): ConvertedPrompt {
  const messages = processMessagesForClaude(prompt)

  const systemMessage = prompt.find((msg: any) => msg.role === 'system')

  const body: any = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: getMaxOutputTokens(settings, 4096),
    messages
  }

  if (settings.temperature !== undefined) {
    body.temperature = settings.temperature
  } else if (settings.topP !== undefined) {
    body.top_p = settings.topP
  }

  if (systemMessage) {
    body.system = typeof systemMessage.content === 'string'
      ? systemMessage.content
      : systemMessage.content[0]?.text
  }

  let toolMapping = {}
  if (settings.tools && settings.tools.length > 0) {
    const processed = processToolsForClaude(settings.tools)
    body.tools = processed.tools
    toolMapping = processed.toolMapping
  }

  return { body, toolMapping }
}
