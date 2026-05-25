export function coerceToolInput(
  toolName: string,
  rawInput: any,
  toolSchemas: any[]
): any {
  if (!toolSchemas || !Array.isArray(toolSchemas)) {
    return rawInput
  }

  const toolSchema = toolSchemas.find(t => t.name === toolName)
  if (!toolSchema || !toolSchema.inputSchema) {
    return rawInput
  }

  const schema = toolSchema.inputSchema
  const properties = schema.properties || {}
  const coerced: any = { ...rawInput }

  for (const [key, value] of Object.entries(rawInput)) {
    const propSchema = properties[key]
    if (!propSchema) continue

    const targetType = propSchema.type

    if (targetType === 'string') continue

    if (targetType === 'integer' && typeof value === 'string') {
      const parsed = parseInt(value, 10)
      if (!isNaN(parsed)) {
        coerced[key] = parsed
      }
    }

    if (targetType === 'number' && typeof value === 'string') {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) {
        coerced[key] = parsed
      }
    }

    if (targetType === 'boolean' && typeof value === 'string') {
      if (value === 'true') coerced[key] = true
      else if (value === 'false') coerced[key] = false
    }
  }

  return coerced
}
