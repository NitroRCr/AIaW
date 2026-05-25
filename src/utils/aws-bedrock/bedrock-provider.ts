import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
  ConverseCommand,
  ConverseStreamCommand
} from '@aws-sdk/client-bedrock-runtime'
import type { LanguageModelV2, LanguageModelV2CallOptions } from '@ai-sdk/provider'

import { convertPromptToBedrock } from './prompt-converter'
import { convertBedrockResponse } from './response-converter'
import { createBedrockStream } from './stream-processor'
import { convertAsyncGeneratorToReadableStream, modelIdStartsWith } from './utils'
import type { BedrockConfig, BedrockModelFactory } from './types'

const bedrockErrorMessages = new WeakMap<any, Promise<string | undefined>>()

export function createBedrock(config: BedrockConfig): BedrockModelFactory {
  if (!config.accessKeyId || !config.secretAccessKey || !config.region) {
    throw new Error(
      'AWS Bedrock credentials are incomplete. ' +
      'Please check accessKeyId, secretAccessKey, and region.'
    )
  }

  const client = new BedrockRuntimeClient({
    region: config.region.trim(),
    credentials: {
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim()
    }
  })

  attachBedrockErrorMessageMiddleware(client)

  return (modelId: string): LanguageModelV2 => {
    return {
      specificationVersion: 'v2' as const,
      provider: 'aws-bedrock',
      modelId,
      supportedUrls: {},

      /**
       * Non-streaming generation
       */
      async doGenerate(options: LanguageModelV2CallOptions) {
        const { prompt, ...settings } = options

        const result = convertPromptToBedrock(modelId, prompt, settings)

        const body = result.body || result
        const toolMapping = result.toolMapping || body._toolMapping || {}
        const useConverseApi = result.useConverseApi || body._useConverseApi || false

        delete body._toolMapping
        delete body._useConverseApi

        if ((modelIdStartsWith(modelId, 'amazon.nova') ||
          modelIdStartsWith(modelId, 'mistral.')) && useConverseApi) {
          const commandParams = {
            modelId,
            messages: body.messages,
            toolConfig: body.toolConfig,
            inferenceConfig: body.inferenceConfig,
            system: body.system
          }

          const command = new ConverseCommand(commandParams)

          const response = await client.send(command)
          const converted = convertBedrockResponse(modelId, response, body, toolMapping)
          return converted
        }

        if (modelIdStartsWith(modelId, 'ai21.') && useConverseApi) {
          const commandParams = {
            modelId,
            messages: body.messages,
            toolConfig: body.toolConfig,
            inferenceConfig: body.inferenceConfig,
            system: body.system
          }

          const command = new ConverseCommand(commandParams)

          const response = await client.send(command)

          const converted = convertBedrockResponse(modelId, response, body, toolMapping)

          return converted
        }

        const command = new InvokeModelCommand({
          modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(body)
        })

        const response = await client.send(command)
        const responseBody = JSON.parse(new TextDecoder().decode(response.body))
        const converted = convertBedrockResponse(modelId, responseBody, body, toolMapping)
        return converted
      },

      /**
       * Streaming generation
       */
      async doStream(options: LanguageModelV2CallOptions) {
        const { prompt, ...settings } = options

        if (modelIdStartsWith(modelId, 'mistral.') || modelIdStartsWith(modelId, 'ai21.')) {
          const result = await this.doGenerate(options)

          async function* syntheticStream() {
            yield { type: 'stream-start' as const, warnings: [] }

            for (const item of result.content) {
              if (item.type === 'text') {
                yield { type: 'text-start' as const, id: 'text-0' }
                yield { type: 'text-delta' as const, id: 'text-0', delta: item.text }
                yield { type: 'text-end' as const, id: 'text-0' }
              } else if (item.type === 'tool-call') {
                yield {
                  type: 'tool-input-start' as const,
                  id: item.toolCallId,
                  toolName: item.toolName
                }
                yield {
                  type: 'tool-input-delta' as const,
                  id: item.toolCallId,
                  delta: item.input
                }
                yield { type: 'tool-input-end' as const, id: item.toolCallId }
                yield {
                  type: 'tool-call' as const,
                  toolCallId: item.toolCallId,
                  toolName: item.toolName,
                  input: item.input
                }
              }
            }

            yield {
              type: 'finish' as const,
              finishReason: result.finishReason,
              usage: result.usage
            }
          }

          return {
            stream: convertAsyncGeneratorToReadableStream(syntheticStream()),
            rawCall: {
              rawPrompt: result.request.body,
              rawSettings: settings
            }
          }
        }

        const result = convertPromptToBedrock(modelId, prompt, settings)

        const body = result.body || result
        const toolMapping = result.toolMapping || body._toolMapping || {}
        const useConverseApi = result.useConverseApi || body._useConverseApi || false

        delete body._toolMapping
        delete body._useConverseApi

        if (modelIdStartsWith(modelId, 'amazon.nova') && useConverseApi) {
          const command = new ConverseStreamCommand({
            modelId,
            messages: body.messages,
            toolConfig: body.toolConfig,
            inferenceConfig: body.inferenceConfig,
            system: body.system
          })

          const response = await client.send(command)

          return {
            stream: convertAsyncGeneratorToReadableStream(
              createBedrockStream(
                modelId,
                response.stream,
                toolMapping,
                settings.tools || []
              )
            ),
            rawCall: {
              rawPrompt: body,
              rawSettings: settings
            }
          }
        }

        const command = new InvokeModelWithResponseStreamCommand({
          modelId,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify(body)
        })

        const response = await client.send(command)

        return {
          stream: convertAsyncGeneratorToReadableStream(
            createBedrockStream(
              modelId,
              response.body,
              toolMapping,
              settings.tools || []
            )
          ),
          rawCall: {
            rawPrompt: body,
            rawSettings: settings
          }
        }
      }
    }
  }
}

function attachBedrockErrorMessageMiddleware(client: BedrockRuntimeClient): void {
  const requestHandler = client.config.requestHandler as any
  const originalHandle = requestHandler.handle.bind(requestHandler)

  requestHandler.handle = async (...args: any[]) => {
    const result = await originalHandle(...args)
    const detailedMessage = readBedrockErrorMessage(result.response)

    if (detailedMessage) {
      bedrockErrorMessages.set(result.response, detailedMessage)
    }

    return result
  }

  client.middlewareStack.add(
    (next: any) => async (args: any) => {
      try {
        return await next(args)
      } catch (error) {
        const message = await bedrockErrorMessages.get((error as any)?.$response)
        if (message && error instanceof Error) {
          error.message = message
        }
        throw error
      }
    },
    {
      name: 'bedrockErrorMessageMiddleware',
      step: 'deserialize',
      priority: 'high'
    }
  )
}

async function readBedrockErrorMessage(response: any): Promise<string | undefined> {
  if (!response || response.statusCode < 400 || !response.body) {
    return undefined
  }

  const body = response.body
  let bodyForMessage = body

  if (typeof body.tee === 'function') {
    const [bodyForSdk, clonedBody] = body.tee()
    response.body = bodyForSdk
    bodyForMessage = clonedBody
  } else if (typeof body.getReader === 'function') {
    return undefined
  }

  try {
    const text = await readBodyText(bodyForMessage)
    if (!text) return undefined

    const parsed = JSON.parse(text)
    return parsed.message || parsed.Message || parsed.error?.message
  } catch {
    return undefined
  }
}

async function readBodyText(body: any): Promise<string | undefined> {
  if (typeof body === 'string') {
    return body
  }

  if (body instanceof Uint8Array) {
    return new TextDecoder().decode(body)
  }

  if (body instanceof ArrayBuffer) {
    return new TextDecoder().decode(body)
  }

  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return await body.text()
  }

  if (typeof body.getReader === 'function') {
    const reader = body.getReader()
    const chunks: Uint8Array[] = []
    let totalLength = 0

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalLength += value.length
    }

    const bytes = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.length
    }

    return new TextDecoder().decode(bytes)
  }

  return undefined
}
