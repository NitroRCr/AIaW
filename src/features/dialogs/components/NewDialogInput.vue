<template>
  <div
    pos-relative
  >
    <MessageInputControl
      ref="messageInputControl"
      :mime-input-types="model?.inputTypes?.user || []"
      :input-text="inputText"
      :parser-plugins="assistant.plugins"
      :loading="isLoading"
      @send="initDialog"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from "vue"

import MessageInputControl from "@/shared/components/input/control/MessageInputControl.vue"
import { useListenKey } from "@/shared/composables"
import { useUserPerfsStore } from "@/shared/store"
import type {
  ApiResultItem
} from "@/shared/types"
import {
  isPlatformEnabled
} from "@/shared/utils/functions"

import { useActiveWorkspace } from "@/features/workspaces/composables"

import { DbDialogMessageUpdate, DialogMessage } from "@/services/data/types/dialogMessage"

import { useCreateDialog, useDialogModel } from "../composables"

const { assistant, workspaceId } = useActiveWorkspace()
const { model } = useDialogModel(null, assistant)
const dialogId = ref<string | null>(null)
const isLoading = ref(false)
const inputText = ref("")
const inputVars = ref({})

const { data: perfs } = useUserPerfsStore()
// eslint-disable-next-line no-unused-vars
const { createDialog } = useCreateDialog(toRef(workspaceId, "value"))

const messageInputControl = ref()

function initDialog (text: string, items: ApiResultItem[]) {
  isLoading.value = true
  const message = {
    type: "user",
    messageContents: [
      {
        type: "user-message",
        text,
      },
    ],
    status: "inputing",
  } as DialogMessage<DbDialogMessageUpdate>

  createDialog({
    assistantId: assistant.value.id,
    inputVars: inputVars.value
  }, message, items).then(async (dialog) => {
    dialogId.value = dialog.id
  }).finally(() => {
    isLoading.value = false
  })
}

function focusInput () {
  isPlatformEnabled(perfs.autoFocusDialogInput) &&
    messageInputControl.value?.focus()
}

defineExpose({ focus: focusInput })

if (isPlatformEnabled(perfs.enableShortcutKey)) {
  useListenKey(toRef(perfs, "focusDialogInputKey"), () => focusInput())
}

</script>
