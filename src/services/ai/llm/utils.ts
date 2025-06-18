import { generateText, LanguageModelV1 } from "ai"

import { PluginPrompt } from "@/shared/utils/types"

import { engine } from "@/features/dialogs/utils/templateEngine"
import {
  GenDialogTitle,
  NameArtifactPrompt,
  ExtractArtifactPrompt,
  PluginsPrompt,
} from "@/features/dialogs/utils/templates"

import { MessageContentMapped } from "@/services/data/supabase/types"

const generateTitle = async (
  model: LanguageModelV1,
  contents: Readonly<MessageContentMapped[]>,
  lang: string
) => {
  const { text } = await generateText({
    model,
    prompt: await engine.parseAndRender(GenDialogTitle, {
      contents,
      lang,
    }),
  })

  return text
}

const generateArtifactName = async (
  model: LanguageModelV1,
  content: string,
  lang?: string
) => {
  const { text } = await generateText({
    model,
    prompt: engine.parseAndRenderSync(NameArtifactPrompt, { content, lang }),
  })

  return text
}

const generateExtractArtifact = async (
  model: LanguageModelV1,
  content: MessageContentMapped[],
  lang?: string
) => {
  const { text } = await generateText({
    model,
    prompt: engine.parseAndRenderSync(ExtractArtifactPrompt, { content, lang }),
  })

  return text
}

function getSystemPrompt (
  pluginPrompts: PluginPrompt[],
  promptTemplate: string,
  rolePrompt: string,
  vars: Record<string, any>
) {
  const prompt = engine.parseAndRenderSync(promptTemplate, {
    ...vars,
    _pluginsPrompt: pluginPrompts.length
      ? engine.parseAndRenderSync(PluginsPrompt, { plugins: pluginPrompts })
      : "",
    _rolePrompt: rolePrompt,
  })

  return prompt.trim() ? prompt : undefined
}

export {
  generateTitle,
  generateArtifactName,
  generateExtractArtifact,
  getSystemPrompt,
}
