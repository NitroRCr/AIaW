import { useQuasar } from "quasar"
import { Ref } from "vue"
import { useI18n } from "vue-i18n"

import { useUserPerfsStore } from "@/shared/store"
import { ConvertArtifactOptions } from "@/shared/types"

import { useCreateArtifact } from "@/features/artifacts/composables/useCreateArtifact"
import { useDialogsStore } from "@/features/dialogs/store"

import {
  generateTitle,
  generateArtifactName,
  generateExtractArtifact,
} from "@/services/ai/llm/utils"
import { Assistant } from "@/services/data/types/assistant"
import { DialogMessageNested } from "@/services/data/types/dialogMessage"
import { MessageContentNested } from "@/services/data/types/messageContents"

import { ExtractArtifactResult } from "../utils"

import { useDialogMessages } from "./useDialogMessages"
import { useDialogModel } from "./useDialogModel"
import { useLlmStream } from "./useLlmStream"

export const useLlmDialog = (
  workspaceId: Ref<string>,
  dialogId: Ref<string>,
  assistant: Ref<Assistant>
) => {
  const dialogsStore = useDialogsStore()
  const { createArtifact } = useCreateArtifact(workspaceId)

  const { data: perfs } = useUserPerfsStore()
  const { t, locale } = useI18n()
  const $q = useQuasar()
  const { dialog, updateMessage, dialogItems, getMessageContents } = useDialogMessages(dialogId)
  const { streamResponse, isStreaming } = useLlmStream(workspaceId, dialogId, assistant)
  const { systemSdkModel } = useDialogModel(dialog, assistant)

  const genTitle = async (contents: Readonly<MessageContentNested[]>) => {
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
    message: DialogMessageNested,
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
    const index = message.messageContents.findIndex((c) =>
      ["assistant-message", "user-message"].includes(c.type)
    )

    await updateMessage(message.id, {
      messageContents: message.messageContents.map((c, i) =>
        i === index
          ? { ...c, text: c.text.replace(pattern, to) }
          : c
      ),
    })
  }

  async function autoExtractArtifact(
    message: DialogMessageNested,
    contents: MessageContentNested[]
  ) {
    const text = await generateExtractArtifact(systemSdkModel.value, contents)
    const object: ExtractArtifactResult = JSON.parse(text)

    if (!object.found) return

    const reg = new RegExp(`(\`{3,}.*\\n)?(${object.regex})(\\s*\`{3,})?`)
    const content = message.messageContents.find(
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

  const streamLlmResponse = async (targetId: string, abortController: AbortController | null = null) => {
    const isSuccess = await streamResponse(targetId, abortController)

    if (!isSuccess) return

    const message = dialogItems.value.at(-2).message // last non-inputing = NOT EMPTY message

    if (perfs.artifactsAutoExtract) {
      await autoExtractArtifact(message, getMessageContents(-3, -1))
    }

    // Auto generate title if enabled and it's a new dialog
    if (perfs.autoGenTitle && dialogItems.value.length === 3) {
      await genTitle(getMessageContents())
    }
  }

  return {
    genTitle,
    extractArtifact,
    streamLlmResponse,
    isStreaming,
  }
}
