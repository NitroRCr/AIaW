import { generateText, streamText } from "ai"
import { pickBy } from "lodash"
import { computed, ref, Ref } from "vue"

import { useCallApi } from "@/shared/composables/callApi"
import { useStorage } from "@/shared/composables/storage/useStorage"
import { Plugin, PluginApi } from "@/shared/types"
import sessions from "@/shared/utils/sessions"

import { getAssistantModelSettings } from "@/features/assistants/utils/assistantUtils"

import { Assistant } from "@/services/data/types/assistant"
import { DialogMessageNestedUpdate } from "@/services/data/types/dialogMessage"
import { MessageContentNestedUpdate } from "@/services/data/types/messageContents"
import { StoredItemResult } from "@/services/data/types/storedItem"

import { AssistantMessageContent } from "../types"

import { useAssistantTools } from "./useAssistantTools"
import { useDialogMessages } from "./useDialogMessages"
import { useDialogModel } from "./useDialogModel"
import { getChainMessages } from "./utils/chainMessages"

export const useLlmStream = (workspaceId: Ref<string>,
  dialogId: Ref<string>,
  assistant: Ref<Assistant>) => {
  const { getAssistantTools } = useAssistantTools(assistant, workspaceId, dialogId)
  const { dialog, dialogItems, dialogMessages, upsertSingleEntity, addMessage, switchActiveMessage, updateMessage } = useDialogMessages(dialogId)
  const { model, sdkModel } = useDialogModel(dialog, assistant)
  const { callApi } = useCallApi(workspaceId, dialogId)
  const storage = useStorage()
  const isStreaming = ref(false)

  const currentMessageId = ref<string | null>(null)
  const currentMessageContentId = ref<string | null>(null)
  const currentMessage = computed(() => dialogMessages.value.find((m) => m.id === currentMessageId.value))
  const currentMessageContent = computed(() => currentMessage.value?.messageContents.find((m) => m.id === currentMessageContentId.value))

  async function setupMessageForStreaming(targetId: string) {
    // In case the last message is in "inputing" status
    if (targetId) {
      await updateMessage(targetId, {
        status: "default",
      })
    }

    // Create initial message content
    const assistantMessageContent: AssistantMessageContent = {
      type: "assistant-message",
      text: "",
    }
    // Add assistant message
    const { id, messageContents } = await addMessage(
      targetId,
      {
        type: "assistant",
        assistantId: assistant.value.id,
        messageContents: [assistantMessageContent],
        status: "pending",
        generatingSession: sessions.id,
        modelName: model.value.name,
      },
    )

    currentMessageId.value = id
    currentMessageContentId.value = messageContents[0].id

    // In case of "regenerate action"
    if (targetId) {
      await switchActiveMessage(id)
    }

    // Add empty user message
    await addMessage(id, {
      type: "user",
      messageContents: [
        {
          type: "user-message",
          text: "",
        },
      ],
      status: "inputing",
    })
  }

  async function handleToolCall(
    plugin: Plugin,
    api: PluginApi,
    args: any,
  ) {
    // Create tool content
    const toolMessageContent = await addOrUpdateCurrentMessageContent({
      type: "assistant-tool",
      pluginId: plugin.id,
      name: api.name,
      args,
      status: "calling",
    })
    // Call API
    const { result: apiResult, error } = await callApi(plugin, api, args)
    const storedItems = await storage.saveApiResultItems(
      apiResult,
      { dialogId: dialogId.value }
    )

    toolMessageContent.storedItems = storedItems

    // Handle result or error
    if (error) {
      toolMessageContent.status = "failed"
      toolMessageContent.error = error
    } else {
      toolMessageContent.status = "completed"
      // Save result based on stored items without arrayBuffer
      const contentResult = storedItems.map((i) => {
        const { type, mimeType, contentText, fileUrl } = i

        return pickBy(
          { type, mimeType, contentText, fileUrl },
          (v) => v !== undefined
        ) as StoredItemResult
      })
      toolMessageContent.result = contentResult
    }

    await addOrUpdateCurrentMessageContent(toolMessageContent)

    return { result: apiResult, error }
  }

  async function streamResponse(
    targetId: string,
    abortController: AbortController | null = null
  ) {
    isStreaming.value = true
    let isSuccess: boolean = false
    try {
      // Step 1: Setup message
      await setupMessageForStreaming(targetId)

      // Step 2: Setup tools
      const { noRoundtrip, tools, systemPrompt } =
        await getAssistantTools(handleToolCall)

      // Step 3: Prepare model parameters
      const settings = getAssistantModelSettings(
        assistant.value,
        noRoundtrip ? { maxSteps: 1 } : {}
      )

      const messages = getChainMessages(dialogItems.value, model.value.inputTypes.user, assistant.value.contextNum)

      if (systemPrompt) {
        messages.unshift({
          role: assistant.value.promptRole,
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

      // Step 4: Process response (streaming or not)
      const result = await (assistant.value.stream ? processStreamingResponse : processNonStreamingResponse)(params)

      // Step 5: Finalize response
      await finalizeResponse(result)
      isSuccess = true
    } catch (error) {
      // Handle errors
      await handleStreamingError(error)
      isSuccess = false
    } finally {
      isStreaming.value = false
      currentMessageId.value = null
      currentMessageContentId.value = null
    }

    return isSuccess
  }

  async function updateCurrentMessage(update: DialogMessageNestedUpdate) {
    await upsertSingleEntity({
      dialogId: dialogId.value,
      messageId: currentMessageId.value,
      message: { ...currentMessage.value, ...update }
    })
  }

  async function addOrUpdateCurrentMessageContent(messageContent: MessageContentNestedUpdate, cacheOnly = false) {
    // const cacheOnly = !currentMessage.value.status || ["streaming", "inputing", "pending"].includes(currentMessage.value.status)
    const { messageContent: result } = await upsertSingleEntity({
      dialogId: dialogId.value,
      messageId: currentMessageId.value,
      messageContent,
      cacheOnly
    })

    return result
  }

  async function updateCurrentMessageContent(update: MessageContentNestedUpdate, cacheOnly = false) {
    return addOrUpdateCurrentMessageContent({ ...currentMessageContent.value, ...update }, cacheOnly)
  }

  async function processStreamingResponse(params: any) {
    // Start streaming
    const result = streamText(params)
    await updateCurrentMessage({ status: "streaming" })
    // Process stream chunks
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        await updateCurrentMessageContent({
          text: currentMessageContent.value.text + part.textDelta,
        }, true)
      } else if (part.type === "reasoning") {
        await updateCurrentMessageContent({
          reasoning: currentMessageContent.value.reasoning + part.textDelta,
        }, true)
      } else if (part.type === "error") {
        throw part.error
      }
    }
    await updateCurrentMessageContent(currentMessageContent.value)

    await finalizeResponse(result)

    return result
  }

  async function processNonStreamingResponse(params: any) {
    const result = await generateText(params)
    await updateCurrentMessageContent({
      text: result.text,
      reasoning: result.reasoning,
    })
    await finalizeResponse(result)

    return result
  }

  async function finalizeResponse(result: any) {
    const usage = await result.usage
    const warnings = (await result.warnings).map((w) =>
      w.type === "unsupported-setting" || w.type === "unsupported-tool"
        ? w.details
        : w.message
    )

    await updateCurrentMessage({ status: "default", generatingSession: null, warnings, usage })
  }

  async function handleStreamingError(error: any) {
    console.error(error)
    await updateCurrentMessage({ error: error.message || error.toString(), status: "failed", generatingSession: null })
  }

  return {
    streamResponse,
    isStreaming
  }
}
