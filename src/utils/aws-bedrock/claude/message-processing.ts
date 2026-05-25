export function convertMessages(prompt: any[]): any[] {
  return prompt.map((msg: any) => {
    if (msg.role === 'system') {
      return null
    }

    if (msg.role === 'tool') {
      return {
        role: 'user',
        content: msg.content.map((c: any) => {
          const resultData = c.output || c.result

          let contentText
          if (resultData && typeof resultData === 'object' && resultData.type === 'content' && resultData.value) {
            contentText = resultData.value
              .map((v: any) => v.type === 'text' ? v.text : JSON.stringify(v))
              .join('\n')
          } else {
            contentText = typeof resultData === 'string' ? resultData : JSON.stringify(resultData)
          }

          return {
            type: 'tool_result',
            tool_use_id: c.toolCallId,
            content: contentText
          }
        })
      }
    }

    return {
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: Array.isArray(msg.content)
        ? msg.content.map((c: any) => {
          if (c.type === 'text') return { type: 'text', text: c.text }

          if (c.type === 'tool-call') {
            // Parse tool call arguments
            let parsedInput = {}

            if (typeof c.input === 'string') {
              try {
                parsedInput = JSON.parse(c.input)
              } catch (e) {
                void e
              }
            } else if (c.input && typeof c.input === 'object') {
              parsedInput = c.input
            } else if (c.args) {
              parsedInput = c.args
            }

            return {
              type: 'tool_use',
              id: c.toolCallId,
              name: c.toolName,
              input: parsedInput
            }
          }

          if (c.type === 'file' && c.mimeType?.startsWith('image/')) {
            return {
              type: 'image',
              source: {
                type: 'base64',
                media_type: c.mimeType,
                data: c.data
              }
            }
          }

          return c
        })
        : typeof msg.content === 'string'
          ? [{ type: 'text', text: msg.content }]
          : msg.content
    }
  }).filter(Boolean)
}

export function filterEmptyMessages(messages: any[]): any[] {
  return messages.filter(msg => {
    if (Array.isArray(msg.content)) {
      return msg.content.length > 0
    }
    return msg.content && msg.content !== ''
  })
}

export function mergeConsecutiveMessages(messages: any[]): any[] {
  const merged = []

  for (let i = 0; i < messages.length; i++) {
    const current = messages[i]

    if (i + 1 < messages.length && messages[i + 1].role === current.role) {
      const mergedContent = [...(Array.isArray(current.content) ? current.content : [current.content])]
      let j = i + 1

      while (j < messages.length && messages[j].role === current.role) {
        const nextContent = messages[j].content
        mergedContent.push(...(Array.isArray(nextContent) ? nextContent : [nextContent]))
        j++
      }

      merged.push({
        role: current.role,
        content: mergedContent
      })

      i = j - 1
    } else {
      merged.push(current)
    }
  }

  return merged
}

export function processMessagesForClaude(prompt: any[]): any[] {
  const converted = convertMessages(prompt)
  const filtered = filterEmptyMessages(converted)
  const merged = mergeConsecutiveMessages(filtered)
  return merged
}
