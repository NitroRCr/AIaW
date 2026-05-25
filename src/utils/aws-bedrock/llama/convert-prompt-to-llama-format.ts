import { getMaxOutputTokens } from '../utils'
import { createLlamaMessagePrompt, createLlamaSystemPrompt } from './helper-function'

export function convertToLlamaFormat(prompt: any[], settings: any): any {
  const formattedPrompt = [
    '<|begin_of_text|>',
    createLlamaSystemPrompt(prompt, settings.tools || []),
    ...prompt.map(createLlamaMessagePrompt).filter(Boolean),
    '\n<|start_header_id|>assistant<|end_header_id|>\n\n'
  ].join('')

  return {
    prompt: formattedPrompt,
    max_gen_len: getMaxOutputTokens(settings, 2048),
    temperature: settings.temperature || 0.7,
    top_p: settings.topP || 0.9
  }
}
