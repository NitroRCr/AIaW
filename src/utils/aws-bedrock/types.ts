import type {
  LanguageModelV2,
  LanguageModelV2CallWarning,
  LanguageModelV2FinishReason
  // LanguageModelV2Options
} from '@ai-sdk/provider'

export interface BedrockConfig {
  region: string
  accessKeyId: string
  secretAccessKey: string
}

export type BedrockModelFactory = (modelId: string) => LanguageModelV2

export type ToolNameMapping = Record<string, string>

export interface BedrockRequestBody {
  [key: string]: any
  _toolMapping?: ToolNameMapping
}

export interface ConvertedPrompt {
  body: BedrockRequestBody
  toolMapping?: ToolNameMapping
}

export interface StandardResponse {
  content: any[]
  finishReason: LanguageModelV2FinishReason
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  request: {
    body: string
  }
  response: {
    id: string
    timestamp: Date
  }
  warnings: LanguageModelV2CallWarning[]
}
