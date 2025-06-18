import {
  streamText,
  generateText,
  StreamTextResult,
  GenerateTextResult,
  CoreMessage,
} from "ai"
import { pickBy } from "lodash"
import { useQuasar } from "quasar"
import { ref, Ref } from "vue"
import { useI18n } from "vue-i18n"

import { useCallApi } from "@/shared/composables"
import { useStorage } from "@/shared/composables/storage/useStorage"
import { FILES_BUCKET, getFileUrl } from "@/shared/composables/storage/utils"
import { useUserPerfsStore } from "@/shared/store"
import { genId, mimeTypeMatch } from "@/shared/utils/functions"
import sessions from "@/shared/utils/sessions"
import { ExtractArtifactResult } from "@/shared/utils/template/templates"
import { ConvertArtifactOptions, Plugin, PluginApi } from "@/shared/utils/types"

import { useCreateArtifact } from "@/features/artifacts/composables/createArtifact"
import { getAssistantModelSettings } from "@/features/assistants/utils/assistantUtils"
import { useDialogsStore } from "@/features/dialogs/store/dialogs"
import { AssistantMessageContent } from "@/features/dialogs/types"
import { storedItemResultContent } from "@/features/dialogs/utils/dialog"

import {
  generateTitle,
  generateArtifactName,
  generateExtractArtifact,
} from "@/services/llm/utils"
import {
  AssistantMapped,
  DialogMessageMapped,
  MessageContentMapped,
  MessageContentResult,
} from "@/services/supabase/types"

import { useAssistantTools } from "./useAssistantTools"
import { useDialogMessages } from "./useDialogMessages"
import { useDialogModel } from "./useDialogModel"

export const useLlmDialog = (
  workspaceId: Ref<string>,
  dialogId: Ref<string>,
  assistant: Ref<AssistantMapped>
) => {
  const dialogsStore = useDialogsStore()
  const { createArtifact } = useCreateArtifact(workspaceId)

  const { data: perfs } = useUserPerfsStore()
  const { t, locale } = useI18n()
  const $q = useQuasar()
  const { dialog, updateMessage, addMessage, dialogItems, switchActiveMessage, getMessageContents } = useDialogMessages(dialogId)

  const { model, sdkModel, systemSdkModel } = useDialogModel(dialog, assistant)
  const { callApi } = useCallApi(workspaceId, dialogId)
  const storage = useStorage(FILES_BUCKET)
  const { getAssistantTools } = useAssistantTools(assistant, workspaceId, dialogId)
  const isStreaming = ref(false)

  const genTitle = async (contents: Readonly<MessageContentMapped[]>) => {
    try {
      const title = await generateTitle(
        systemSdkModel.value,
        contents,
        locale.value
      )
      await dialogsStore.updateDialog({ id: dialogId.value, name: title })

      return title
    } catch (e) {
      console.error(e)
      $q.notify({ message: t("dialogView.summarizeFailed"), color: "negative" })
    }
  }

  const genArtifactName = async (content: string, lang?: string) => {
    const name = await generateArtifactName(systemSdkModel.value, content, lang)

    return name
  }

  const extractArtifact = async (
    message: DialogMessageMapped,
    text: string,
    pattern,
    options: ConvertArtifactOptions
  ) => {
    const name = options.name || (await genArtifactName(text, options.lang))
    const id = await createArtifact({
      name,
      language: options.lang,
      versions: [
        {
          date: new Date().toISOString(),
          text,
        },
      ],
      tmp: text,
    })

    if (options.reserveOriginal) return

    const to = `> ${t("dialogView.convertedToArtifact")}: <router-link to="?openArtifact=${id}">${name}</router-link>\n`
    const index = message.message_contents.findIndex((c) =>
      ["assistant-message", "user-message"].includes(c.type)
    )

    await updateMessage(message.id, {
      message_contents: message.message_contents.map((c, i) =>
        i === index
          ? { ...c, text: c.text.replace(pattern, to) }
          : c
      ),
    })
  }

  async function autoExtractArtifact(
    message: DialogMessageMapped,
    contents: MessageContentMapped[]
  ) {
    const text = await generateExtractArtifact(systemSdkModel.value, contents)
    const object: ExtractArtifactResult = JSON.parse(text)

    if (!object.found) return

    const reg = new RegExp(`(\`{3,}.*\\n)?(${object.regex})(\\s*\`{3,})?`)
    const content = message.message_contents.find(
      (c) => c.type === "assistant-message"
    )
    const match = content.text.match(reg)

    if (!match) return

    await extractArtifact(message, match[2], reg, {
      name: object.name,
      lang: object.language,
      reserveOriginal: perfs.artifactsReserveOriginal,
    })
  }

  async function stream(
    targetId: string,
    abortController: AbortController | null = null
  ) {
    // In case if last message in status "inputing"
    if (targetId) {
      await updateMessage(targetId, {
        status: "default",
      })
    }

    const messageContent: AssistantMessageContent = {
      type: "assistant-message",
      text: "",
    }
    const contents: MessageContentMapped[] = [messageContent]

    const { id } = await addMessage(
      targetId,
      {
        type: "assistant",
        assistant_id: assistant.value.id,
        message_contents: contents,
        status: "pending",
        generating_session: sessions.id,
        model_name: model.value.name,
      },
    )

    // In case of "regenerate action"
    if (targetId) {
      await switchActiveMessage(id)
    }

    await addMessage(id, {
      type: "user",
      message_contents: [
        {
          type: "user-message",
          text: "",
          stored_items: [],
        },
      ],
      status: "inputing",
    })

    isStreaming.value = true

    const update = async () =>
      await updateMessage(id, {
        message_contents: contents,
      })

    async function callTool(plugin: Plugin, api: PluginApi, args) {
      const content: MessageContentMapped = {
        type: "assistant-tool",
        plugin_id: plugin.id,
        name: api.name,
        args,
        status: "calling",
      }

      contents.push(content)

      await update()

      const { result: apiResult, error } = await callApi(plugin, api, args)
      const storedItems = await storage.saveApiResultItems(apiResult, { dialog_id: dialogId.value })

      content.stored_items = storedItems

      if (error) {
        content.status = "failed"
        content.error = error
      } else {
        content.status = "completed"
        // Save result based on stored items MAPPED without arrayBuffer
        const contentResult = storedItems.map((i) => {
          const { type, mime_type, content_text, file_url } = i

          return pickBy(
            { type, mime_type, content_text, file_url },
            (v) => v !== undefined
          ) as MessageContentResult
        })
        content.result = contentResult
      }

      await update()

      // Return RAW API Result WITH arrayBuffer
      return { result: apiResult, error }
    }

    const { noRoundtrip, tools, systemPrompt } =
      await getAssistantTools(callTool)

    try {
      const settings = getAssistantModelSettings(
        assistant.value,
        noRoundtrip ? { maxSteps: 1 } : {}
      )
      const messages = getChainMessages()
      // console.log("--c messages", messages)

      if (systemPrompt) {
        messages.unshift({
          role: assistant.value.prompt_role,
          content: systemPrompt,
        })
      }

      const params = {
        model: sdkModel.value,
        messages,
        tools,
        ...settings,
        abortSignal: abortController?.signal,
      }

      let result: StreamTextResult<any, any> | GenerateTextResult<any, any>

      if (assistant.value.stream) {
        result = streamText(params)
        await updateMessage(id, {
          status: "streaming",
        })
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            messageContent.text += part.textDelta
            await update()
          } else if (part.type === "reasoning") {
            messageContent.reasoning =
              (messageContent.reasoning ?? "") + part.textDelta
            await update()
          } else if (part.type === "error") {
            throw part.error
          }
        }
      } else {
        result = await generateText(params)
        messageContent.text = result.text
        messageContent.reasoning = result.reasoning
      }

      const usage = await result.usage
      const warnings = (await result.warnings).map((w) =>
        w.type === "unsupported-setting" || w.type === "unsupported-tool"
          ? w.details
          : w.message
      )
      await updateMessage(id, {
        message_contents: contents,
        status: "default",
        generating_session: null,
        warnings,
        usage,
      })
    } catch (e) {
      console.error(e)
      // if (e.data?.error?.type === 'budget_exceeded') {
      //   $q.notify({
      //     message: t('dialogView.errors.insufficientQuota'),
      //     color: 'err-c',
      //     textColor: 'on-err-c',
      //     actions: [{ label: t('dialogView.recharge'), color: 'on-sur', handler() { router.push('/account') } }]
      //   })
      // }
      await updateMessage(id, {
        message_contents: contents,
        error: e.message || e.toString(),
        status: "failed",
        generating_session: null,
      })
    }
    const message = dialogItems.value.at(-2).message // last non-inputing = NOT EMPTY message

    perfs.artifactsAutoExtract &&
      autoExtractArtifact(message, getMessageContents(-3, -1))
    perfs.autoGenTitle &&
    dialogItems.value.length === 4 &&
      genTitle(getMessageContents())
    isStreaming.value = false
  }

  function getChainMessages () {
    const val: CoreMessage[] = []
    const messages = dialogItems.value
      // .slice(1) // TODO: <--- ??? REMOVE THIS
      .slice(-assistant.value.context_num || 0)
      .filter((item) => item.message.status !== "inputing")
      .map((item) => item.message.message_contents)
      .flat()

    console.log("-----getChainMessages", dialogItems.value, messages)

    messages.forEach((content) => {
      if (content.type === "user-message") {
        val.push({
          role: "user",
          content: [
            { type: "text", text: content.text },
            ...content.stored_items.map((i) => {
              if (i.content_text != null) {
                if (i.type === "file") {
                  return {
                    type: "text" as const,
                    text: `<file_content filename="${i.name}">\n${i.content_text}\n</file_content>`,
                  }
                } else if (i.type === "quote") {
                  return {
                    type: "text" as const,
                    text: `<quote name="${i.name}">${i.content_text}</quote>`,
                  }
                } else {
                  return { type: "text" as const, text: i.content_text }
                }
              } else {
                if (!mimeTypeMatch(i.mime_type, model.value.inputTypes.user)) {
                  return null
                } else if (i.mime_type.startsWith("image/")) {
                  return {
                    type: "image" as const,
                    image: getFileUrl(i.file_url),
                    mimeType: i.mime_type,
                  }
                } else {
                  return {
                    type: "file" as const,
                    mimeType: i.mime_type,
                    data: getFileUrl(i.file_url),
                  }
                }
              }
            }),
          ],
        })
      } else if (content.type === "assistant-message") {
        val.push({
          role: "assistant",
          content: [{ type: "text", text: content.text }],
        })
      } else if (content.type === "assistant-tool") {
        if (content.status !== "completed") return

        const { name, args, result, plugin_id } = content
        const id = genId()
        val.push({
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolName: `${plugin_id}-${name}`,
              toolCallId: id,
              args,
            },
          ],
        })
        const resultContent = result.map((i) => storedItemResultContent(i))
        val.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolName: `${plugin_id}-${name}`,
              toolCallId: id,
              result: resultContent,
              // experimental_content: resultContent
            },
          ],
        })
      }
    })

    return val
  }

  return {
    genTitle,
    extractArtifact,
    stream,
    isStreaming,
  }
}
