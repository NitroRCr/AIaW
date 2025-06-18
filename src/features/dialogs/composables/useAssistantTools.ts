import { jsonSchema, tool, Tool } from "ai"
import { storeToRefs } from "pinia"
import { useQuasar } from "quasar"
import { Ref, computed, inject } from "vue"
import { useI18n } from "vue-i18n"

import { useCallApi } from "@/shared/composables"
import { useUserDataStore, useUserPerfsStore } from "@/shared/store"
import { isPlatformEnabled, mimeTypeMatch } from "@/shared/utils/functions"
import { engine } from "@/shared/utils/template/templateEngine"
import {
  PluginPrompt,
  Plugin,
  PluginApi,
  ApiResultItem,
  ApiCallError,
} from "@/shared/utils/types"

import artifactsPlugin from "@/features/plugins/buildin/artifactsPlugin"
import { usePluginsStore } from "@/features/plugins/store"
import { useGetModel } from "@/features/providers/composables/getModel"

import { getSystemPrompt } from "@/services/llm/utils"
import {
  ArtifactMapped,
  AssistantMapped,
  StoredItem,
} from "@/services/supabase/types"

import { useDialogMessages } from "./useDialogMessages"

type CallTool = (
  plugin: Plugin,
  api: PluginApi,
  args: Record<string, any>
) => Promise<{ result?: ApiResultItem[]; error?: string }>

export const useAssistantTools = (
  assistant: Ref<AssistantMapped>,
  workspaceId: Ref<string>,
  dialogId: Ref<string>
) => {
  const pluginsStore = usePluginsStore()
  const { data: perfs } = storeToRefs(useUserPerfsStore())
  const { data: userData } = storeToRefs(useUserDataStore())
  const { dialog, workspace } = useDialogMessages(dialogId)

  const { getModel } = useGetModel()

  const model = computed(() =>
    getModel(dialog.value?.model_override || assistant.value?.model)
  )

  const { callApi } = useCallApi(workspaceId, dialogId)
  const activePlugins = computed<Plugin[]>(() =>
    assistant.value
      ? pluginsStore.plugins.filter(
        (p) => p.available && assistant.value.plugins[p.id]?.enabled
      )
      : []
  )
  const artifacts = inject<Ref<ArtifactMapped[]>>("artifacts")

  const openedArtifacts = computed(() =>
    artifacts.value.filter((a) => userData.value.openedArtifacts.includes(a.id))
  )
  const $q = useQuasar()
  const { t } = useI18n()
  const { plugins } = assistant.value

  function getCommonVars () {
    return {
      _currentTime: new Date().toString(),
      _userLanguage: navigator.language,
      _workspaceId: workspace.value.id,
      _workspaceName: workspace.value.name,
      _assistantId: assistant.value.id,
      _assistantName: assistant.value.name,
      _dialogId: dialog.value.id,
      _modelId: model.value.name,
      _isDarkMode: $q.dark.isActive,
      _platform: $q.platform,
    }
  }

  function apiResultToToolResultContent (items: ApiResultItem[]) {
    const val = []
    for (const item of items) {
      if (!item) continue // TODO: in case if tool failed ignore it

      const { contentText, mimeType, contentBuffer } = item

      if (item.type === "text") {
        val.push({ type: "text", contentText })
      } else if (mimeTypeMatch(mimeType, model.value.inputTypes.tool)) {
        val.push({
          type: mimeType?.startsWith("image/") ? "image" : "file",
          mimeType,
          data: contentBuffer || null,
        })
      }
    }

    return val
  }

  function toToolResultContent (items: (ApiResultItem | StoredItem)[]) {
    const val = []
    for (const item of items) {
      console.log("-----toToolResultContent item", item)

      if (!item) continue // TODO: in case if tool failed ignore it

      if (item.type === "text") {
        // Handle both ApiResultItem (contentText) and StoredItem (content_text)
        // TODO: keep contentText  use content_text only for stored Item
        const text =
          "content_text" in item ? item.content_text : item.contentText
        val.push({ type: "text", text })
      } else {
        // Handle mime type field differences: ApiResultItem uses mimeType, StoredItem uses mime_type
        const mimeType = "mime_type" in item ? item.mime_type : item.mimeType

        if (mimeTypeMatch(mimeType, model.value.inputTypes.tool)) {
          val.push({
            type: mimeType?.startsWith("image/") ? "image" : "file",
            mimeType,
            data: "contentBuffer" in item ? item.contentBuffer : null,
          })
        }
      }
    }

    return val
  }

  const createTool = (
    description: string,
    plugin: Plugin,
    api: PluginApi,
    callTool: CallTool
  ) => {
    return tool({
      description,
      parameters: jsonSchema(api.parameters),
      async execute (args) {
        const { result, error } = await callTool(plugin, api, args)

        if (error) throw new ApiCallError(error)

        return result
      },
      experimental_toToolResultContent: apiResultToToolResultContent,
    })
  }

  const getAssistantTools = async (callTool: CallTool) => {
    const enabledPlugins: PluginPrompt[] = []
    const commonVars = getCommonVars()
    const tools = {} as Record<string, Tool>
    let noRoundtrip = true
    await Promise.all(
      activePlugins.value.map(async (p) => {
        noRoundtrip &&= p.noRoundtrip
        const plugin = plugins[p.id]

        const pluginVars = {
          ...commonVars,
          ...plugin.vars,
        }
        plugin.tools.forEach((api) => {
          if (!api.enabled) return

          const a = p.apis.find((a) => a.name === api.name)
          const { name, prompt } = a
          tools[`${p.id}-${name}`] = createTool(
            engine.parseAndRenderSync(prompt, pluginVars),
            p,
            a,
            callTool
          )
        })

        const pluginInfos = {}
        await Promise.all(
          plugin.infos.map(async (api) => {
            if (!api.enabled) return

            const a = p.apis.find((a) => a.name === api.name)

            if (a.infoType !== "prompt-var") return

            try {
              pluginInfos[a.name] = await callApi(p, a, api.args)
            } catch (e) {
              $q.notify({
                message: t("dialogView.callPluginInfoFailed", {
                  message: e.message,
                }),
                color: "negative",
              })
            }
          })
        )

        try {
          enabledPlugins.push({
            id: p.id,
            prompt:
              p.prompt &&
              engine.parseAndRenderSync(p.prompt, {
                ...pluginVars,
                infos: pluginInfos,
              }),
            actions: [],
          })
        } catch (e) {
          $q.notify({
            message: t("dialogView.pluginPromptParseFailed", {
              title: p.title,
            }),
            color: "negative",
          })
        }
      })
    )

    if (
      isPlatformEnabled(perfs.value.artifactsEnabled) &&
      openedArtifacts.value.length > 0
    ) {
      const { plugin, getPrompt, api } = artifactsPlugin
      enabledPlugins.push({
        id: plugin.id,
        prompt: getPrompt(openedArtifacts.value),
        actions: [],
      })

      tools[`${plugin.id}-${api.name}`] = createTool(
        api.prompt,
        plugin,
        api,
        callTool
      )
    }

    const systemPrompt = getSystemPrompt(
      enabledPlugins.filter((p) => p.prompt),
      assistant.value.prompt_template,
      assistant.value.prompt,
      {
        ...commonVars,
        ...workspace.value.vars,
        ...dialog.value.input_vars,
      }
    )

    return { noRoundtrip, tools, systemPrompt }
  }

  return {
    getAssistantTools,
    toToolResultContent,
    apiResultToToolResultContent,
  }
}
