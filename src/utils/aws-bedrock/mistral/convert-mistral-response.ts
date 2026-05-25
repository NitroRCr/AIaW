import type { StandardResponse } from '../types'

const TOOL_CALL_MARKER = '[TOOL_CALLS]'

function parsePseudoToolCalls(
  text: string,
  toolMapping: { [key: string]: string }
): Array<{ type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; input: string }> {
  const content: Array<{ type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; input: string }> = []
  let cursor = 0
  let callIndex = 0

  while (cursor < text.length) {
    const markerIndex = text.indexOf(TOOL_CALL_MARKER, cursor)

    if (markerIndex === -1) {
      const remainingText = text.slice(cursor)
      if (remainingText.trim()) {
        content.push({ type: 'text', text: remainingText })
      }
      break
    }

    const leadingText = text.slice(cursor, markerIndex)
    if (leadingText.trim()) {
      content.push({ type: 'text', text: leadingText })
    }

    let index = markerIndex + TOOL_CALL_MARKER.length
    while (/\s/.test(text[index])) index++

    const nameStart = index
    while (/[a-zA-Z0-9_-]/.test(text[index])) index++

    const safeToolName = text.slice(nameStart, index)
    while (/\s/.test(text[index])) index++

    if (!safeToolName || text[index] !== '{') {
      content.push({ type: 'text', text: text.slice(markerIndex) })
      break
    }

    const jsonStart = index
    let depth = 0
    let inString = false
    let escaped = false

    for (; index < text.length; index++) {
      const char = text[index]

      if (inString) {
        if (escaped) {
          escaped = false
        } else if (char === '\\') {
          escaped = true
        } else if (char === '"') {
          inString = false
        }
        continue
      }

      if (char === '"') {
        inString = true
      } else if (char === '{') {
        depth++
      } else if (char === '}') {
        depth--
        if (depth === 0) {
          index++
          break
        }
      }
    }

    const rawInput = text.slice(jsonStart, index)
    let input = '{}'

    try {
      input = JSON.stringify(JSON.parse(rawInput))
    } catch {
      input = '{}'
    }

    content.push({
      type: 'tool-call',
      toolCallId: `mistral_tool_${Date.now()}_${callIndex++}`,
      toolName: toolMapping[safeToolName] || safeToolName,
      input
    })

    cursor = index
  }

  return content
}

export function convertMistralResponse(
  responseBody: any,
  toolMapping: { [key: string]: string } = {}
): Partial<StandardResponse> {
  const content: Array<{ type: 'text'; text: string } | { type: 'tool-call'; toolCallId: string; toolName: string; input: any }> = []
  let parsedPseudoToolCall = false

  if (responseBody.output && responseBody.output.message) {
    const message = responseBody.output.message

    if (message.content && Array.isArray(message.content)) {
      for (const block of message.content) {
        if (block.text) {
          if (block.text.includes(TOOL_CALL_MARKER)) {
            const parsedContent = parsePseudoToolCalls(block.text, toolMapping)
            parsedPseudoToolCall ||= parsedContent.some(item => item.type === 'tool-call')
            content.push(...parsedContent)
          } else {
            content.push({
              type: 'text',
              text: block.text
            })
          }
        }

        if (block.toolUse) {
          const toolUse = block.toolUse
          const originalToolName = toolMapping[toolUse.name] || toolUse.name

          const inputString = typeof toolUse.input === 'string'
            ? toolUse.input
            : JSON.stringify(toolUse.input)

          content.push({
            type: 'tool-call',
            toolCallId: toolUse.toolUseId,
            toolName: originalToolName,
            input: inputString
          })
        }
      }
    }
  }

  let finishReason: 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'error' = 'stop'

  if (parsedPseudoToolCall) {
    finishReason = 'tool-calls'
  } else if (responseBody.stopReason) {
    if (responseBody.stopReason === 'tool_use') {
      finishReason = 'tool-calls'
    } else if (responseBody.stopReason === 'max_tokens') {
      finishReason = 'length'
    } else if (responseBody.stopReason === 'content_filtered') {
      finishReason = 'content-filter'
    }
  }

  const usage = {
    inputTokens: responseBody.usage?.inputTokens || 0,
    outputTokens: responseBody.usage?.outputTokens || 0,
    totalTokens: responseBody.usage?.totalTokens || 0
  }

  return {
    content,
    finishReason,
    usage
  }
}
