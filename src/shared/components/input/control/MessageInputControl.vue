<template>
  <div>
    <!-- Pending files preview -->
    <div
      v-if="pendingFiles.length > 0"
      class="pending-files-container p-2 bg-sur-c-low rd-md pos-relative"
    >
      <q-btn
        flat
        dense
        round
        icon="sym_o_close"
        size="sm"
        @click="clearAllFiles"
        :title="$t('dialogView.clearAllFiles')"
        class="clear-all-btn"
      />
      <div class="flex flex-wrap gap-1 pr-8">
        <!-- Image files with preview -->
        <q-card
          v-for="(file, index) in pendingFiles.filter(f => isImageFile(f) && f.previewUrl)"
          :key="`img-${index}`"
          flat
          bordered
          class="q-ma-xs"
          style="width: 120px"
        >
          <q-img
            :src="file.previewUrl"
            :alt="file.name"
            style="height: 80px"
            fit="cover"
          >
            <q-btn
              round
              dense
              size="xs"
              color="primary"
              icon="sym_o_close"
              @click="removeFile(pendingFiles.findIndex(f => f === file))"
              :title="$t('dialogView.removeFile')"
              class="absolute-top-right q-ma-xs"
              style="pointer-events: auto;"
            />
          </q-img>
          <q-card-section class="q-pa-xs">
            <div class="text-caption ellipsis">
              {{ file.name }}
            </div>
            <div class="text-caption text-grey">
              {{ formatFileSize(file.size) }}
            </div>
          </q-card-section>
        </q-card>

        <!-- Non-image files -->
        <q-chip
          v-for="(file, index) in pendingFiles.filter(f => !isImageFile(f))"
          :key="`file-${index}`"
          removable
          @remove="removeFile(pendingFiles.findIndex(f => f === file))"
          class="q-ma-xs"
        >
          <q-avatar>
            <q-icon :name="getFileIcon(file)" />
          </q-avatar>
          <span
            class="ellipsis"
            style="max-width: 150px"
          >
            {{ file.name }} ({{ formatFileSize(file.size) }})
          </span>
        </q-chip>
      </div>
    </div>

    <!-- Command suggestions overlay wrapping the input -->
    <command-suggestions-overlay
      ref="commandOverlay"
      :input-text="inputValue"
      :commands="availableCommands"
      suggestion-position="top"
      @update-input-text="inputValue = $event"
      @command-executed="onCommandExecuted"
    >
      <template #default="{ }">
        <a-input
          ref="messageInput"
          class="mb-2"
          max-h-50vh
          of-y-auto
          v-model="inputValue"
          outlined
          autogrow
          clearable
          :debounce="30"
          :placeholder="props.placeholder || $t('dialogView.chatPlaceholder')"
          @keydown.enter="handleInputEnterKeyPress"
        />
      </template>
    </command-suggestions-overlay>

    <div
      flex
      flex-wrap
      justify-end
      text-sec
      items-center
    >
      <!-- Core file upload buttons -->
      <q-btn
        v-if="props.allowImageUpload && (!props.mimeInputTypes || mimeTypeMatch('image/webp', props.mimeInputTypes))"
        flat
        icon="sym_o_image"
        :title="$t('dialogView.addImage')"
        round
        min-w="2.7em"
        min-h="2.7em"
        @click="imageInput.click()"
      >
        <input
          ref="imageInput"
          type="file"
          multiple
          accept="image/*"
          @change="onInputFiles"
          un-hidden
        >
      </q-btn>

      <q-btn
        v-if="props.allowFileUpload"
        flat
        icon="sym_o_folder"
        :title="$t('dialogView.addFile')"
        round
        min-w="2.7em"
        min-h="2.7em"
        @click="fileInput.click()"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          accept="*"
          @change="onInputFiles"
          un-hidden
        >
      </q-btn>

      <!-- Named slot for extensions (e.g., assistant-specific controls) -->
      <slot
        name="input-extension"
        :image-input="imageInput"
        :file-input="fileInput"
        :handle-image-upload="() => imageInput.click()"
      />

      <q-space />

      <!-- Named slot for token consumption display -->
      <slot name="tokens-consumption" />

      <!-- Send button -->
      <abortable-btn
        icon="sym_o_send"
        :label="filesProcessing ? $t('dialogView.uploading') : $t('dialogView.send')"
        @click="handleSend"
        @abort="$emit('abort')"
        :loading="props.loading"
        ml-4
        min-h="40px"
        :disabled="(inputEmpty && pendingFiles.length === 0) || filesProcessing"
      />
    </div>

    <!-- Slot for additional UI below controls (e.g., prompt variables) -->
    <slot name="below-controls" />
  </div>
</template>

<script setup lang="ts">
import { until } from '@vueuse/core'
import { ref, computed, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

import AbortableBtn from '@/shared/components/AbortableBtn.vue'
import CommandSuggestionsOverlay from '@/shared/components/input/control/CommandSuggestions.vue'
import { useDialogFileHandling } from '@/shared/components/input/control/dialogFileHandling'
import { useInputCommands } from '@/shared/components/input/control/useInputCommands'
import { useApiResultItem } from '@/shared/composables'
import { useUserPerfsStore } from '@/shared/store'
import { AssistantPlugins, ApiResultItem } from '@/shared/types'
import { mimeTypeMatch, textBeginning } from '@/shared/utils/functions'
import { isMarkdown } from '@/shared/utils/markdown'

interface Props {
  loading?: boolean
  inputText?: string
  placeholder?: string
  allowFileUpload?: boolean
  allowImageUpload?: boolean
  mimeInputTypes?: string[]
  parserPlugins?: AssistantPlugins
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  inputText: '',
  placeholder: undefined,
  allowFileUpload: true,
  allowImageUpload: true,
  mimeInputTypes: () => ["*"],
  parserPlugins: () => null,
})

const emit = defineEmits<{
  'send': [text: string, items: ApiResultItem[]]
  'abort': []
}>()

const imageInput = ref()
const fileInput = ref()
const messageInput = ref()
const commandOverlay = ref()
const inputValue = ref(props.inputText)
const inputEmpty = computed(() => !inputValue.value && !pendingFiles.value.length)
const { data: perfs } = useUserPerfsStore()

const { t } = useI18n()
const {
  pendingFiles,
  addFiles,
  removeFile,
  clearAllFiles,
  getFileIcon,
  formatFileSize,
  isImageFile,
} = useDialogFileHandling()

const { filesToApiResultItems } = useApiResultItem()
const {
  availableCommands,
  onCommandExecuted
} = useInputCommands(fileInput, imageInput, (assistantId) => {
  // Note: assistant change handling now managed by parent component
  console.log('Assistant change requested:', assistantId)
})

const onInputFiles = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])

  addFiles(files)
  target.value = ""
}

// Computed to check if any files are currently processing
const isProcessingFiles = ref(false)
const filesProcessing = computed(() => {
  const processing = isProcessingFiles.value || pendingFiles.value.some(file => file.isProcessing)

  return processing
})

// Computed to check if all files are done processing
const allFilesReady = computed(() =>
  pendingFiles.value.length === 0 || !filesProcessing.value
)

async function handleSend() {
  // Hide command suggestions if they're showing
  if (commandOverlay.value?.isShowingCommands()) {
    commandOverlay.value.hideCommandSuggestions()

    return
  }

  console.log("handleSend", pendingFiles.value, filesProcessing.value)

  // Wait for all files to finish processing if any are processing
  if (filesProcessing.value) {
    await until(allFilesReady).toBeTruthy()
  }

  let items: ApiResultItem[] = []

  // Convert and add files using addInputItems prop
  if (pendingFiles.value.length > 0) {
    isProcessingFiles.value = true
    try {
      items = await filesToApiResultItems(pendingFiles.value, props.mimeInputTypes, props.parserPlugins)

      clearAllFiles()
    } finally {
      isProcessingFiles.value = false
    }
  }

  // Emit the send event
  emit('send', inputValue.value, items)
  inputValue.value = ""
}

function handleInputEnterKeyPress (ev: KeyboardEvent) {
  // Check if the command overlay handled the event
  if (commandOverlay.value?.isShowingCommands()) {
    // Let the overlay handle it
    return
  }

  if ((perfs.sendKey === "ctrl+enter" && ev.ctrlKey) ||
    (perfs.sendKey === "shift+enter" && ev.shiftKey)
  ) {
    handleSend()
  } else {
    if (ev.ctrlKey) {
      document.execCommand("insertText", false, "\n")
    } else if (!ev.shiftKey) {
      handleSend()
    }
  }
}

/**
 * Handles pasting of code from editors like VSCode.
 * Automatically detects code snippets and formats them with proper markdown syntax.
 *
 * @param ev - The clipboard event containing the pasted content
 */
// function handleCodePasteFormatting (ev: ClipboardEvent) {
//   if (!perfs.codePasteOptimize) return

//   const { clipboardData } = ev
//   const i = clipboardData.types.findIndex((t) => t === "vscode-editor-data")

//   if (i !== -1) {
//     const code = clipboardData
//       .getData("text/plain")
//       .replace(/\r\n/g, "\n")
//       .replace(/\r/g, "\n")

//     if (!/\n/.test(code)) return

//     const data = clipboardData.getData("vscode-editor-data")
//     const lang = JSON.parse(data).mode ?? ""

//     if (lang === "markdown") return

//     const wrappedCode = wrapCode(code, lang)
//     document.execCommand("insertText", false, wrappedCode)
//     ev.preventDefault()
//   }
// }

function onPaste (ev: ClipboardEvent) {
  const { clipboardData } = ev
  console.log("onPaste", clipboardData.types, clipboardData.files, document.activeElement.tagName)

  if (clipboardData.types.includes("text/plain")) {
    const text = clipboardData.getData("text/plain")
    console.log("onPaste2", text, isMarkdown(text))

    if (isMarkdown(text)) {
    // Create a File object from the pasted text and add it as a file
      const file = new File([
        text
      ], `${t("dialogView.pastedText", { text: textBeginning(text, 12) })}.txt`, { type: "text/plain" })
      addFiles([file])
      ev.preventDefault()

      inputValue.value = ""
    }
  } else if (clipboardData.files.length > 0) {
    addFiles(Array.from(clipboardData.files) as File[])
    ev.preventDefault()

    inputValue.value = ""
  }
}

addEventListener("paste", onPaste)
onUnmounted(() => removeEventListener("paste", onPaste))

defineExpose({
  messageInput,
  imageInput,
  fileInput,
  focus: () => messageInput.value?.focus(),
  getPendingFiles: () => [...pendingFiles.value],
  clearPendingFiles: () => {
    clearAllFiles()
  }
})
</script>

<style scoped>
.pending-files-container {
  border: 1px dashed var(--q-color-separator);
}

.clear-all-btn {
  position: absolute;
  top: 3px;
  right: 5px;
  transform: translateY(-50%);
  z-index: 1;
}
</style>
