<template>
  <div
    pos-relative
  >
    <MessageInputControl
      ref="messageInputControl"
      :mime-input-types="model?.inputTypes?.user || []"
      :input-text="inputText"
      :add-input-items="addInputItems"
      :parser-plugins="assistant.plugins"
      @send="initDialog"
      @update-input-text="inputText = $event"
      @paste="onPaste"
    />
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, ref, toRef } from "vue"
import { useI18n } from "vue-i18n"

import MessageInputControl from "@/shared/components/input/control/MessageInputControl.vue"
import { useApiResultItem, useListenKey } from "@/shared/composables"
import { useUserPerfsStore } from "@/shared/store"
import type {
  ApiResultItem
} from "@/shared/types"
import {
  isPlatformEnabled,
  textBeginning
} from "@/shared/utils/functions"

import { useActiveWorkspace } from "@/features/workspaces/composables"

import { DbDialogMessageUpdate, DialogMessage } from "@/services/data/types/dialogMessage"

import { useCreateDialog, useDialogMessages, useDialogModel } from "../composables"

const { assistant, workspaceId } = useActiveWorkspace()
const { model } = useDialogModel(null, assistant)
const dialogId = ref<string | null>(null)
const { addApiResultStoredItem, lastMessage } = useDialogMessages(dialogId)

const inputText = ref("")
const inputVars = ref({})
const inputItems = ref<ApiResultItem[]>([])

const { data: perfs } = useUserPerfsStore()
const { filesToApiResultItems } = useApiResultItem()
// eslint-disable-next-line no-unused-vars
const { createDialog } = useCreateDialog(toRef(workspaceId, "value"))

const { t } = useI18n()

const messageInputControl = ref()

function initDialog () {
  const message = {
    type: "user",
    messageContents: [
      {
        type: "user-message",
        text: inputText.value,
      },
    ],
    status: "inputing",
  } as DialogMessage<DbDialogMessageUpdate>

  createDialog({
    assistantId: assistant.value.id,
    inputVars: inputVars.value
  }, message).then(async (dialog) => {
    dialogId.value = dialog.id

    await Promise.all(inputItems.value.map(item => {
      return addApiResultStoredItem(lastMessage.value.id, lastMessage.value.messageContents[0].id, item)
    }))
  })
}

async function addInputItems (items: ApiResultItem[]) {
  inputItems.value.push(...items)
}

function focusInput () {
  isPlatformEnabled(perfs.autoFocusDialogInput) &&
    messageInputControl.value?.focus()
}

defineExpose({ focus: focusInput })

function onPaste (ev: ClipboardEvent) {
  const { clipboardData } = ev

  if (clipboardData.types.includes("text/plain")) {
    if (
      !["TEXTAREA", "INPUT"].includes(document.activeElement.tagName) &&
      !["true", "plaintext-only"].includes(
        (document.activeElement as HTMLElement).contentEditable
      )
    ) {
      const text = clipboardData.getData("text/plain")
      addInputItems([
        {
          type: "text",
          name: t("dialogView.pastedText", { text: textBeginning(text, 12) }),
          contentText: text
        }
      ])
    }

    return
  }

  filesToApiResultItems(Array.from(clipboardData.files) as File[], model.value?.inputTypes?.user || [], assistant.value.plugins).then(items => {
    addInputItems(items)
  })
}
addEventListener("paste", onPaste)
onUnmounted(() => removeEventListener("paste", onPaste))

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "focusDialogInputKey"), () => focusInput())
}

</script>
