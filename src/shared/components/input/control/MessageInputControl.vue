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
          color="grey-3"
          text-color="dark"
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
      :input-text="props.inputText"
      :commands="availableCommands"
      suggestion-position="top"
      @update-input-text="$emit('update-input-text', $event)"
      @command-executed="onCommandExecuted"
    >
      <template #default="{ onInput }">
        <a-input
          ref="messageInput"
          class="mb-2"
          max-h-50vh
          of-y-auto
          :model-value="props.inputText"
          @update:model-value="onInput"
          outlined
          autogrow
          clearable
          :debounce="30"
          :placeholder="props.placeholder || $t('dialogView.chatPlaceholder')"
          @keydown.enter="handleEnterKey"
          @paste="$emit('paste', $event)"
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
        v-if="props.allowImageUpload && mimeTypeMatch('image/webp', props.supportedInputTypes)"
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
import { ref, computed } from 'vue'

import AbortableBtn from '@/shared/components/AbortableBtn.vue'
import CommandSuggestionsOverlay from '@/shared/components/input/control/CommandSuggestions.vue'
import { useDialogFileHandling } from '@/shared/components/input/control/dialogFileHandling'
import { useInputCommands } from '@/shared/components/input/control/useInputCommands'
import { parseFilesToApiResultItems } from '@/shared/utils/files'
import { mimeTypeMatch } from '@/shared/utils/functions'

interface Props {
  loading?: boolean
  inputText?: string
  addInputItems?: (items: any[]) => Promise<void>
  processOtherFiles?: (files: File[]) => Promise<void>
  placeholder?: string
  allowFileUpload?: boolean
  allowImageUpload?: boolean
  supportedInputTypes?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  inputText: '',
  addInputItems: undefined,
  processOtherFiles: undefined,
  placeholder: undefined,
  allowFileUpload: true,
  allowImageUpload: true,
  supportedInputTypes: () => [],
})

const emit = defineEmits<{
  'send': []
  'abort': []
  'update-input-text': [text: string]
  'keydown-enter': [event: KeyboardEvent]
  'paste': [event: ClipboardEvent]
  'process-files': [files: any[]]
}>()

const imageInput = ref()
const fileInput = ref()
const messageInput = ref()
const commandOverlay = ref()
const inputEmpty = computed(() => !props.inputText && !pendingFiles.value.length)

const {
  pendingFiles,
  onInputFiles,
  removeFile,
  clearAllFiles,
  getFileIcon,
  formatFileSize,
  isImageFile,
} = useDialogFileHandling()

const {
  availableCommands,
  onCommandExecuted
} = useInputCommands(fileInput, imageInput, (assistantId) => {
  // Note: assistant change handling now managed by parent component
  console.log('Assistant change requested:', assistantId)
})

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

function handleEnterKey(event: KeyboardEvent) {
  // Check if the command overlay handled the event
  if (commandOverlay.value?.isShowingCommands()) {
    // Let the overlay handle it
    return
  }

  emit('keydown-enter', event)
}

async function handleSend() {
  // Hide command suggestions if they're showing
  if (commandOverlay.value?.isShowingCommands()) {
    commandOverlay.value.hideCommandSuggestions()

    return
  }

  // Wait for all files to finish processing if any are processing
  if (filesProcessing.value) {
    await until(allFilesReady).toBeTruthy()
  }

  // Convert and add files using addInputItems prop
  if (pendingFiles.value.length > 0 && props.addInputItems) {
    isProcessingFiles.value = true
    try {
      const { parsedItems, otherFiles } = await parseFilesToApiResultItems(
        pendingFiles.value,
        props.supportedInputTypes,
        (maxFileSize, file) => {
          // Handle file too large - could emit a notification or similar
          console.warn(`File ${file.name} is too large (max: ${maxFileSize}MB)`)
        }
      )

      // Add directly parsable files
      if (parsedItems.length > 0) {
        await props.addInputItems(parsedItems)
      }

      // Process files that need plugin processing
      if (otherFiles.length > 0) {
        if (props.processOtherFiles) {
          await props.processOtherFiles(otherFiles)
        } else {
          emit('process-files', otherFiles)
        }
      }

      clearAllFiles()
    } finally {
      isProcessingFiles.value = false
    }
  }

  // Emit the send event
  emit('send')
}

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
