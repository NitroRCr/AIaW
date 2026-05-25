function extractBaseToolName(fullName: string): string {
  const match = fullName.match(/^[a-zA-Z0-9]+-(.+)$/) || fullName.match(/^[a-zA-Z0-9]+_(.+)$/)
  const result = match ? match[1] : fullName
  return result
}

function toJambaToolName(toolName: string): string {
  return extractBaseToolName(toolName).replace(/-/g, '_')
}

export function prepareJambaPrompt(prompt: any[]): any[] {
  const separatedPrompt = separateToolResultMessages(prompt)
  const splitPrompt = splitTextAndToolCalls(separatedPrompt)
  const mergedPrompt = mergeConsecutiveAssistantMessages(splitPrompt)

  return insertDummyAssistantMessages(mergedPrompt)
}

export function convertJambaMessage(msg: any): any {
  if (msg.role === 'tool') {
    return {
      role: 'user',
      content: msg.content.map((c: any) => ({
        toolResult: {
          toolUseId: c.toolCallId,
          content: createJambaToolResultContent(c)
        }
      }))
    }
  }

  const processedContent = Array.isArray(msg.content)
    ? msg.content.map(convertJambaContentBlock)
    : [{ text: typeof msg.content === 'string' ? msg.content : '' }]

  const role = msg.role === 'system' ? 'user' : msg.role

  return {
    role,
    content: processedContent
  }
}

export function createJambaToolConfig(tools: any[]): { toolConfig?: any; toolMapping: { [safeName: string]: string } } {
  const toolMapping: { [safeName: string]: string } = {}

  if (!tools || tools.length === 0) {
    return { toolMapping }
  }

  return {
    toolMapping,
    toolConfig: {
      tools: tools.map((tool: any) => {
        const safeName = toJambaToolName(tool.name)

        if (safeName !== tool.name) {
          toolMapping[safeName] = tool.name
        }

        const originalSchema = tool.inputSchema || tool.parameters
        const cleanedSchema = cleanJambaSchema(originalSchema)

        return {
          toolSpec: {
            name: safeName,
            description: tool.description || '',
            inputSchema: {
              json: cleanedSchema
            }
          }
        }
      }),
      toolChoice: { auto: {} }
    }
  }
}

export function createJambaSystemBlocks(prompt: any[]): Array<{ text: string }> {
  const systemText = prompt
    .filter(msg => msg.role === 'system')
    .map(msg => messageContentToText(msg.content))
    .filter(Boolean)
    .join('\n\n')

  if (!systemText) {
    return []
  }

  return [
    systemText,
    ...getJambaPromptHints(systemText)
  ].filter(Boolean).map(text => ({ text }))
}

function convertJambaContentBlock(c: any): any {
  if (c.type === 'text') {
    return { text: c.text }
  }

  if (c.type === 'tool-call') {
    let inputObject
    try {
      inputObject = typeof c.input === 'string' ? JSON.parse(c.input) : c.input
    } catch (e) {
      inputObject = {}
    }

    return {
      toolUse: {
        toolUseId: c.toolCallId,
        name: toJambaToolName(c.toolName),
        input: inputObject
      }
    }
  }

  if (c.type === 'file' && c.mimeType?.startsWith('image/')) {
    const format = c.mimeType.split('/')[1] || 'jpeg'
    return {
      image: {
        format,
        source: { bytes: c.data }
      }
    }
  }

  return c
}

function createJambaToolResultContent(toolResult: any): any[] {
  const actualResult = extractToolResultData(toolResult)

  if (typeof actualResult === 'string') {
    try {
      const trimmed = actualResult.trim()
      const parsed = /^[{[]/.test(trimmed) ? JSON.parse(trimmed) : undefined
      return parsed === undefined ? [{ text: actualResult }] : [{ json: parsed }]
    } catch (e) {
      return [{ text: actualResult }]
    }
  }

  return [{ json: actualResult }]
}

function extractToolResultData(toolResult: any): any {
  if (toolResult.output && toolResult.output.type === 'content' && Array.isArray(toolResult.output.value)) {
    const firstValue = toolResult.output.value[0]

    if (firstValue && firstValue.type === 'text') {
      return firstValue.text
    }

    return JSON.stringify(toolResult.output)
  }

  if (toolResult.result) {
    return typeof toolResult.result === 'string' ? toolResult.result : JSON.stringify(toolResult.result)
  }

  if (toolResult.content) {
    return typeof toolResult.content === 'string' ? toolResult.content : JSON.stringify(toolResult.content)
  }

  return JSON.stringify(toolResult)
}

function messageContentToText(content: any): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((c: any) => {
        if (c.type === 'text') return c.text
        if (c.text) return c.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return content?.text || ''
}

function getJambaPromptHints(systemText: string): string[] {
  const hints: string[] = []

  if (systemText.includes('/emotions/nachoneko/')) {
    hints.push(`Emoticon formatting rules:
- The emoticons are available to you through the system prompt.
- When using an emoticon, output an HTML img tag, not a bare path.
- Use this exact format: <img src="/emotions/nachoneko/1.webp" width="100">
- The file extension must be exactly ".webp".
- Choose one of the listed /emotions/nachoneko/*.webp paths exactly as written.`)
  }

  if (systemText.includes('aiaw-mermaid') || systemText.toLowerCase().includes('mermaid')) {
    hints.push(`Mermaid chart rules:
- Mermaid chart support is available to you through the system prompt.
- When a chart is useful, write a fenced mermaid code block.
- Use this exact fence format:
\`\`\`mermaid
flowchart TD
  A[Start] --> B[End]
\`\`\``)
  }

  return hints
}

function separateToolResultMessages(prompt: any[]): any[] {
  const separated: any[] = []

  for (let i = 0; i < prompt.length; i++) {
    const msg = prompt[i]

    if (msg.role !== 'user') {
      separated.push(msg)
      continue
    }

    const content = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]

    const toolResults = content.filter((c: any) => c.type === 'tool-result')
    const nonToolContent = content.filter((c: any) => c.type !== 'tool-result')

    if (toolResults.length === 0) {
      separated.push(msg)
      continue
    }

    if (nonToolContent.length === 0) {
      separated.push(msg)
      continue
    }

    separated.push({
      role: 'user',
      content: toolResults
    })

    separated.push({
      role: 'user',
      content: nonToolContent
    })
  }

  return separated
}

function splitTextAndToolCalls(prompt: any[]): any[] {
  const split: any[] = []

  for (let i = 0; i < prompt.length; i++) {
    const msg = prompt[i]

    if (msg.role !== 'assistant') {
      split.push(msg)
      continue
    }

    const content = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]

    const textContent = content.filter((c: any) => c.type === 'text')
    const toolCalls = content.filter((c: any) => c.type === 'tool-call')

    if (textContent.length === 0 || toolCalls.length === 0) {
      split.push(msg)
      continue
    }

    if (textContent.length > 0) {
      split.push({
        role: 'assistant',
        content: textContent
      })
    }

    if (toolCalls.length > 0) {
      split.push({
        role: 'assistant',
        content: toolCalls
      })
    }
  }

  return split
}

function mergeConsecutiveAssistantMessages(prompt: any[]): any[] {
  const merged: any[] = []
  let i = 0

  while (i < prompt.length) {
    const currentMsg = prompt[i]

    if (currentMsg.role !== 'assistant') {
      merged.push(currentMsg)
      i++
      continue
    }

    const assistantMessages = [currentMsg]
    let j = i + 1

    while (j < prompt.length && prompt[j].role === 'assistant') {
      assistantMessages.push(prompt[j])
      j++
    }

    if (assistantMessages.length === 1) {
      merged.push(currentMsg)
    } else {
      const hasToolCalls = assistantMessages.some(msg => {
        const content = Array.isArray(msg.content) ? msg.content : []
        return content.some((c: any) => c.type === 'tool-call')
      })

      if (hasToolCalls) {
        const lastWithTools = assistantMessages.reverse().find(msg => {
          const content = Array.isArray(msg.content) ? msg.content : []
          return content.some((c: any) => c.type === 'tool-call')
        })
        if (lastWithTools) {
          merged.push(lastWithTools)
        } else {
          merged.push(assistantMessages[0])
        }
      } else {
        const mergedContent: any[] = []
        for (const msg of assistantMessages) {
          const content = Array.isArray(msg.content) ? msg.content : [{ type: 'text', text: msg.content }]
          mergedContent.push(...content)
        }

        merged.push({
          role: 'assistant',
          content: mergedContent
        })
      }
    }

    i = j
  }

  return merged
}

function insertDummyAssistantMessages(prompt: any[]): any[] {
  const result: any[] = []

  for (let i = 0; i < prompt.length; i++) {
    const current = prompt[i]
    result.push(current)

    if (i + 1 < prompt.length) {
      const next = prompt[i + 1]

      if (current.role === 'tool' && next.role === 'user') {
        const nextContent = Array.isArray(next.content) ? next.content : []
        const nextHasText = nextContent.some((c: any) => c.type === 'text')

        if (nextHasText) {
          result.push({
            role: 'assistant',
            content: [{ type: 'text', text: 'Acknowledged.' }]
          })
        }
      }
    }
  }

  return result
}

function cleanJambaSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const cleaned: any = {}

  const allowedTopLevel = ['type', 'description', 'properties', 'required', 'enum']

  for (const field of allowedTopLevel) {
    if (schema[field] !== undefined) {
      if (field === 'properties') {
        cleaned.properties = {}
        for (const [key, value] of Object.entries(schema.properties)) {
          cleaned.properties[key] = cleanJambaSchemaProperty(value)
        }
      } else {
        cleaned[field] = schema[field]
      }
    }
  }

  return cleaned
}

function cleanJambaSchemaProperty(prop: any): any {
  if (!prop || typeof prop !== 'object') {
    return prop
  }

  const cleaned: any = {}
  const allowedFields = ['type', 'description', 'enum', 'items', 'properties', 'required']

  for (const field of allowedFields) {
    if (prop[field] !== undefined) {
      if (field === 'items') {
        cleaned[field] = cleanJambaSchemaProperty(prop[field])
      } else if (field === 'properties') {
        cleaned[field] = {}
        for (const [key, value] of Object.entries(prop[field])) {
          cleaned[field][key] = cleanJambaSchemaProperty(value)
        }
      } else {
        cleaned[field] = prop[field]
      }
    }
  }

  return cleaned
}
