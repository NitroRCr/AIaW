import { Client as GradioClient } from "@gradio/client"
import {
  createHeadersWithPluginSettings,
  LobeChatPluginManifest,
  PluginSchema,
} from "@lobehub/chat-plugin-sdk"
import {
  CallToolResult,
  GetPromptResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js"
import {
  Boolean as TBoolean,
  Number as TNumber,
  Object as TObject,
  Optional as TOptional,
  String as TString,
} from "@sinclair/typebox"
import { Parser } from "expr-eval"

import {
  GradioFixedInput,
  GradioManifestEndpoint,
  GradioPluginManifest,
  GradioApiInput,
  HuggingPluginManifest,
  Plugin,
  PluginApi,
  PluginData,
  PluginsData,
  McpPluginDump,
  McpPluginManifest,
  Avatar,
} from "@/shared/types"
import { DocParseBaseURL } from "@/shared/utils/config"
import { corsFetch } from "@/shared/utils/corsFetch"
import {
  base64ToArrayBuffer,
  defaultTextAvatar,
  parsePageRange,
  parseSeconds,
} from "@/shared/utils/functions"
import { IsTauri } from "@/shared/utils/platformApi"

import { parseDoc } from "@/features/artifacts/utils/docParse"
import { AudioEncoderSupported, extractAudioBlob } from "@/features/media/utils/audioProcess"

import artifacts from "../buildin/artifactsPlugin"
import webSearchPlugin from "../buildin/webSearchPlugin"

import { getClient } from "./mcpClient"

import { i18n } from "@/boot/i18n"

const { t } = i18n.global

const timePlugin: Plugin = {
  id: "aiaw-time",
  type: "builtin",
  available: false, // Disable it as it's useless
  apis: [
    {
      type: "tool",
      name: "getTime",
      description: t("plugins.time.description"),
      prompt: t("plugins.time.prompt"),
      parameters: TObject({}),
      async execute() {
        return [
          {
            type: "text",
            contentText: new Date().toString(),
          },
        ]
      },
    },
  ],
  fileparsers: [],
  settings: TObject({}),
  title: t("plugins.time.title"),
  description: t("plugins.time.description"),
}

const calculatorPrompt = `Use this tool to evaluate mathetical expressions. The calculator is based on the \`expr-eval\` js library.

Examples:

<example>
<args>
{
  "expression": "2 * 4!"
}
</args>
<r>
48
</r>
</example>
<example>
<args>
{
  "expression": "sqrt(9) + x ^ y",
  "variables": { "x": 2, "y": 3 }
}
</args>
<r>
11
</r>
</example>
`

const calculatorExpressionPrompt = `### Expression Syntax ###

The parser accepts a pretty basic grammar. It's similar to normal JavaScript
expressions, but is more math-oriented. For example, the \`^\` operator is
exponentiation, not xor.

#### Unary operators

The parser has several built-in "functions" that are actually unary operators.
The primary difference between these and functions are that they can only accept
exactly one argument, and parentheses are optional. With parentheses, they have
the same precedence as function calls, but without parentheses, they keep their
normal precedence (just below \`^\`). For example, \`sin(x)^2\` is equivalent to
\`(sin x)^2\`, and \`sin x^2\` is equivalent to \`sin(x^2)\`.

The unary \`+\` and \`-\` operators are an exception, and always have their normal
precedence.

Operator | Description
:------- | :----------
-x       | Negation
+x       | Unary plus. This converts it's operand to a number, but has no other effect.
x!       | Factorial (x * (x-1) * (x-2) * … * 2 * 1). gamma(x + 1) for non-integers.
abs x    | Absolute value (magnitude) of x
acos x   | Arc cosine of x (in radians)
acosh x  | Hyperbolic arc cosine of x (in radians)
asin x   | Arc sine of x (in radians)
asinh x  | Hyperbolic arc sine of x (in radians)
atan x   | Arc tangent of x (in radians)
atanh x  | Hyperbolic arc tangent of x (in radians)
cbrt x   | Cube root of x
ceil x   | Ceiling of x — the smallest integer that's >= x
cos x    | Cosine of x (x is in radians)
cosh x   | Hyperbolic cosine of x (x is in radians)
exp x    | e^x (exponential/antilogarithm function with base e)
expm1 x  | e^x - 1
floor x  | Floor of x — the largest integer that's <= x
length x | String or array length of x
ln x     | Natural logarithm of x
log x    | Natural logarithm of x (synonym for ln, not base-10)
log10 x  | Base-10 logarithm of x
log2 x   | Base-2 logarithm of x
log1p x  | Natural logarithm of (1 + x)
not x    | Logical NOT operator
round x  | X, rounded to the nearest integer, using "grade-school rounding"
sign x   | Sign of x (-1, 0, or 1 for negative, zero, or positive respectively)
sin x    | Sine of x (x is in radians)
sinh x   | Hyperbolic sine of x (x is in radians)
sqrt x   | Square root of x. Result is NaN (Not a Number) if x is negative.
tan x    | Tangent of x (x is in radians)
tanh x   | Hyperbolic tangent of x (x is in radians)
trunc x  | Integral part of a X, looks like floor(x) unless for negative number

#### Pre-defined functions

Besides the "operator" functions, there are several pre-defined functions. You
can provide your own, by binding variables to normal JavaScript functions.
These are not evaluated by simplify.

Function      | Description
:------------ | :----------
random(n)     | Get a random number in the range [0, n). If n is zero, or not provided, it defaults to 1.
min(a,b,…)    | Get the smallest (minimum) number in the list.
max(a,b,…)    | Get the largest (maximum) number in the list.
hypot(a,b)    | Hypotenuse, i.e. the square root of the sum of squares of its arguments.
pyt(a, b)     | Alias for hypot.
pow(x, y)     | Equivalent to x^y. For consistency with JavaScript's Math object.
atan2(y, x)   | Arc tangent of x/y. i.e. the angle between (0, 0) and (x, y) in radians.
roundTo(x, n) | Rounds x to n places after the decimal point.

#### Constants

The parser also includes a number of pre-defined constants that can be used in expressions. These are shown
in the table below:

Constant     | Description
:----------- | :----------
E            | The value of \`Math.E\` from JavaScript runtime
PI           | The value of \`Math.PI\` from JavaScript runtime`

const calculatorPlugin: Plugin = {
  id: "aiaw-calculator",
  type: "builtin",
  available: true,
  apis: [
    {
      type: "tool",
      name: "evaluate",
      description: t("plugins.calculator.description"),
      prompt: calculatorPrompt,
      parameters: TObject({
        expression: TString({ description: calculatorExpressionPrompt }),
        variables: TOptional(TObject(undefined, { description: "Variables" })),
      }),
      async execute({ expression, variables }) {
        return [
          {
            type: "text",
            contentText: Parser.evaluate(expression, variables).toString(),
          },
        ]
      },
    },
  ],
  fileparsers: [],
  settings: TObject({}),
  title: t("plugins.calculator.title"),
  description: t("plugins.calculator.description"),
}

/**
 * Options for building a plugin
 */
interface PluginBuilderOptions {
  /** Whether the plugin is available for use */
  available?: boolean;
  /** Custom settings to merge with plugin defaults */
  customSettings?: Record<string, any>;
}

/**
 * Builds a LobeChatPlugin from a manifest
 *
 * @param manifest - The LobeChatPlugin manifest
 * @param options - Options for building the plugin
 * @returns The constructed plugin
 */
function buildLobePlugin(
  manifest: LobeChatPluginManifest,
  options?: PluginBuilderOptions
): Plugin {
  const { available = true, customSettings = {} } = options || {}
  const { identifier, meta, settings } = manifest
  const title = meta.title ?? identifier

  return {
    available,
    apis: manifest.api.map(({ description, name, parameters, url }) => ({
      type: "tool",
      name,
      description,
      prompt: description,
      parameters,
      showComponents: manifest.type === "markdown" ? ["markdown"] : undefined,
      async execute(args, settings) {
        const res = await corsFetch(url, {
          method: "POST",
          body: JSON.stringify(args),
          headers: createHeadersWithPluginSettings(settings) as Record<string, string>,
        })

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)

        return [
          {
            type: "text",
            contentText: await res.text(),
          },
        ]
      },
    })),
    fileparsers: [],
    id: `lobe-${identifier}`,
    type: "lobechat",
    title,
    description: meta.description,
    prompt: manifest.systemRole ?? meta.description,
    settings: settings ?? TObject({}),
    noRoundtrip: manifest.type === "markdown",
    author: manifest.author,
    homepage: manifest.homepage,
    ...customSettings
  }
}

function buildHuggingParams(inputs: HuggingPluginManifest["inputs"]) {
  const obj = {}
  for (const input of inputs) {
    if (input.paramType === "fixed") continue

    const opt = { description: input.description }
    let type

    if (input.type === "str") type = TString(opt)
    else if (input.type === "float" || input.type === "int") type = TNumber(opt)
    else if (input.type === "bool") type = TBoolean(opt)
    else continue

    if (input.paramType === "optional") type = TOptional(type)

    obj[input.name] = type
  }

  return TObject(obj)
}

function buildGradioSettings(endpoint: GradioManifestEndpoint) {
  const obj = {}
  for (const input of endpoint.inputs) {
    if (
      input.paramType === "required" ||
      input.paramType === "file" ||
      input.paramType === "range"
    ) {
      continue
    }

    const title = `${endpoint.name}.${input.name}`
    const opt = {
      description: input.description,
      title: input.paramType === "optional" ? `${title} 默认值` : title,
    }
    let type

    if (input.type === "str") type = TString(opt)
    else if (input.type === "float" || input.type === "int") type = TNumber(opt)
    else if (input.type === "bool") type = TBoolean(opt)
    else continue

    obj[input.name] = type
  }

  return TObject(obj)
}

/**
 * Builds a Gradio plugin from a manifest
 *
 * @param manifest - The Gradio plugin manifest
 * @param options - Options for building the plugin
 * @returns The constructed plugin
 */
function buildGradioPlugin(
  manifest: GradioPluginManifest,
  options?: PluginBuilderOptions
): Plugin {
  const { available = true } = options || {}
  const { id, title, description, prompt, promptVars, noRoundtrip } = manifest
  const settings = {
    _hfToken: TOptional(
      TString({
        title: "HF Token",
        description: "Hugging Face API Token",
        format: "password",
      })
    ),
  }
  for (const endpoint of manifest.endpoints) {
    settings[endpoint.name] = buildGradioSettings(endpoint)
  }

  async function predict(endpoint: GradioManifestEndpoint, args, settings) {
    const options = settings._hfToken
      ? { hf_token: settings._hfToken }
      : undefined
    console.log("----GradioPlugin predict", manifest, options)
    const app = await GradioClient.connect(manifest.baseUrl, options)
    const { data } = await app.predict(endpoint.path, {
      ...settings[endpoint.name],
      ...args,
    })

    return await Promise.all(
      endpoint.outputIdxs.map(async (i) => {
        const d = data[i]

        if (typeof d === "object" && d.url) {
          const resp = await fetch(d.url)
          const blob = await resp.blob()

          return {
            type: "file" as const,
            mimeType: blob.type,
            contentBuffer: await blob.arrayBuffer(),
            name: d.orig_name,
          }
        }

        return {
          type: "text" as const,
          contentText: d,
        }
      })
    )
  }
  const infos: PluginApi[] = manifest.endpoints
    .filter((e) => e.type === "info")
    .map((e) => {
      const { name, description, infoType } = e

      return {
        type: "info",
        infoType: infoType ?? "prompt-var",
        name,
        description,
        prompt: description,
        parameters: buildHuggingParams(e.inputs),
        async execute(args, settings) {
          return await predict(e, args, settings)
        },
      }
    })
  const tools: PluginApi[] = manifest.endpoints
    .filter((e) => e.type === "tool")
    .map((e) => {
      const { name, description, showComponents } = e

      return {
        type: "tool",
        name,
        description,
        prompt: description,
        parameters: buildHuggingParams(e.inputs),
        showComponents,
        async execute(args, settings) {
          return await predict(e, args, settings)
        },
      }
    })
  const fileparsers = manifest.endpoints
    .filter((e) => e.type === "fileparser")
    .map((e) => {
      const fileInput = e.inputs.find((i) => i.paramType === "file")
      const rangeInput = e.inputs.find((i) => i.paramType === "range")

      return {
        name: e.name,
        description: e.description,
        rangeInput: rangeInput
          ? {
              label: rangeInput.label,
              hint: rangeInput.hint,
              mask: rangeInput.mask,
            }
          : undefined,
        async execute({ file, range }, settings) {
          const args: any = { [fileInput.name]: file }

          if (rangeInput) args[rangeInput.name] = range

          return await predict(e, args, settings)
        },
      }
    })

  return {
    id,
    type: "gradio",
    available,
    title,
    description,
    prompt,
    promptVars,
    noRoundtrip,
    settings: TObject(settings),
    apis: [...infos, ...tools],
    fileparsers,
    author: manifest.author,
    homepage: manifest.homepage,
  }
}

/**
 * Builds an MCP plugin from a dump
 *
 * @param dump - The MCP plugin dump
 * @param options - Options for building the plugin
 * @returns The constructed plugin
 */
function buildMcpPlugin(
  dump: McpPluginDump,
  options?: PluginBuilderOptions
): Plugin {
  const { available = true } = options || {}
  const resourceToResultItem = (resource, name?) =>
    resource.text
      ? {
          type: "text" as const,
          name,
          contentText: `<resource uri="${resource.uri}">\n${resource.text}\n</resource>`,
        }
      : {
          type: "file" as const,
          name,
          contentBuffer: base64ToArrayBuffer(resource.blob as string),
          mimeType: resource.mimeType,
        }
  const { id, title, description, transport, noRoundtrip, author, homepage } =
    dump
  const tools: PluginApi[] = dump.tools.map((tool) => ({
    type: "tool",
    name: tool.name,
    description: tool.description,
    prompt: tool.description,
    parameters: tool.inputSchema as PluginSchema,
    async execute(args, settings) {
      const client = await getClient(id, { type: transport.type, ...settings })
      const res: CallToolResult = await client.callTool({
        name: tool.name,
        arguments: args,
      })

      return res.content.map((i) => {
        if (i.type === "text") {
          return {
            type: "text" as const,
            contentText: i.text,
          }
        } else if (i.type === "image") {
          return {
            type: "file" as const,
            contentBuffer: base64ToArrayBuffer(i.data),
            mimeType: i.mimeType,
          }
        } else {
          // type: 'resource'
          return resourceToResultItem(
            i.resource,
            (i.resource as { uri: string }).uri
          )
        }
      })
    },
  }))
  const resources: PluginApi[] = dump.resources.map((resource) => {
    const { name, description, uri } = resource

    return {
      type: "info",
      infoType: "resource",
      name,
      description,
      parameters: TObject({}),
      async execute(args, settings) {
        const client = await getClient(id, {
          type: transport.type,
          ...settings,
        })
        const res: ReadResourceResult = await client.readResource({ uri })

        return res.contents.map((c) => resourceToResultItem(c, name))
      },
    }
  })
  const prompts: PluginApi[] = dump.prompts.map((prompt) => {
    const { name, description } = prompt
    const params: Record<string, any> = {}
    prompt.arguments.forEach((arg) => {
      const t = TString({ title: arg.name, description: arg.description })
      params[arg.name] = arg.required ? t : TOptional(t)
    })

    return {
      type: "info",
      infoType: "prompt",
      name,
      description,
      parameters: TObject(params),
      async execute(args, settings) {
        const client = await getClient(id, {
          type: transport.type,
          ...settings,
        })
        const res: GetPromptResult = await client.getPrompt({
          name,
          arguments: args,
        })

        return res.messages.map((m) => {
          const { content } = m

          if (content.type === "text") {
            return {
              type: "text",
              name,
              contentText: content.text,
            }
          } else if (content.type === "image") {
            return {
              type: "file",
              name,
              contentBuffer: base64ToArrayBuffer(content.data),
              mimeType: content.mimeType,
            }
          } else {
            // type: 'resource'
            return resourceToResultItem(
              content.resource,
              (content.resource as { uri: string }).uri
            )
          }
        })
      },
    }
  })
  let settings: Record<string, any>

  if (transport.type === "stdio") {
    const env: Record<string, any> = {}
    settings = {
      command: TString({ title: t("plugins.mcp.runCommand") }),
      cwd: TOptional(TString({ title: t("plugins.mcp.cwd") })),
    }

    if (transport.env) {
      for (const key in transport.env) {
        env[key] = TString()
      }
      settings.env = TObject(env)
    }
  } else {
    settings = {
      url: TString({ title: "SSE URL" }),
    }
  }

  return {
    id,
    type: "mcp",
    title,
    description,
    available: available && (IsTauri || transport.type === "sse"),
    settings: TObject(settings),
    apis: [...tools, ...resources, ...prompts],
    fileparsers: [],
    noRoundtrip,
    author,
    homepage,
  }
}

/**
 * Options for dumping an MCP plugin
 */
interface DumpMcpPluginOptions {
  /** Whether to include capabilities in the dump */
  includeCapabilities?: boolean;
}

/**
 * Dumps an MCP plugin manifest into a full plugin dump
 *
 * @param manifest - The MCP plugin manifest
 * @param options - Options for dumping the plugin
 * @returns Promise resolving to the plugin dump
 */
async function dumpMcpPlugin(
  manifest: McpPluginManifest,
  options?: DumpMcpPluginOptions
): Promise<McpPluginDump> {
  const { includeCapabilities = true } = options || {}
  const client = await getClient(manifest.id, manifest.transport)
  const capabilities = client.getServerCapabilities()

  let tools = []
  let resources = []
  let prompts = []

  if (includeCapabilities) {
    const toolsResult = capabilities.tools
      ? await client.listTools()
      : { tools: [] }
    tools = toolsResult.tools

    const resourcesResult = capabilities.resources
      ? await client.listResources()
      : { resources: [] }
    resources = resourcesResult.resources

    const promptsResult = capabilities.prompts
      ? await client.listPrompts()
      : { prompts: [] }
    prompts = promptsResult.prompts
  }

  return {
    ...manifest,
    tools,
    resources,
    prompts,
  }
}

function lobeDefaultData(manifest: LobeChatPluginManifest): PluginData {
  const { identifier, meta } = manifest

  return {
    settings: {},
    avatar: meta.avatar
      ? meta.avatar.startsWith("http")
        ? { type: "url", url: meta.avatar }
        : { type: "text", text: meta.avatar }
      : defaultTextAvatar(meta.title || identifier),
    fileparsers: {},
  }
}

function gradioDefaultData(manifest: GradioPluginManifest): PluginData {
  const settings = {}
  for (const e of manifest.endpoints) {
    const setting = {}
    for (const i of e.inputs) {
      if (
        i.paramType === "required" ||
        i.paramType === "file" ||
        i.paramType === "range"
      ) {
        continue
      }

      const type = gradioTypeMap[i.type]

      if (i.paramType === "optional") {
        setting[i.name] = type ? type(i.default) : i.default
      }

      if (i.paramType === "fixed") {
        setting[i.name] = type ? type(i.value) : i.value
      }
    }
    settings[e.name] = setting
  }
  const fileparsers = {}
  manifest.endpoints
    .filter((e) => e.type === "fileparser")
    .forEach((e) => {
      fileparsers[e.name] = {
        enabled: true,
        mimeTypes: e.inputs.find((i) => i.paramType === "file").mimeTypes,
      }
    })

  return { settings, avatar: manifest.avatar, fileparsers }
}

function mcpDefaultData(manifest: McpPluginManifest): PluginData {
  const { transport } = manifest
  const settings =
    transport.type === "stdio"
      ? {
          command: transport.command,
          cwd: transport.cwd,
          env: transport.env,
        }
      : {
          url: transport.url,
        }
  const avatar =
    (manifest.avatar as Avatar) ?? defaultTextAvatar(manifest.title[0])

  return { settings, avatar, fileparsers: {} }
}

const huggingIconsMap = {
  wikis: "sym_o_language",
  tools: "sym_o_build",
  camera: "sym_o_photo_camera",
  code: "sym_o_code",
  email: "sym_o_mail",
  cloud: "sym_o_cloud",
  terminal: "sym_o_terminal",
  game: "sym_o_sports_esports",
  chat: "sym_o_chat",
  speaker: "sym_o_volume_up",
  video: "sym_o_videocam",
}
const huggingColorsMap = {
  purple: 300,
  blue: 250,
  green: 150,
  yellow: 80,
  red: 30,
}
const gradioTypeMap = {
  str: String,
  float: Number,
  int: Number,
  bool: (val) => val === "true",
}

function huggingToGradio(
  manifest: HuggingPluginManifest
): GradioPluginManifest {
  const fileInput = manifest.inputs.find((i) => i.type === "file")

  return {
    id: `hf-${manifest._id}`,
    title: manifest.displayName,
    description: manifest.description,
    baseUrl: manifest.baseUrl,
    avatar: {
      type: "icon",
      icon: huggingIconsMap[manifest.icon] ?? "sym_o_extension",
      hue: huggingColorsMap[manifest.color] ?? 300,
    },
    endpoints: [
      fileInput
        ? {
            type: "fileparser",
            name: manifest.name,
            description: manifest.description,
            path: manifest.endpoint,
            inputs: [
              {
                name: fileInput.name,
                paramType: "file",
                mimeTypes: fileInput.mimeTypes.split(","),
              },
              ...(manifest.inputs.filter(
                (i) => i.paramType === "fixed"
              ) as GradioFixedInput[]),
            ],
            outputIdxs: [manifest.outputComponentIdx],
          }
        : {
            type: "tool",
            name: manifest.name,
            description: manifest.description,
            prompt: manifest.description,
            path: manifest.endpoint,
            inputs: manifest.inputs as GradioApiInput[],
            outputIdxs: [manifest.outputComponentIdx],
            showComponents: manifest.showOutput
              ? [manifest.outputComponent]
              : [],
          },
    ],
  }
}

const whisperPluginManifest: GradioPluginManifest = {
  id: "aiaw-whisper",
  title: t("plugins.whisper.title"),
  description: t("plugins.whisper.description"),
  baseUrl: "https://mrfakename-fast-whisper-turbo.hf.space",
  avatar: { type: "icon", icon: "sym_o_mic", hue: 100 },
  endpoints: [
    {
      type: "fileparser",
      name: "transcribe",
      description: t("plugins.whisper.transcribe.description"),
      path: "/transcribe",
      inputs: [
        {
          name: "audio",
          mimeTypes: ["audio/*"],
          paramType: "file",
        },
        {
          name: "task",
          description: t("plugins.whisper.taskType"),
          type: "str",
          paramType: "fixed",
          value: "transcribe",
        },
      ],
      outputIdxs: [0],
    },
  ],
}
const whisperPlugin = buildGradioPlugin(whisperPluginManifest, { available: true })
whisperPlugin.type = "builtin"

const videoTranscriptPlugin: Plugin = {
  id: "aiaw-video-transcript",
  type: "builtin",
  available: true,
  apis: [],
  fileparsers: [
    {
      name: "transcribe",
      description: t("plugins.videoTranscript.transcribe.description"),
      async execute({ file, range }, settings) {
        if (!AudioEncoderSupported) {
          throw new Error(t("plugins.videoTranscript.audioEncoderError"))
        }

        const rg = range ? range.split("-").map(parseSeconds) : undefined
        const audioBlob = await extractAudioBlob(file, rg as [number, number])

        return await whisperPlugin.fileparsers[0].execute(
          { file: audioBlob },
          settings
        )
      },
      rangeInput: {
        label: t("plugins.videoTranscript.rangeInput.label"),
        hint: "XX:XX-XX:XX",
      },
    },
  ],
  settings: TObject({}),
  title: t("plugins.videoTranscript.title"),
  description: t("plugins.videoTranscript.description"),
}

const fluxPluginManifest: GradioPluginManifest = {
  ...huggingToGradio({
    name: "image_generation",
    description: "Use this tool to generate images based on a prompt.",
    endpoint: "/infer",
    inputs: [
      {
        name: "prompt",
        description: "A prompt to generate an image from",
        paramType: "required",
        type: "str",
      },
      {
        name: "seed",
        paramType: "fixed",
        value: "0",
        type: "float",
      },
      {
        name: "randomize_seed",
        paramType: "fixed",
        value: "true",
        type: "bool",
      },
      {
        name: "width",
        description: "numeric value between 256 and 2048",
        paramType: "optional",
        default: 1024,
        type: "float",
      },
      {
        name: "height",
        description: "numeric value between 256 and 2048",
        paramType: "optional",
        default: 1024,
        type: "float",
      },
      {
        name: "num_inference_steps",
        paramType: "fixed",
        value: "4",
        type: "float",
      },
    ],
    outputComponent: "image",
    outputComponentIdx: 0,
    showOutput: true,
    _id: "000000000000000000000001",
    baseUrl: "https://black-forest-labs-flux-1-schnell.hf.space",
    displayName: "Image Generation",
    color: "yellow",
    icon: "camera",
  }),
  noRoundtrip: true,
  title: t("plugins.flux.title"),
  description: t("plugins.flux.description"),
}

const fluxPlugin: Plugin = buildGradioPlugin(fluxPluginManifest, { available: true })
fluxPlugin.type = "builtin"

const emotionsPrompt = `In the answer, you can use the html img tag to insert emoticons to make the answer more cute and emotional.
Set width="{{ displayWidth }}" to avoid displaying too large.

Available emoticons:

| Link | Name (text content) |
| --- | --- |
| /emotions/nachoneko/0.webp | OK |
| /emotions/nachoneko/1.webp | Happy  |
| /emotions/nachoneko/2.webp | Confused |
| /emotions/nachoneko/3.webp | Waving |
| /emotions/nachoneko/4.webp | Sleeping (zzz) |
| /emotions/nachoneko/5.webp | Eating popsicles |
| /emotions/nachoneko/6.webp | Escaping |
| /emotions/nachoneko/7.webp | Worried |
| /emotions/nachoneko/8.webp | Sleepy |
| /emotions/nachoneko/9.webp | fall down |
| /emotions/nachoneko/10.webp | peek |
| /emotions/nachoneko/11.webp | angry |
| /emotions/nachoneko/12.webp | Dislike |
| /emotions/nachoneko/13.webp | cry |
| /emotions/nachoneko/14.webp | cake |
| /emotions/nachoneko/15.webp | Doze |
| /emotions/nachoneko/16.webp | Want to eat |
| /emotions/nachoneko/17.webp | Apology |
| /emotions/nachoneko/18.webp | Dissatisfied |
| /emotions/nachoneko/19.webp | Thinking (...?) |
| /emotions/nachoneko/20.webp | Staring |
| /emotions/nachoneko/21.webp | Acting like a spoiled child |
| /emotions/nachoneko/22.webp | Shouting |
| /emotions/nachoneko/23.webp | Heartbeat |
| /emotions/nachoneko/24.webp | Being in a daze |
| /emotions/nachoneko/25.webp | Being shy |
| /emotions/nachoneko/26.webp | Hello (Hi) |
| /emotions/nachoneko/27.webp | Angry |
| /emotions/nachoneko/28.webp | Speechless (...) |
| /emotions/nachoneko/29.webp | Like |
| /emotions/nachoneko/30.webp | Expectation |
| /emotions/nachoneko/31.webp | Shy |
| /emotions/nachoneko/32.webp | Crying |
| /emotions/nachoneko/33.webp | Playing dumb |
| /emotions/nachoneko/34.webp | Exclaiming (!) |
`
const emotionsPlugin: Plugin = {
  id: "aiaw-emotions",
  type: "builtin",
  available: true,
  apis: [],
  fileparsers: [],
  settings: TObject({}),
  title: t("plugins.emotions.title"),
  description: t("plugins.emotions.description"),
  prompt: emotionsPrompt,
  promptVars: [
    {
      id: "displayWidth",
      name: "displayWidth",
      label: t("plugins.emotions.displayWidth.label"),
      type: "number",
      default: 100,
    },
  ],
}

const mermaidPlugin: Plugin = {
  id: "aiaw-mermaid",
  type: "builtin",
  available: true,
  apis: [],
  fileparsers: [],
  settings: TObject({}),
  title: t("plugins.mermaid.title"),
  description: t("plugins.mermaid.description"),
  prompt: t("plugins.mermaid.prompt"),
}

const docParsePlugin: Plugin = {
  id: "aiaw-doc-parse",
  type: "builtin",
  available: !!DocParseBaseURL,
  apis: [],
  fileparsers: [
    {
      name: "parse",
      description: t("plugins.docParse.parse.description"),
      async execute({ file, range }, settings) {
        const docs = await parseDoc(file, {
          language: settings.ocrLanguage,
          targetPages: range ? parsePageRange(range).join(",") : undefined,
        })

        return [
          {
            type: "text",
            contentText: docs
              .map((r) => r.text)
              .join("\n--------page-separator--------\n"),
          },
        ]
      },
      rangeInput: {
        label: t("plugins.docParse.rangeInput.label"),
        hint: t("plugins.docParse.rangeInput.hint"),
      },
    },
  ],
  settings: TObject({
    ocrLanguage: TString({ title: t("plugins.docParse.ocrLanguage") }),
  }),
  title: t("plugins.docParse.title"),
  description: t("plugins.docParse.description"),
}

const defaultData: PluginsData = {
  "aiaw-time": {
    settings: {},
    avatar: { type: "icon", icon: "sym_o_alarm", hue: 220 },
    fileparsers: {},
  },
  "aiaw-video-transcript": {
    settings: {},
    avatar: { type: "icon", icon: "sym_o_smart_display", hue: 160 },
    fileparsers: {
      transcribe: { enabled: true, mimeTypes: ["video/*"] },
    },
  },
  "aiaw-calculator": {
    settings: {},
    avatar: { type: "icon", icon: "sym_o_calculate", hue: 270 },
    fileparsers: {},
  },
  "aiaw-whisper": gradioDefaultData(whisperPluginManifest),
  [fluxPluginManifest.id]: {
    ...gradioDefaultData(fluxPluginManifest),
    avatar: { type: "icon", icon: "sym_o_palette", hue: 120 },
  },
  "aiaw-emotions": {
    settings: {},
    avatar: { type: "icon", icon: "sym_o_mood", hue: 80 },
    fileparsers: {},
  },
  "aiaw-mermaid": {
    settings: {},
    avatar: { type: "icon", icon: "sym_o_account_tree", hue: 15 },
    fileparsers: {},
  },
  "aiaw-doc-parse": {
    settings: { ocrLanguage: "en" },
    avatar: { type: "icon", icon: "sym_o_description", hue: 190 },
    fileparsers: {
      parse: { enabled: true, mimeTypes: ["application/*"] },
    },
  },
  "kepler-plugin": {
    settings: {},
    avatar: { type: "icon", icon: "sym_o_mood", hue: 270 },
    fileparsers: {},
  },
  "cosmos-authz": {
    settings: {},
    avatar: { type: "icon", icon: "sym_o_key", hue: 270 },
    fileparsers: {},
  },
  [webSearchPlugin.pluginId]: webSearchPlugin.defaultData,
  [artifacts.pluginId]: artifacts.defaultData,
}

export {
  timePlugin,
  calculatorPlugin,
  buildLobePlugin,
  buildGradioPlugin,
  buildMcpPlugin,
  dumpMcpPlugin,
  huggingToGradio,
  lobeDefaultData,
  gradioDefaultData,
  mcpDefaultData,
  defaultData,
  videoTranscriptPlugin,
  whisperPlugin,
  fluxPlugin,
  emotionsPlugin,
  mermaidPlugin,
  docParsePlugin,
}
