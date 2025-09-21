import { LobeChatPluginManifest, PluginSchema } from '@lobehub/chat-plugin-sdk'
import { Prompt, Resource, Tool } from '@modelcontextprotocol/sdk/types.js'
import { Any, Array, Boolean, Literal, Null, Number, Object, Optional, Static, String, TSchema, Union } from '@sinclair/typebox'
import { LanguageModelUsage } from 'ai'

interface ModelSettings {
  temperature: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
  maxSteps: number
  maxRetries: number
  maxOutputTokens?: number
  stopSequences?: string[]
  seed?: number
}

type PromptVarValue = string | number | boolean | string[]

interface PromptVar {
  id: string
  name: string
  type: 'text' | 'number' | 'select' | 'multi-select' | 'toggle'
  label?: string
  options?: string[]
  default?: PromptVarValue
}

interface SvgAvatar {
  type: 'svg'
  name: string
  hue?: number
  title?: string
}
interface TextAvatar {
  type: 'text'
  text: string
  hue?: number
  title?: string
}
interface ImageAvatar {
  type: 'image'
  imageId: string
  hue?: number
  title?: string
}
interface UrlAvatar {
  type: 'url'
  url: string
  hue?: number
  title?: string
}
interface IconAvatar {
  type: 'icon'
  icon: string
  hue?: number
  title?: string
}
type Avatar = SvgAvatar | TextAvatar | ImageAvatar | UrlAvatar | IconAvatar

const ProviderSchema = Object({
  type: String(),
  settings: Object(undefined)
})
type Provider = Static<typeof ProviderSchema>
interface ProviderType {
  name: string
  label: string
  avatar: Avatar
  settings: PluginSchema
  initialSettings
  constructor: (settings) => any
  getModelList?: (settings) => Promise<string[]>
}

interface AvatarImage {
  id: string
  contentBuffer: ArrayBuffer
  mimeType: string
}
interface ApiResultItem {
  type: 'text' | 'file' | 'quote'
  contentText?: string
  contentBuffer?: ArrayBuffer
  name?: string
  mimeType?: string
}
interface StoredItem extends ApiResultItem {
  id: string
  dialogId: string
  references: number
}
type StoredItemId = StoredItem['id']

interface UserMessageContent {
  type: 'user-message'
  text: string
  items: StoredItemId[]
}

interface AssistantMessageContent {
  type: 'assistant-message'
  text: string
  reasoning?: string
}

interface AssistantToolContent {
  type: 'assistant-tool'
  pluginId: string
  name: string
  args
  result?: StoredItemId[]
  status: 'calling' | 'failed' | 'completed'
  error?: string
}

type MessageContent = UserMessageContent | AssistantMessageContent | AssistantToolContent

class ApiCallError extends Error { }

interface AssistantPluginInfo {
  name: string
  enabled: boolean
  args
}
type AssistantPluginResource = AssistantPluginInfo

interface AssistantPluginTool {
  name: string
  enabled: boolean
}

interface FileparserData {
  enabled: boolean
  mimeTypes: string[]
}

interface AssistantPluginAction {
  name: string
  enabled: boolean
  autoExecute: boolean
}

interface AssistantPlugin {
  enabled: boolean
  infos: AssistantPluginInfo[]
  tools: AssistantPluginTool[]
  resources: AssistantPluginResource[]
  vars: Record<string, PromptVarValue>
}

interface AssistantPlugins {
  [id: string]: AssistantPlugin
}

interface PluginApi {
  type: 'info' | 'tool'
  infoType?: 'resource' | 'prompt' | 'prompt-var'
  name: string
  description?: string
  prompt?: string
  parameters: PluginSchema
  showComponents?: string[]
  execute(args, settings): Promise<ApiResultItem[]>
}

interface PluginFileparser {
  name: string
  label?: string
  description: string
  rangeInput?: {
    label?: string
    hint?: string
    mask?: string
  }
  execute(args: { file: Blob, range?: string }, settings): Promise<ApiResultItem[]>
}

interface Plugin {
  id: string
  type: 'builtin' | 'lobechat' | 'gradio' | 'mcp'
  available: boolean
  apis: PluginApi[]
  fileparsers: PluginFileparser[]
  title: string
  description?: string
  prompt?: string
  promptVars?: PromptVar[]
  settings: PluginSchema
  noRoundtrip?: boolean
  author?: string
  homepage?: string
}

interface InstalledLobePlugin {
  id: string
  key: string
  type: 'lobechat'
  available: boolean
  manifest: LobeChatPluginManifest
}
interface GradioFileInput {
  name: string
  paramType: 'file'
  mimeTypes: string[]
}
interface GradioRangeInput {
  name: string
  paramType: 'range'
  label?: string
  hint?: string
  mask?: string
}
interface GradioFixedInput {
  name: string
  paramType: 'fixed'
  type: string
  value
  description?: string
}
interface GradioOptionalInput {
  name: string
  description?: string
  paramType: 'optional'
  type: string
  default
}
interface GradioRequiredInput {
  name: string
  description?: string
  paramType: 'required'
  type: string
}
type GradioFileparserInput = GradioFileInput | GradioRangeInput | GradioFixedInput
interface GradioManifestFileparser {
  type: 'fileparser'
  name: string
  description: string
  path: string
  inputs: GradioFileparserInput[]
  outputIdxs: number[]
}
type GradioApiInput = GradioFixedInput | GradioOptionalInput | GradioRequiredInput
interface GradioManifestTool {
  type: 'tool'
  name: string
  description: string
  prompt: string
  path: string
  inputs: GradioApiInput[]
  showComponents?: string[]
  outputIdxs: number[]
}
interface GradioManifestAction {
  type: 'action'
  name: string
  description: string
  prompt: string
  path: string
  inputs: GradioApiInput[]
  showComponents?: string[]
  outputIdxs: number[]
  autoExecute: boolean
}
interface GradioManifestInfo {
  type: 'info'
  infoType?: 'resource' | 'prompt' | 'prompt-var'
  name: string
  description: string
  path: string
  inputs: GradioApiInput[]
  outputIdxs: number[]
}

type GradioManifestEndpoint = GradioManifestFileparser | GradioManifestTool | GradioManifestAction | GradioManifestInfo
interface GradioPluginManifest {
  id: string
  title: string
  description: string
  prompt?: string
  promptVars?: PromptVar[]
  baseUrl: string
  avatar: Avatar
  endpoints: GradioManifestEndpoint[]
  noRoundtrip?: boolean
  author?: string
  homepage?: string
}
const TransportConfSchema = Union([
  Object({
    type: Literal('stdio'),
    command: String(),
    env: Optional(Object(undefined)),
    cwd: Optional(String())
  }),
  Object({
    type: Literal('sse'),
    url: String()
  }),
  Object({
    type: Literal('http'),
    url: String(),
    headers: Optional(Object(undefined))
  })
])
type TransportConf = Static<typeof TransportConfSchema>
const McpPluginManifestSchema = Object({
  id: String(),
  title: String(),
  transport: TransportConfSchema,
  description: Optional(String()),
  avatar: Optional(Object(undefined)),
  noRoundtrip: Optional(Boolean()),
  author: Optional(String()),
  homepage: Optional(String())
})
type McpPluginManifest = Static<typeof McpPluginManifestSchema>
interface McpPluginDump extends McpPluginManifest {
  tools: Tool[]
  resources: Resource[]
  prompts: Prompt[]
}
const GradioPluginManifestSchema = Object({
  id: String(),
  title: String(),
  description: String(),
  baseUrl: String(),
  avatar: Object(undefined),
  endpoints: Array(Object(undefined))
})
const HuggingPluginManifestSchema = Object({
  name: String(),
  description: String(),
  endpoint: String(),
  inputs: Array(Object({
    name: String(),
    description: Optional(String()),
    paramType: Union([Literal('fixed'), Literal('optional'), Literal('required')]),
    type: String(),
    value: Optional(Any()),
    default: Optional(Any()),
    mimeTypes: Optional(String())
  })),
  outputComponent: String(),
  outputComponentIdx: Number(),
  showOutput: Boolean(),
  _id: String(),
  baseUrl: String(),
  displayName: String(),
  color: String(),
  icon: String()
})
const LobePluginManifestSchema = Object({
  api: Array(Object(undefined)),
  identifier: String(),
  meta: Object(undefined),
  type: Optional(Union([Literal('default'), Literal('markdown')]))
})
type HuggingPluginManifest = Static<typeof HuggingPluginManifestSchema>
type PluginManifest = LobeChatPluginManifest | GradioPluginManifest | HuggingPluginManifest | McpPluginManifest
interface InstalledGradioPlugin {
  id: string
  key: string
  type: 'gradio'
  available: boolean
  manifest: GradioPluginManifest
}
interface InstalledMcpPlugin {
  id: string
  key: string
  type: 'mcp'
  available: boolean
  manifest: McpPluginDump
}
type InstalledPlugin = InstalledLobePlugin | InstalledGradioPlugin | InstalledMcpPlugin
interface PluginData {
  settings
  avatar: Avatar
  fileparsers: Record<string, FileparserData>
  timeout?: number
}

type PluginsData = Record<string, PluginData>

interface ModelInputTypes {
  user: string[]
  assistant: string[]
  tool: string[]
}

interface Model {
  name: string
  inputTypes: ModelInputTypes
}

interface Folder {
  id: string
  name: string
  avatar: Avatar
  type: 'folder'
  parentId: string
}

interface Workspace {
  id: string
  name: string
  avatar: Avatar
  type: 'workspace'
  parentId: string
  vars: Record<string, string>
  indexContent: string
  defaultAssistantId?: string
  lastDialogId?: string
  listOpen: {
    assistants: boolean
    artifacts: boolean
    dialogs: boolean
  }
}

interface Dialog {
  id: string
  name: string
  workspaceId: string
  assistantId?: string
  msgTree: Record<string, string[]>
  msgRoute: number[]
  inputVars: Record<string, PromptVarValue>
  modelOverride?: Model
}

interface Message {
  id: string
  type: 'user' | 'assistant'
  assistantId?: string
  dialogId: string
  contents: MessageContent[]
  status: 'pending' | 'streaming' | 'failed' | 'default' | 'inputing'
  generatingSession?: string
  error?: string
  warnings?: string[]
  usage?: LanguageModelUsage
  modelName?: string
}

interface Assistant {
  id: string
  name: string
  avatar: Avatar
  prompt: string
  promptVars: PromptVar[]
  promptTemplate: string
  provider: Provider
  model?: Model
  modelSettings: ModelSettings
  workspaceId: string
  plugins: AssistantPlugins
  promptRole: 'system' | 'user' | 'assistant'
  contextNum?: number
  stream: boolean
  description?: string
  author?: string
  homepage?: string
}

const TSOptional = <T extends TSchema>(schema: T) => Optional(Union([Null(), schema]))
const MarketAssistantSchema = Object({
  name: String(),
  avatar: Object(undefined),
  description: TSOptional(String()),
  prompt: TSOptional(String()),
  promptVars: TSOptional(Array(Object(undefined))),
  promptTemplate: TSOptional(String()),
  model: TSOptional(Object(undefined)),
  modelSettings: TSOptional(Object(undefined)),
  author: TSOptional(String()),
  homepage: TSOptional(String())
})
type MarketAssistant = Static<typeof MarketAssistantSchema>

interface ArtifactVersion {
  date: Date
  text: string
}

interface Artifact {
  id: string
  name: string
  workspaceId: string
  versions: ArtifactVersion[]
  currIndex: number
  readable: boolean
  writable: boolean
  open: boolean
  language?: string
  tmp: string
}

interface StoredReactive {
  key: string
  value
}

interface OrderItem {
  type: 'sync-service' | 'api-budget' | 'api-budget-usd'
  amount: number
}

interface ShortcutKey {
  key: string
  withCtrl?: boolean
  withShift?: boolean
  withAlt?: boolean
}

type PlatformEnabled = 'always' | 'desktop-only' | 'mobile-only' | 'never'

interface ConvertArtifactOptions {
  name?: string
  lang?: string
  reserveOriginal: boolean
}

interface Subprovider {
  id: string
  provider?: Provider
  modelMap: Record<string, string>
}

interface CustomProvider {
  id: string
  name: string
  avatar: Avatar
  subproviders: Subprovider[]
  fallbackProvider?: Provider
}

export {
  ApiCallError,
  HuggingPluginManifestSchema,
  GradioPluginManifestSchema,
  McpPluginManifestSchema,
  LobePluginManifestSchema,
  MarketAssistantSchema,
  ProviderSchema
}
export type {
  Provider,
  ProviderType,
  ModelSettings,
  PromptVar,
  PromptVarValue,
  UserMessageContent,
  AssistantMessageContent,
  AssistantToolContent,
  MessageContent,
  PluginApi,
  Plugin,
  PluginData,
  PluginsData,
  AssistantPluginInfo,
  AssistantPluginTool,
  AssistantPluginAction,
  AssistantPlugin,
  AssistantPlugins,
  Folder,
  Workspace,
  Dialog,
  Message,
  Assistant,
  Artifact,
  StoredReactive,
  StoredItem,
  StoredItemId,
  ApiResultItem,
  AvatarImage,
  Avatar,
  SvgAvatar,
  TextAvatar,
  ImageAvatar,
  UrlAvatar,
  IconAvatar,
  InstalledLobePlugin,
  GradioPluginManifest,
  GradioFixedInput,
  GradioOptionalInput,
  GradioRequiredInput,
  GradioFileInput,
  GradioRangeInput,
  GradioFileparserInput,
  GradioApiInput,
  GradioManifestFileparser,
  GradioManifestTool,
  GradioManifestEndpoint,
  HuggingPluginManifest,
  PluginManifest,
  InstalledPlugin,
  Model,
  ModelInputTypes,
  MarketAssistant,
  OrderItem,
  ShortcutKey,
  PlatformEnabled,
  ConvertArtifactOptions,
  McpPluginDump,
  McpPluginManifest,
  TransportConf,
  Subprovider,
  CustomProvider
}
