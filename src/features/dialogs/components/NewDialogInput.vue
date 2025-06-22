<template>
  <div
    pos-relative
  >
    <MessageInputControl
      ref="messageInputControl"
      :model="model"
      :assistant="assistant"
      :sdk-model="sdkModel"
      :model-options="modelOptions"
      @update:model-options="modelOptions = $event"
      :active-plugins="activePlugins"
      :input-empty="inputEmpty"
      :input-text="inputText"
      :input-vars="inputVars"
      :add-input-items="addInputItems"
      @send="initDialog"
      @update-input-vars="(name, value) => inputVars[name] = value"
      @update-input-text="inputText = $event"
      @keydown-enter="handleInputEnterKeyPress"
      @paste="onPaste"
      :init-dialog="true"
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
  ApiResultItem,
  Plugin
} from "@/shared/types"
import { parseFilesToApiResultItems } from "@/shared/utils/files"
import {
  isPlatformEnabled,
  textBeginning
} from "@/shared/utils/functions"

import { usePluginsStore } from "@/features/plugins/store"
import { useActiveWorkspace } from "@/features/workspaces/composables"

import { DbDialogMessageUpdate, DialogMessage } from "@/services/data/types/dialogMessage"
import { StoredItem } from "@/services/data/types/storedItem"

import { useCreateDialog, useDialogMessages, useDialogModel } from "../composables"

import ParseFilesDialog from "./ParseFilesDialog.vue"

const { assistant, workspaceId } = useActiveWorkspace()
const { model, sdkModel, modelOptions } = useDialogModel(null, assistant)
const dialogId = ref<string | null>(null)
const { addApiResultStoredItem, lastMessage } = useDialogMessages(dialogId)

const inputText = ref("")
const inputVars = ref({})
const inputItems = ref<StoredItem[]>([])

const inputEmpty = computed(() => !inputText.value && !inputItems.value.length)

const pluginsStore = usePluginsStore()
const { data: perfs } = useUserPerfsStore()
// eslint-disable-next-line no-unused-vars
const { createDialog } = useCreateDialog(workspaceId.value)

const $q = useQuasar()
const { t } = useI18n()

const messageInputControl = ref()

function initDialog (items: ApiResultItem[] = []) {
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

    await Promise.all(items.map(item => addApiResultStoredItem(lastMessage.value.id,
      lastMessage.value.messageContents[0].id, item)))
    console.log("initDialog")
  })
}

async function addInputItems (items: ApiResultItem[]) {
  initDialog(items)
  // const newItems = items.map((item) => StoredItem.from(item))
  // for (const item of newItems) {
  //   item.id = nanoid()
  // }
  // inputItems.value.push(...newItems)
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
      initDialog([
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

  const { parsedItems, otherFiles } = await parseFilesToApiResultItems(files, model.value.inputTypes.user, (maxFileSize, file) => {
    $q.notify({
      message: t("dialogView.fileTooLarge", {
        maxSize: maxFileSize
      }),
      color: "negative"
    })
  })

  // addInputItems(parsedItems)
  initDialog(parsedItems)
  console.log(parsedItems, otherFiles)

  if (otherFiles.length) {
    $q.dialog({
      component: ParseFilesDialog,
      componentProps: { files: otherFiles, plugins: assistant.value.plugins }
    }).onOk((files: ApiResultItem[]) => {
      // addInputItems(files)
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

const activePlugins = computed<Plugin[]>(() =>
  assistant.value
    ? pluginsStore.plugins.filter(
      (p) => p.available && assistant.value.plugins[p.id]?.enabled
    )
    : []
)

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "focusDialogInputKey"), () => focusInput())
}
</script>
