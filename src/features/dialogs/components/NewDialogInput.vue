<template>
  <div
    pos-relative
  >
    <MessageInputControl
      ref="messageInputControl"
      :supported-input-types="model?.inputTypes?.user || []"
      :input-empty="inputEmpty"
      :input-text="inputText"
      :add-input-items="addInputItems"
      :process-other-files="processOtherFiles"
      @send="initDialog"
      @update-input-text="inputText = $event"
      @keydown-enter="handleInputEnterKeyPress"
      @paste="onPaste"
    />
  </div>
</template>

<script setup lang="ts">
import { useQuasar } from "quasar"
import { computed, onUnmounted, ref, toRef } from "vue"
import { useI18n } from "vue-i18n"

import MessageInputControl from "@/shared/components/input/control/MessageInputControl.vue"
import { useListenKey } from "@/shared/composables"
import { useUserPerfsStore } from "@/shared/store"
import type {
  ApiResultItem
} from "@/shared/types"
import { parseFilesToApiResultItems } from "@/shared/utils/files"
import {
  isPlatformEnabled,
  textBeginning
} from "@/shared/utils/functions"

import { useActiveWorkspace } from "@/features/workspaces/composables"

import { DbDialogMessageUpdate, DialogMessage } from "@/services/data/types/dialogMessage"

import { useCreateDialog, useDialogMessages, useDialogModel } from "../composables"

import ParseFilesDialog from "./ParseFilesDialog.vue"

const { assistant, workspaceId } = useActiveWorkspace()
const { model } = useDialogModel(null, assistant)
const dialogId = ref<string | null>(null)
const { addApiResultStoredItem, lastMessage } = useDialogMessages(dialogId)

const inputText = ref("")
const inputVars = ref({})
const inputItems = ref<ApiResultItem[]>([])

const inputEmpty = computed(() => !inputText.value && !inputItems.value.length)

const { data: perfs } = useUserPerfsStore()
// eslint-disable-next-line no-unused-vars
const { createDialog } = useCreateDialog(workspaceId.value)

const $q = useQuasar()
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

  parseFiles(Array.from(clipboardData.files) as File[])
}
addEventListener("paste", onPaste)
onUnmounted(() => removeEventListener("paste", onPaste))

async function parseFiles (files: File[]) {
  if (!files.length) return

  const { parsedItems, otherFiles } = await parseFilesToApiResultItems(files, model.value?.inputTypes?.user || [], (maxFileSize, file) => {
    $q.notify({
      message: t("dialogView.fileTooLarge", {
        maxSize: maxFileSize
      }),
      color: "negative"
    })
  })

  addInputItems(parsedItems)

  if (otherFiles.length) {
    $q.dialog({
      component: ParseFilesDialog,
      componentProps: { files: otherFiles, plugins: assistant.value.plugins }
    }).onOk((files: ApiResultItem[]) => {
      addInputItems(files)
    })
  }
}

function handleInputEnterKeyPress (ev: KeyboardEvent) {
  if ((perfs.sendKey === "ctrl+enter" && ev.ctrlKey) ||
    (perfs.sendKey === "shift+enter" && ev.shiftKey)
  ) {
    initDialog()
  } else {
    if (ev.ctrlKey) {
      document.execCommand("insertText", false, "\n")
    } else if (!ev.shiftKey) {
      initDialog()
    }
  }
}

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "focusDialogInputKey"), () => focusInput())
}

async function processOtherFiles (files: File[]) {
  if (!files.length) return

  return new Promise<void>((resolve) => {
    $q.dialog({
      component: ParseFilesDialog,
      componentProps: { files, plugins: assistant.value.plugins }
    }).onOk((processedFiles: ApiResultItem[]) => {
      addInputItems(processedFiles)
      resolve()
    }).onCancel(() => {
      resolve()
    })
  })
}
</script>
