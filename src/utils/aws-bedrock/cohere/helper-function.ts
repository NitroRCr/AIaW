function extractBaseToolName(fullName: string): string {
  const match = fullName.match(/^[a-zA-Z0-9]+-(.+)$/) || fullName.match(/^[a-zA-Z0-9]+_(.+)$/)
  const result = match ? match[1] : fullName
  return result
}

export function prepareCoherePrompt(prompt: any[]): any[] {
  const separatedPrompt = separateToolResultMessages(prompt)
  const mergedPrompt = mergeConsecutiveAssistantMessages(separatedPrompt)

  return insertDummyAssistantMessages(mergedPrompt)
}

export function convertCohereMessage(msg: any): any {
  if (msg.role === 'tool') {
    return {
      role: 'user',
      content: msg.content.map((c: any) => ({
        toolResult: {
          toolUseId: c.toolCallId,
          content: createCohereToolResultContent(c)
        }
      }))
    }
  }

  const processedContent = Array.isArray(msg.content)
    ? msg.content.map(convertCohereContentBlock)
    : [{ text: typeof msg.content === 'string' ? msg.content : '' }]

  const role = msg.role === 'system' ? 'user' : msg.role

  return {
    role,
    content: processedContent
  }
}

export function createCohereToolConfig(tools: any[]): { toolConfig?: any; toolMapping: { [safeName: string]: string } } {
  const toolMapping: { [safeName: string]: string } = {}

  if (!tools || tools.length === 0) {
    return { toolMapping }
  }

  return {
    toolMapping,
    toolConfig: {
      tools: tools.map((tool: any) => {
        const baseName = extractBaseToolName(tool.name)
        const safeName = baseName.replace(/-/g, '_')

        if (safeName !== tool.name) {
          toolMapping[safeName] = tool.name
        }

        const originalSchema = tool.inputSchema || tool.parameters
        const cleanedSchema = cleanCohereSchema(originalSchema)

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

export function createCohereSystemBlocks(prompt: any[]): Array<{ text: string }> {
  return prompt
    .filter(msg => msg.role === 'system')
    .map(msg => {
      const text = typeof msg.content === 'string' ? msg.content : msg.content[0]?.text || ''
      return { text }
    })
}

function convertCohereContentBlock(c: any): any {
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
        name: c.toolName,
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

function createCohereToolResultContent(toolResult: any): any[] {
  const actualResult = extractToolResultData(toolResult)

  if (typeof actualResult === 'string') {
    try {
      const parsed = JSON.parse(actualResult)
      return [{ json: parsed }]
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

function cleanCohereSchema(schema: any): any {
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
          cleaned.properties[key] = cleanCohereSchemaProperty(value)
        }
      } else {
        cleaned[field] = schema[field]
      }
    }
  }

  return cleaned
}

function cleanCohereSchemaProperty(prop: any): any {
  if (!prop || typeof prop !== 'object') {
    return prop
  }

  const cleaned: any = {}
  const allowedFields = ['type', 'description', 'enum', 'items', 'properties', 'required']

  for (const field of allowedFields) {
    if (prop[field] !== undefined) {
      if (field === 'items') {
        cleaned[field] = cleanCohereSchemaProperty(prop[field])
      } else if (field === 'properties') {
        cleaned[field] = {}
        for (const [key, value] of Object.entries(prop[field])) {
          cleaned[field][key] = cleanCohereSchemaProperty(value)
        }
      } else {
        cleaned[field] = prop[field]
      }
    }
  }

  return cleaned
}
