import { LanguageModel, wrapLanguageModel } from "ai"

import { useUserPerfsStore } from "@/shared/store"
import { fetch } from "@/shared/utils/platformApi"
import { Model, Provider } from "@/shared/utils/types"

import { useProvidersStore } from "@/features/providers/store"
import { AuthropicCors, FormattingReenabled } from "@/features/providers/utils/middlewares"

const FormattingModels = ["o1", "o3-mini", "o3-mini-2025-01-31"]

function wrapMiddlewares (model: LanguageModel) {
  const middlewares = []
  FormattingModels.includes(model.modelId) &&
    middlewares.push(FormattingReenabled)
  model.provider.startsWith("anthropic.") && middlewares.push(AuthropicCors)

  return middlewares.length
    ? wrapLanguageModel({ model, middleware: middlewares })
    : model
}
export function useGetModel () {
  const { data: perfs } = useUserPerfsStore()

  const providersStore = useProvidersStore()

  function getProvider (provider?: Provider) {
    return provider || perfs.provider
  }

  function getModel (model?: Model) {
    return model || perfs.model
  }

  function getSdkProvider (provider?: Provider) {
    provider = getProvider(provider)

    if (!provider) return null

    return providersStore.providerTypes
      .find((p) => p.name === provider.type)
      ?.constructor({
        ...provider.settings,
        fetch,
      })
  }

  function getSdkModel (
    provider?: Provider,
    model?: Model,
    options?: Record<string, any>
  ) {
    const sdkProvider = getSdkProvider(provider)

    if (!sdkProvider) return null

    model = getModel(model)

    if (!model) return null

    const m = sdkProvider(model.name, options) // TODO: || getSdkProvider(defaultProvider.value)(model.name, options)

    return m && wrapMiddlewares(m)
  }

  return { getProvider, getModel, getSdkProvider, getSdkModel }
}
