export function createLlamaSystemPrompt(prompt: any[], tools: any[] = []): string {
  const systemPrompts = prompt
    .filter((msg: any) => msg.role === 'system')
    .map((msg: any) => messageContentToText(msg.content))
    .filter(Boolean)
  const systemSections = [...systemPrompts]
  const systemText = systemPrompts.join('\n\n')

  if (tools.length > 0) {
    systemSections.push(createLlamaToolInstructions(tools))
  }

  systemSections.push(...getLlamaPromptHints(systemText))

  if (systemSections.length === 0) {
    return ''
  }

  return `<|start_header_id|>system<|end_header_id|>\n\n${systemSections.join('\n\n')}<|eot_id|>`
}

export function createLlamaMessagePrompt(msg: any): string {
  if (msg.role === 'system') {
    return ''
  }

  if (msg.role === 'tool') {
    return `<|start_header_id|>user<|end_header_id|>\n\n${createLlamaToolResultText(msg.content)}<|eot_id|>`
  }

  const role = msg.role === 'user' ? 'user' : 'assistant'
  const content = messageContentToPromptText(msg.content)

  return `<|start_header_id|>${role}<|end_header_id|>\n\n${content}<|eot_id|>`
}

function createLlamaToolInstructions(tools: any[]): string {
  const toolDescriptions = tools.map((tool: any) => {
    const schema = tool.inputSchema || tool.parameters
    let paramsStr = '{}'
    if (schema) {
      if (typeof schema === 'object') {
        paramsStr = JSON.stringify(schema, null, 2)
      } else {
        paramsStr = String(schema)
      }
    }

    return `### ${tool.name}
${tool.description}

Parameters: ${paramsStr}`
  }).join('\n\n')

  return `You are a helpful assistant with access to tools.

CRITICAL INSTRUCTIONS:

1. To call a tool, respond with ONLY this JSON format (nothing else):
{"tool": "tool_name", "parameters": {...}}

2. After receiving tool results, you will see the actual data returned.
3. Read the JSON data carefully and provide a response based on what you see.
4. The tool results are real data - never say "undefined" or "no data returned".

Available tools:

${toolDescriptions}`
}

function messageContentToPromptText(content: any): string {
  if (!Array.isArray(content)) {
    return typeof content === 'string' ? content : content[0]?.text || ''
  }

  return content.map((c: any) => {
    if (c.type === 'text') return c.text
    if (c.type === 'tool-call') {
      return `{"tool": "${c.toolName}", "parameters": ${JSON.stringify(parseToolInput(c))}}`
    }
    return ''
  }).filter(Boolean).join('\n')
}

function messageContentToText(content: any): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((c: any) => {
        if (c.type === 'text') return c.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }

  return content?.text || ''
}

function parseToolInput(content: any): any {
  if (content.input !== undefined) {
    return content.input
  }

  if (content.args !== undefined) {
    return content.args
  }

  return {}
}

function createLlamaToolResultText(content: any[]): string {
  return content.map((c: any) => {
    const parsedResult = parseToolResult(c)
    const toolName = c.toolName || 'unknown'
    const resultStr = typeof parsedResult === 'string'
      ? parsedResult
      : JSON.stringify(parsedResult, null, 2)

    return `TOOL RESULT from "${toolName}":

${resultStr}

Analyze this data and respond to the user based on what it says.`
  }).join('\n\n')
}

function parseToolResult(content: any): any {
  let parsedResult = null
  const resultData = content.output?.value || content.result

  if (!resultData) {
    return 'No data returned'
  }

  if (Array.isArray(resultData)) {
    for (const item of resultData) {
      if (item.type === 'text') {
        const text = item.text || item.contentText

        if (text) {
          try {
            parsedResult = JSON.parse(text)
            break
          } catch {
            parsedResult = text
            break
          }
        }
      }
    }

    return parsedResult || resultData
  }

  if (typeof resultData === 'string') {
    try {
      return JSON.parse(resultData)
    } catch {
      return resultData
    }
  }

  return resultData
}

function getLlamaPromptHints(systemText: string): string[] {
  const hints: string[] = []

  if (systemText.includes('/emotions/nachoneko/')) {
    hints.push(`Emoticon formatting rules:
- When using an emoticon, output an HTML img tag, not a bare path.
- Use this exact format: <img src="/emotions/nachoneko/1.webp" width="100">
- The file extension must be exactly ".webp". Do not write ".webpt".
- Choose one of the listed /emotions/nachoneko/*.webp paths exactly as written.`)
  }

  return hints
}
