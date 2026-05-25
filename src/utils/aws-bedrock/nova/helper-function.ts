function extractBaseToolName(fullName: string): string {
  const match = fullName.match(/^[a-zA-Z0-9]+-(.+)$/) || fullName.match(/^[a-zA-Z0-9]+_(.+)$/)
  const result = match ? match[1] : fullName

  return result
}

export function convertNovaMessage(msg: any): any {
  if (msg.role === 'tool') {
    return {
      role: 'user',
      content: msg.content.map((c: any) => ({
        toolResult: {
          toolUseId: c.toolCallId,
          content: createNovaToolResultContent(c),
          status: 'success'
        }
      }))
    }
  }

  const processedContent = Array.isArray(msg.content)
    ? msg.content.map(convertNovaContentBlock)
    : [{ text: typeof msg.content === 'string' ? msg.content : '' }]

  return {
    role: msg.role === 'system' ? 'user' : msg.role,
    content: processedContent
  }
}

export function createNovaToolConfig(tools: any[]): { toolConfig?: any; toolMapping: { [safeName: string]: string } } {
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

        const originalSchema = extractNovaInputSchema(tool)
        const cleanedSchema = cleanNovaSchema(originalSchema)

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

function convertNovaContentBlock(c: any): any {
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
    return {
      image: {
        format: c.mimeType.split('/')[1] || 'jpeg',
        source: { bytes: c.data }
      }
    }
  }

  return c
}

function extractNovaInputSchema(tool: any): any {
  const inputSchema = tool.inputSchema || tool.parameters

  if (inputSchema?.jsonSchema) {
    return inputSchema.jsonSchema
  }

  return inputSchema
}

/**
 * Nova's Converse validator accepts JSON Schema, but rejects malformed schema
 * wrappers and open object fields that are represented as empty objects.
 */
function cleanNovaSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') {
    return schema
  }

  const cleaned: any = {}

  if (schema.type) {
    cleaned.type = schema.type
  }

  if (schema.properties) {
    cleaned.properties = {}
    for (const [key, value] of Object.entries(schema.properties)) {
      cleaned.properties[key] = cleanNovaSchemaProperty(value)
    }
  }

  if (schema.required) {
    cleaned.required = schema.required
  }

  if (schema.additionalProperties !== undefined) {
    cleaned.additionalProperties = schema.additionalProperties
  } else if (cleaned.type === 'object' && !cleaned.properties) {
    cleaned.additionalProperties = true
  }

  return cleaned
}

/**
 * Clean individual property schemas
 */
function cleanNovaSchemaProperty(prop: any): any {
  if (!prop || typeof prop !== 'object') {
    return prop
  }

  const cleaned: any = {}

  const allowedFields = ['type', 'description', 'enum', 'items', 'properties', 'required', 'additionalProperties']

  for (const field of allowedFields) {
    if (prop[field] !== undefined) {
      if (field === 'properties') {
        cleaned.properties = {}
        for (const [key, value] of Object.entries(prop.properties)) {
          cleaned.properties[key] = cleanNovaSchemaProperty(value)
        }
      } else if (field === 'items') {
        cleaned[field] = cleanNovaSchemaProperty(prop[field])
      } else if (field === 'additionalProperties' && typeof prop[field] === 'object') {
        cleaned[field] = cleanNovaSchemaProperty(prop[field])
      } else {
        cleaned[field] = prop[field]
      }
    }
  }

  if (cleaned.type === 'object' && !cleaned.properties && cleaned.additionalProperties === undefined) {
    cleaned.additionalProperties = true
  }

  return cleaned
}

function createNovaToolResultContent(toolResult: any): any[] {
  const resultData = extractToolResultData(toolResult)

  if (Array.isArray(resultData)) {
    const textContent = resultData
      .filter((item: any) => item.type === 'text')
      .map((item: any) => item.text || item.contentText)
      .filter(Boolean)
      .join('\n')

    return textContent ? stringToNovaContent(textContent) : resultToNovaContent(resultData)
  }

  if (typeof resultData === 'string') {
    return stringToNovaContent(resultData)
  }

  if (resultData && typeof resultData === 'object') {
    return resultToNovaContent(resultData)
  }

  return [{ text: String(resultData ?? '') }]
}

function extractToolResultData(toolResult: any): any {
  if (toolResult.output?.type === 'content' && Array.isArray(toolResult.output.value)) {
    return toolResult.output.value
  }

  return toolResult.result ?? toolResult.content ?? toolResult
}

function stringToNovaContent(text: string): any[] {
  try {
    return resultToNovaContent(JSON.parse(text), text)
  } catch {
    return [{ text }]
  }
}

function resultToNovaContent(value: any, fallbackText = JSON.stringify(value)): any[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return [{ json: value }]
  }

  return [{ text: fallbackText ?? String(value ?? '') }]
}
