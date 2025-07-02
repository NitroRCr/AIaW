import { defaultModelSettings } from "@/features/assistants/consts"
import { AssistantDefaultPrompt } from "@/features/dialogs/utils/dialogTemplateDefinitions"

import { Assistant, DbAssistantInsert } from "@/services/data/types/assistant"

import { defaultAvatar } from "./utils/functions"
import { getModelData, getProviderData } from "./utils/values"

// eslint-disable-next-line no-unused-vars
const defaultProviderData = {
  name: "litellm",
  model: "gpt-4o",
}

const getDefaultProviderData = () => ({
  provider: getProviderData(defaultProviderData.name),
  model: getModelData(defaultProviderData.model),
})

const getDefaultAssistant = () => {
  const { provider, model } = getDefaultProviderData()

  return {
    name: "Cyber Assistant",
    avatar: defaultAvatar("AI"),
    prompt: "",
    promptTemplate: AssistantDefaultPrompt,
    promptVars: [],
    provider,
    model,
    modelSettings: { ...defaultModelSettings },
    plugins: {},
    promptRole: "system",
    stream: true,
    workspaceId: null, // Global Assistant
    author: "master"
  } as Assistant<DbAssistantInsert>
}

const defaultWorkspaceId = "6c5326f7-e564-48f2-9e19-318f412ec174"

export { defaultWorkspaceId, getDefaultAssistant, getDefaultProviderData }
